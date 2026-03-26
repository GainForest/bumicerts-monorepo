// src/mutations/organization.info/create.ts
import { Effect as Effect4 } from "effect";

// src/services/AtprotoAgent.ts
import { Context } from "effect";
var AtprotoAgent = class extends Context.Tag("AtprotoAgent")() {
};

// src/mutations/organization.info/create.ts
import {
  $parse,
  main as orgInfoSchema
} from "@gainforest/generated/app/gainforest/organization/info.defs";

// src/mutations/organization.info/utils/errors.ts
import { Data } from "effect";
var OrganizationInfoValidationError = class extends Data.TaggedError(
  "OrganizationInfoValidationError"
) {
};
var OrganizationInfoAlreadyExistsError = class extends Data.TaggedError(
  "OrganizationInfoAlreadyExistsError"
) {
};
var OrganizationInfoNotFoundError = class extends Data.TaggedError(
  "OrganizationInfoNotFoundError"
) {
};
var OrganizationInfoPdsError = class extends Data.TaggedError(
  "OrganizationInfoPdsError"
) {
};

// src/blob/introspect.ts
function extractBlobConstraints(validator, path = [], _ancestors = /* @__PURE__ */ new Set()) {
  const results = [];
  const v = validator;
  if (_ancestors.has(v)) return results;
  _ancestors.add(v);
  switch (v.type) {
    // -----------------------------------------------------------------------
    // Leaf: blob field — emit constraints
    // -----------------------------------------------------------------------
    case "blob":
    case "typedBlob": {
      results.push({
        path,
        accept: v.options?.accept,
        maxSize: v.options?.maxSize
      });
      break;
    }
    // -----------------------------------------------------------------------
    // Object: walk every key in the shape map
    // -----------------------------------------------------------------------
    case "object": {
      if (v.shape && typeof v.shape === "object") {
        for (const [key, child] of Object.entries(v.shape)) {
          results.push(...extractBlobConstraints(child, [...path, key], new Set(_ancestors)));
        }
      }
      break;
    }
    // TypedObject wraps an inner ObjectSchema in `.schema` (not `.shape` directly)
    case "typedObject": {
      if (v.schema) {
        results.push(...extractBlobConstraints(v.schema, path, new Set(_ancestors)));
      }
      break;
    }
    // -----------------------------------------------------------------------
    // Wrappers: unwrap and recurse at the same path
    // -----------------------------------------------------------------------
    case "optional":
    case "nullable":
    case "withDefault": {
      if (v.validator) {
        results.push(...extractBlobConstraints(v.validator, path, new Set(_ancestors)));
      }
      break;
    }
    // -----------------------------------------------------------------------
    // Ref: follow the lazy getter (may point to a typedObject / object)
    // -----------------------------------------------------------------------
    case "ref":
    case "typedRef": {
      try {
        const inner = v.validator;
        if (inner) {
          results.push(...extractBlobConstraints(inner, path, new Set(_ancestors)));
        }
      } catch {
      }
      break;
    }
    // -----------------------------------------------------------------------
    // Array: recurse into elements, adding a "[]" path segment
    // -----------------------------------------------------------------------
    case "array": {
      if (v.elementSchema) {
        results.push(
          ...extractBlobConstraints(v.elementSchema, [...path, "[]"], new Set(_ancestors))
        );
      }
      break;
    }
    // -----------------------------------------------------------------------
    // Record: unwrap the inner object schema
    // -----------------------------------------------------------------------
    case "record": {
      if (v.schema) {
        results.push(...extractBlobConstraints(v.schema, path, new Set(_ancestors)));
      }
      break;
    }
    // -----------------------------------------------------------------------
    // Multi-branch: walk all members
    // typedUnion stores branches under `.validators`; other union types use
    // `.schemas` or `.members` depending on the lex-schema version.
    // -----------------------------------------------------------------------
    case "typedUnion":
    case "intersection":
    case "union":
    case "discriminatedUnion": {
      const branches = v.validators ?? v.schemas ?? v.members ?? [];
      for (const branch of branches) {
        results.push(...extractBlobConstraints(branch, path, new Set(_ancestors)));
      }
      break;
    }
    // Unknown / primitive types — nothing to walk
    default:
      break;
  }
  return results;
}
function mimeMatches(mime, pattern) {
  if (pattern === "*/*") return true;
  if (pattern.endsWith("/*")) return mime.startsWith(pattern.slice(0, -1));
  return mime === pattern;
}

// src/blob/helpers.ts
import { Effect } from "effect";
import { CID } from "@atproto/lex-data";

// src/blob/types.ts
import { isBlobRef as lexIsBlobRef } from "@atproto/lex";
var isSerializableFile = (v) => typeof v === "object" && v !== null && v["$file"] === true;
var isBlobRef = (v) => lexIsBlobRef(v);
function isAnyBlobRef(v) {
  if (v == null || typeof v !== "object") return false;
  if (lexIsBlobRef(v)) return true;
  const o = v;
  return typeof o["mimeType"] === "string" && typeof o["size"] === "number" && o["ref"] != null && typeof o["ref"] === "object";
}
function normalizeBlobRef(v) {
  if (lexIsBlobRef(v)) return v;
  const o = v;
  if (typeof o["mimeType"] === "string" && typeof o["size"] === "number" && o["ref"] != null) {
    return {
      $type: "blob",
      ref: o["ref"],
      // CID instance — isBlobRef accepts this
      mimeType: o["mimeType"],
      size: o["size"]
    };
  }
  return v;
}
var isFileOrBlob = (v) => typeof File !== "undefined" && v instanceof File || typeof Blob !== "undefined" && v instanceof Blob;
async function toSerializableFile(file) {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return {
    $file: true,
    name: file instanceof File ? file.name : "blob",
    type: file.type || "application/octet-stream",
    size: file.size,
    data: btoa(binary)
  };
}
function fromSerializableFile(sf) {
  const binary = atob(sf.data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// src/blob/errors.ts
import { Data as Data2 } from "effect";
var FileConstraintError = class extends Data2.TaggedError("FileConstraintError") {
};
var BlobUploadError = class extends Data2.TaggedError("BlobUploadError") {
};

// src/blob/helpers.ts
function getFileMeta(v) {
  if (isSerializableFile(v)) return { size: v.size, type: v.type };
  if (isFileOrBlob(v))
    return { size: v.size, type: v.type || "application/octet-stream" };
  if (isAnyBlobRef(v)) return null;
  return null;
}
function getValueAtPath(obj, path) {
  let cur = obj;
  for (const key of path) {
    if (cur == null || typeof cur !== "object") return void 0;
    if (key === "[]") return cur;
    cur = cur[key];
  }
  return cur;
}
var validateFileConstraints = (input, constraints) => Effect.try({
  try: () => {
    for (const c of constraints) {
      const raw = getValueAtPath(input, c.path);
      if (raw === void 0 || raw === null) continue;
      const values = Array.isArray(raw) ? raw : [raw];
      for (const value of values) {
        const meta = getFileMeta(value);
        if (!meta) continue;
        if (c.maxSize !== void 0 && meta.size > c.maxSize) {
          throw new FileConstraintError({
            path: c.path,
            reason: `File size ${meta.size} B exceeds maximum ${c.maxSize} B`
          });
        }
        if (c.accept && c.accept.length > 0) {
          const ok2 = c.accept.some((pattern) => mimeMatches(meta.type, pattern));
          if (!ok2) {
            throw new FileConstraintError({
              path: c.path,
              reason: `MIME type "${meta.type}" is not accepted; allowed: ${c.accept.join(", ")}`
            });
          }
        }
      }
    }
  },
  catch: (e) => e instanceof FileConstraintError ? e : new FileConstraintError({ path: [], reason: String(e) })
});
var DUMMY_CID = CID.parse("bafkreihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku");
function makeDummyBlobRef(mime, size) {
  return {
    $type: "blob",
    ref: DUMMY_CID,
    mimeType: mime,
    size
  };
}
function stubBlobRefs(input) {
  if (input == null) return input;
  if (isSerializableFile(input)) {
    const sf = input;
    return makeDummyBlobRef(sf.type, sf.size);
  }
  if (isFileOrBlob(input)) {
    const f = input;
    return makeDummyBlobRef(f.type || "application/octet-stream", f.size);
  }
  if (isBlobRef(input)) return input;
  if (isAnyBlobRef(input)) {
    return normalizeBlobRef(input);
  }
  if (Array.isArray(input)) return input.map(stubBlobRefs);
  if (typeof input === "object") {
    const out = {};
    for (const [k, v] of Object.entries(input)) {
      out[k] = stubBlobRefs(v);
    }
    return out;
  }
  return input;
}
function uploadSingle(file) {
  return Effect.gen(function* () {
    const agent = yield* AtprotoAgent;
    let data;
    let mimeType;
    if (isSerializableFile(file)) {
      data = fromSerializableFile(file);
      mimeType = file.type;
    } else {
      const buf = yield* Effect.tryPromise({
        try: () => file.arrayBuffer(),
        catch: (e) => new BlobUploadError({ message: "Failed to read file data into ArrayBuffer", cause: e })
      });
      data = new Uint8Array(buf);
      mimeType = file.type || "application/octet-stream";
    }
    const res = yield* Effect.tryPromise({
      try: () => agent.uploadBlob(data, { encoding: mimeType }),
      catch: (e) => new BlobUploadError({ message: "PDS blob upload failed", cause: e })
    });
    const raw = res.data.blob;
    const plainBlobRef = {
      $type: "blob",
      ref: raw.ref,
      // This is a real CID instance — isBlobRef accepts it
      mimeType: raw.mimeType,
      // Use PDS-normalized MIME type to match stored blob
      size: raw.size
    };
    return plainBlobRef;
  });
}
function resolveFileInputs(input) {
  if (input == null) return Effect.succeed(input);
  if (isAnyBlobRef(input)) {
    return Effect.succeed(normalizeBlobRef(input));
  }
  if (isSerializableFile(input) || isFileOrBlob(input)) {
    return uploadSingle(input);
  }
  if (Array.isArray(input)) {
    return Effect.all(input.map(resolveFileInputs), {
      concurrency: "unbounded"
    });
  }
  if (typeof input === "object") {
    const entries = Object.entries(input);
    return Effect.all(
      entries.map(([k, v]) => resolveFileInputs(v).pipe(Effect.map((r) => [k, r]))),
      { concurrency: "unbounded" }
    ).pipe(Effect.map((pairs) => Object.fromEntries(pairs)));
  }
  return Effect.succeed(input);
}

// src/utils/shared/patch.ts
function applyPatch(existing, data, unset, requiredFields) {
  const result = { ...existing };
  if (unset) {
    for (const key of unset) {
      if (!requiredFields.has(key)) {
        delete result[key];
      }
    }
  }
  for (const [key, value] of Object.entries(data)) {
    if (value !== void 0) {
      result[key] = value;
    }
  }
  return result;
}

// src/utils/shared/pds.ts
import { Effect as Effect2 } from "effect";
var fetchRecord = (collection, rkey, makePdsError40) => Effect2.gen(function* () {
  const agent = yield* AtprotoAgent;
  const repo = agent.assertDid;
  return yield* Effect2.tryPromise({
    try: () => agent.com.atproto.repo.getRecord({ repo, collection, rkey }).then((res) => res.data.value).catch(() => null),
    catch: (cause) => makePdsError40(`Failed to fetch ${collection} record at rkey "${rkey}"`, cause)
  });
});
var createRecord = (collection, record, rkey, makePdsError40) => Effect2.gen(function* () {
  const agent = yield* AtprotoAgent;
  const repo = agent.assertDid;
  const response = yield* Effect2.tryPromise({
    try: () => agent.com.atproto.repo.createRecord({
      repo,
      collection,
      ...rkey !== void 0 ? { rkey } : {},
      record
    }),
    catch: (cause) => makePdsError40(`PDS rejected createRecord for ${collection}`, cause)
  });
  return { uri: response.data.uri, cid: response.data.cid };
});
var putRecord = (collection, rkey, record, makePdsError40) => Effect2.gen(function* () {
  const agent = yield* AtprotoAgent;
  const repo = agent.assertDid;
  const response = yield* Effect2.tryPromise({
    try: () => agent.com.atproto.repo.putRecord({ repo, collection, rkey, record }),
    catch: (cause) => makePdsError40(`PDS rejected putRecord for ${collection} at rkey "${rkey}"`, cause)
  });
  return { uri: response.data.uri, cid: response.data.cid };
});
var deleteRecord = (collection, rkey, makePdsError40) => Effect2.gen(function* () {
  const agent = yield* AtprotoAgent;
  const repo = agent.assertDid;
  yield* Effect2.tryPromise({
    try: () => agent.com.atproto.repo.deleteRecord({ repo, collection, rkey }),
    catch: (cause) => makePdsError40(`PDS rejected deleteRecord for ${collection} at rkey "${rkey}"`, cause)
  });
});

// src/utils/shared/validate.ts
import { Effect as Effect3 } from "effect";
var stubValidate = (candidate, parse, makeValidationError32) => Effect3.try({
  try: () => {
    parse(stubBlobRefs(candidate));
  },
  catch: (cause) => makeValidationError32(String(cause), cause)
});
var finalValidate = (resolved, parse, makeValidationError32) => Effect3.try({
  try: () => parse(resolved),
  catch: (cause) => makeValidationError32(String(cause), cause)
});

// src/mutations/organization.info/create.ts
var COLLECTION = "app.gainforest.organization.info";
var RKEY = "self";
var BLOB_CONSTRAINTS = extractBlobConstraints(orgInfoSchema);
var makePdsError = (message, cause) => new OrganizationInfoPdsError({ message, cause });
var makeValidationError = (message, cause) => new OrganizationInfoValidationError({ message, cause });
var createOrganizationInfo = (input) => Effect4.gen(function* () {
  yield* validateFileConstraints(input, BLOB_CONSTRAINTS);
  const createdAt = (/* @__PURE__ */ new Date()).toISOString();
  const candidate = { $type: COLLECTION, ...input, createdAt };
  yield* stubValidate(candidate, $parse, makeValidationError);
  const existing = yield* fetchRecord(COLLECTION, RKEY, makePdsError);
  if (existing !== null) {
    return yield* Effect4.fail(
      new OrganizationInfoAlreadyExistsError({ uri: `at://${(yield* AtprotoAgent).assertDid}/${COLLECTION}/${RKEY}` })
    );
  }
  const resolved = yield* resolveFileInputs(candidate);
  const record = yield* finalValidate(resolved, $parse, makeValidationError);
  const { uri, cid } = yield* createRecord(COLLECTION, record, RKEY, makePdsError);
  return { uri, cid, record };
});

// src/mutations/organization.info/update.ts
import { Effect as Effect5 } from "effect";
import {
  $parse as $parse2,
  main as orgInfoSchema2
} from "@gainforest/generated/app/gainforest/organization/info.defs";

// src/mutations/organization.info/utils/merge.ts
var REQUIRED_FIELDS = /* @__PURE__ */ new Set([
  "displayName",
  "shortDescription",
  "longDescription",
  "objectives",
  "country",
  "visibility"
]);
var applyPatch2 = (existing, data, unset) => applyPatch(existing, data, unset, REQUIRED_FIELDS);

// src/mutations/organization.info/update.ts
var COLLECTION2 = "app.gainforest.organization.info";
var RKEY2 = "self";
var BLOB_CONSTRAINTS2 = extractBlobConstraints(orgInfoSchema2);
var makePdsError2 = (message, cause) => new OrganizationInfoPdsError({ message, cause });
var makeValidationError2 = (message, cause) => new OrganizationInfoValidationError({ message, cause });
var updateOrganizationInfo = (input) => Effect5.gen(function* () {
  yield* validateFileConstraints(input.data, BLOB_CONSTRAINTS2);
  const existing = yield* fetchRecord(
    COLLECTION2,
    RKEY2,
    makePdsError2
  );
  if (existing === null) {
    return yield* Effect5.fail(
      new OrganizationInfoNotFoundError({ repo: (yield* AtprotoAgent).assertDid })
    );
  }
  const patched = applyPatch2(existing, input.data, input.unset);
  patched.$type = COLLECTION2;
  patched.createdAt = existing.createdAt;
  yield* stubValidate(patched, $parse2, makeValidationError2);
  const resolved = yield* resolveFileInputs(patched);
  const record = yield* finalValidate(resolved, $parse2, makeValidationError2);
  const { uri, cid } = yield* putRecord(COLLECTION2, RKEY2, record, makePdsError2);
  return { uri, cid, record };
});

// src/mutations/organization.info/upsert.ts
import { Effect as Effect6 } from "effect";
import {
  $parse as $parse3,
  main as orgInfoSchema3
} from "@gainforest/generated/app/gainforest/organization/info.defs";
var COLLECTION3 = "app.gainforest.organization.info";
var RKEY3 = "self";
var BLOB_CONSTRAINTS3 = extractBlobConstraints(orgInfoSchema3);
var makePdsError3 = (message, cause) => new OrganizationInfoPdsError({ message, cause });
var makeValidationError3 = (message, cause) => new OrganizationInfoValidationError({ message, cause });
var upsertOrganizationInfo = (input) => Effect6.gen(function* () {
  yield* validateFileConstraints(input, BLOB_CONSTRAINTS3);
  const existing = yield* fetchRecord(
    COLLECTION3,
    RKEY3,
    makePdsError3
  );
  const createdAt = existing !== null ? existing.createdAt : (/* @__PURE__ */ new Date()).toISOString();
  const candidate = { $type: COLLECTION3, ...input, createdAt };
  yield* stubValidate(candidate, $parse3, makeValidationError3);
  const resolved = yield* resolveFileInputs(candidate);
  const record = yield* finalValidate(resolved, $parse3, makeValidationError3);
  const { uri, cid } = yield* putRecord(COLLECTION3, RKEY3, record, makePdsError3);
  return {
    uri,
    cid,
    record,
    created: existing === null
  };
});

// src/mutations/organization.defaultSite/set.ts
import { Effect as Effect7 } from "effect";
import {
  $parse as $parse4
} from "@gainforest/generated/app/gainforest/organization/defaultSite.defs";

// src/mutations/organization.defaultSite/utils/errors.ts
import { Data as Data3 } from "effect";
var DefaultSiteValidationError = class extends Data3.TaggedError(
  "DefaultSiteValidationError"
) {
};
var DefaultSiteLocationNotFoundError = class extends Data3.TaggedError(
  "DefaultSiteLocationNotFoundError"
) {
};
var DefaultSitePdsError = class extends Data3.TaggedError(
  "DefaultSitePdsError"
) {
};

// src/mutations/organization.defaultSite/set.ts
var COLLECTION4 = "app.gainforest.organization.defaultSite";
var LOCATION_COLLECTION = "app.certified.location";
var RKEY4 = "self";
var makePdsError4 = (message, cause) => new DefaultSitePdsError({ message, cause });
var makeValidationError4 = (message, cause) => new DefaultSiteValidationError({ message, cause });
var setDefaultSite = (input) => Effect7.gen(function* () {
  const { locationUri } = input;
  const agent = yield* AtprotoAgent;
  const myDid = agent.assertDid;
  if (!locationUri.startsWith("at://") || !locationUri.includes(LOCATION_COLLECTION)) {
    return yield* Effect7.fail(
      new DefaultSiteValidationError({
        message: `locationUri must be an AT-URI pointing at a "${LOCATION_COLLECTION}" record. Got: "${locationUri}"`
      })
    );
  }
  const uriWithoutScheme = locationUri.slice("at://".length);
  const parts = uriWithoutScheme.split("/");
  const uriDid = parts[0] ?? "";
  const locationRkey = parts[2] ?? "";
  if (!uriDid || !locationRkey) {
    return yield* Effect7.fail(
      new DefaultSiteValidationError({
        message: `locationUri has unexpected format. Expected "at://{did}/${LOCATION_COLLECTION}/{rkey}". Got: "${locationUri}"`
      })
    );
  }
  if (uriDid !== myDid) {
    return yield* Effect7.fail(
      new DefaultSiteValidationError({
        message: `The certified.location must be in the user's own PDS. URI DID "${uriDid}" does not match authenticated DID "${myDid}"`
      })
    );
  }
  const location = yield* fetchRecord(
    LOCATION_COLLECTION,
    locationRkey,
    makePdsError4
  );
  if (location === null) {
    return yield* Effect7.fail(
      new DefaultSiteLocationNotFoundError({ locationUri })
    );
  }
  const createdAt = (/* @__PURE__ */ new Date()).toISOString();
  const candidate = {
    $type: COLLECTION4,
    site: locationUri,
    createdAt
  };
  const record = yield* Effect7.try({
    try: () => $parse4(candidate),
    catch: (cause) => makeValidationError4(`organization.defaultSite record failed lexicon validation: ${String(cause)}`, cause)
  });
  const { uri, cid } = yield* putRecord(COLLECTION4, RKEY4, record, makePdsError4);
  return {
    uri,
    cid,
    record
  };
});

// src/mutations/organization.layer/create.ts
import { Effect as Effect8 } from "effect";
import { $parse as $parse5 } from "@gainforest/generated/app/gainforest/organization/layer.defs";

// src/mutations/organization.layer/utils/errors.ts
import { Data as Data4 } from "effect";
var LayerValidationError = class extends Data4.TaggedError(
  "LayerValidationError"
) {
};
var LayerNotFoundError = class extends Data4.TaggedError(
  "LayerNotFoundError"
) {
};
var LayerPdsError = class extends Data4.TaggedError(
  "LayerPdsError"
) {
};

// src/mutations/organization.layer/create.ts
var COLLECTION5 = "app.gainforest.organization.layer";
var makePdsError5 = (message, cause) => new LayerPdsError({ message, cause });
var makeValidationError5 = (message, cause) => new LayerValidationError({ message, cause });
var createLayer = (input) => Effect8.gen(function* () {
  const { name, type, uri, description, rkey } = input;
  const createdAt = (/* @__PURE__ */ new Date()).toISOString();
  const candidate = {
    $type: COLLECTION5,
    name,
    type,
    uri,
    description,
    createdAt
  };
  const record = yield* Effect8.try({
    try: () => $parse5(candidate),
    catch: (cause) => makeValidationError5(`organization.layer record failed lexicon validation: ${String(cause)}`, cause)
  });
  const { uri: resultUri, cid } = yield* createRecord(COLLECTION5, record, rkey, makePdsError5);
  const assignedRkey = resultUri.split("/").pop() ?? rkey ?? "unknown";
  return {
    uri: resultUri,
    cid,
    rkey: assignedRkey,
    record
  };
});

// src/mutations/organization.layer/update.ts
import { Effect as Effect9 } from "effect";
import { $parse as $parse6 } from "@gainforest/generated/app/gainforest/organization/layer.defs";

// src/mutations/organization.layer/utils/merge.ts
var REQUIRED_FIELDS2 = /* @__PURE__ */ new Set(["name", "type", "uri", "createdAt"]);
var applyLayerPatch = (existing, data, unset) => applyPatch(existing, data, unset, REQUIRED_FIELDS2);

// src/mutations/organization.layer/update.ts
var COLLECTION6 = "app.gainforest.organization.layer";
var makePdsError6 = (message, cause) => new LayerPdsError({ message, cause });
var makeValidationError6 = (message, cause) => new LayerValidationError({ message, cause });
var updateLayer = (input) => Effect9.gen(function* () {
  const { rkey, data, unset } = input;
  const existing = yield* fetchRecord(
    COLLECTION6,
    rkey,
    makePdsError6
  );
  if (existing === null) {
    return yield* Effect9.fail(new LayerNotFoundError({ rkey }));
  }
  const patched = applyLayerPatch(existing, data, unset);
  patched["$type"] = COLLECTION6;
  patched["createdAt"] = existing.createdAt;
  const record = yield* Effect9.try({
    try: () => $parse6(patched),
    catch: (cause) => makeValidationError6(`organization.layer record failed lexicon validation: ${String(cause)}`, cause)
  });
  const { uri, cid } = yield* putRecord(COLLECTION6, rkey, record, makePdsError6);
  return {
    uri,
    cid,
    rkey,
    record
  };
});

// src/mutations/organization.layer/upsert.ts
import { Effect as Effect10 } from "effect";
import { $parse as $parse7 } from "@gainforest/generated/app/gainforest/organization/layer.defs";
var COLLECTION7 = "app.gainforest.organization.layer";
var makePdsError7 = (message, cause) => new LayerPdsError({ message, cause });
var makeValidationError7 = (message, cause) => new LayerValidationError({ message, cause });
var upsertLayer = (input) => Effect10.gen(function* () {
  const { name, type, uri, description, rkey } = input;
  let existing = null;
  if (rkey) {
    existing = yield* fetchRecord(
      COLLECTION7,
      rkey,
      makePdsError7
    );
  }
  const createdAt = existing !== null ? existing.createdAt : (/* @__PURE__ */ new Date()).toISOString();
  const candidate = {
    $type: COLLECTION7,
    name,
    type,
    uri,
    description,
    createdAt
  };
  const record = yield* Effect10.try({
    try: () => $parse7(candidate),
    catch: (cause) => makeValidationError7(`organization.layer record failed lexicon validation: ${String(cause)}`, cause)
  });
  const isCreate = !rkey || existing === null;
  let resultUri;
  let cid;
  let assignedRkey;
  if (isCreate) {
    const result = yield* createRecord(COLLECTION7, record, rkey, makePdsError7);
    resultUri = result.uri;
    cid = result.cid;
    assignedRkey = resultUri.split("/").pop() ?? rkey ?? "unknown";
  } else {
    const result = yield* putRecord(COLLECTION7, rkey, record, makePdsError7);
    resultUri = result.uri;
    cid = result.cid;
    assignedRkey = rkey;
  }
  return {
    uri: resultUri,
    cid,
    rkey: assignedRkey,
    record,
    created: isCreate
  };
});

// src/mutations/organization.layer/delete.ts
import { Effect as Effect11 } from "effect";
var COLLECTION8 = "app.gainforest.organization.layer";
var makePdsError8 = (message, cause) => new LayerPdsError({ message, cause });
var deleteLayer = (input) => Effect11.gen(function* () {
  const { rkey } = input;
  const agent = yield* AtprotoAgent;
  const repo = agent.assertDid;
  const uri = `at://${repo}/${COLLECTION8}/${rkey}`;
  yield* deleteRecord(COLLECTION8, rkey, makePdsError8);
  return { uri, rkey };
});

// src/mutations/organization.recordings.audio/create.ts
import { Effect as Effect12 } from "effect";
import { $parse as $parse8 } from "@gainforest/generated/app/gainforest/organization/recordings/audio.defs";

// src/mutations/organization.recordings.audio/utils/errors.ts
import { Data as Data5 } from "effect";
var AudioRecordingValidationError = class extends Data5.TaggedError(
  "AudioRecordingValidationError"
) {
};
var AudioRecordingNotFoundError = class extends Data5.TaggedError(
  "AudioRecordingNotFoundError"
) {
};
var AudioRecordingPdsError = class extends Data5.TaggedError(
  "AudioRecordingPdsError"
) {
};

// src/mutations/organization.recordings.audio/create.ts
var COLLECTION9 = "app.gainforest.organization.recordings.audio";
var MAX_AUDIO_BYTES = 100 * 1024 * 1024;
var ACCEPTED_AUDIO_MIMES = /* @__PURE__ */ new Set([
  "audio/wav",
  "audio/x-wav",
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/x-m4a",
  "audio/aac",
  "audio/flac",
  "audio/x-flac",
  "audio/ogg",
  "audio/opus",
  "audio/webm",
  "audio/aiff",
  "audio/x-aiff"
]);
var makePdsError9 = (message, cause) => new AudioRecordingPdsError({ message, cause });
var makeValidationError8 = (message, cause) => new AudioRecordingValidationError({ message, cause });
var createAudioRecording = (input) => Effect12.gen(function* () {
  const { audioFile, name, description, metadata, rkey } = input;
  if (audioFile.size > MAX_AUDIO_BYTES) {
    return yield* Effect12.fail(
      new FileConstraintError({
        path: ["audioFile"],
        reason: `Audio file size ${audioFile.size} B exceeds maximum ${MAX_AUDIO_BYTES} B (100 MB)`
      })
    );
  }
  if (!ACCEPTED_AUDIO_MIMES.has(audioFile.type)) {
    return yield* Effect12.fail(
      new FileConstraintError({
        path: ["audioFile"],
        reason: `MIME type "${audioFile.type}" is not accepted for audio recordings; allowed: ${[...ACCEPTED_AUDIO_MIMES].join(", ")}`
      })
    );
  }
  const agent = yield* AtprotoAgent;
  const fileBytes = fromSerializableFile(audioFile);
  const uploadResult = yield* Effect12.tryPromise({
    try: () => agent.uploadBlob(fileBytes, { encoding: audioFile.type }),
    catch: (cause) => new BlobUploadError({ message: "Failed to upload audio blob", cause })
  });
  const raw = uploadResult.data.blob;
  const blobRef = { $type: "blob", ref: raw.ref, mimeType: raw.mimeType, size: raw.size };
  const createdAt = (/* @__PURE__ */ new Date()).toISOString();
  const candidate = {
    $type: COLLECTION9,
    name,
    description: description ? {
      $type: "app.gainforest.common.defs#richtext",
      text: description.text,
      facets: description.facets
    } : void 0,
    blob: {
      $type: "app.gainforest.common.defs#audio",
      file: blobRef
    },
    metadata: {
      $type: "app.gainforest.organization.recordings.audio#metadata",
      codec: metadata.codec,
      channels: metadata.channels,
      duration: metadata.duration,
      sampleRate: metadata.sampleRate,
      recordedAt: metadata.recordedAt,
      coordinates: metadata.coordinates
    },
    createdAt
  };
  const record = yield* Effect12.try({
    try: () => $parse8(candidate),
    catch: (cause) => makeValidationError8(`organization.recordings.audio record failed lexicon validation: ${String(cause)}`, cause)
  });
  const { uri, cid } = yield* createRecord(COLLECTION9, record, rkey, makePdsError9);
  const assignedRkey = uri.split("/").pop() ?? rkey ?? "unknown";
  return {
    uri,
    cid,
    rkey: assignedRkey,
    record
  };
});

// src/mutations/organization.recordings.audio/update.ts
import { Effect as Effect13 } from "effect";
import { $parse as $parse9 } from "@gainforest/generated/app/gainforest/organization/recordings/audio.defs";
var COLLECTION10 = "app.gainforest.organization.recordings.audio";
var MAX_AUDIO_BYTES2 = 100 * 1024 * 1024;
var ACCEPTED_AUDIO_MIMES2 = /* @__PURE__ */ new Set([
  "audio/wav",
  "audio/x-wav",
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/x-m4a",
  "audio/aac",
  "audio/flac",
  "audio/x-flac",
  "audio/ogg",
  "audio/opus",
  "audio/webm",
  "audio/aiff",
  "audio/x-aiff"
]);
var makePdsError10 = (message, cause) => new AudioRecordingPdsError({ message, cause });
var makeValidationError9 = (message, cause) => new AudioRecordingValidationError({ message, cause });
var updateAudioRecording = (input) => Effect13.gen(function* () {
  const { rkey, data, newAudioFile, newTechnicalMetadata } = input;
  if (newAudioFile) {
    if (newAudioFile.size > MAX_AUDIO_BYTES2) {
      return yield* Effect13.fail(
        new FileConstraintError({
          path: ["newAudioFile"],
          reason: `Audio file size ${newAudioFile.size} B exceeds maximum ${MAX_AUDIO_BYTES2} B (100 MB)`
        })
      );
    }
    if (!ACCEPTED_AUDIO_MIMES2.has(newAudioFile.type)) {
      return yield* Effect13.fail(
        new FileConstraintError({
          path: ["newAudioFile"],
          reason: `MIME type "${newAudioFile.type}" is not accepted for audio recordings`
        })
      );
    }
    if (!newTechnicalMetadata) {
      return yield* Effect13.fail(
        new AudioRecordingValidationError({
          message: "newTechnicalMetadata must be provided when newAudioFile is supplied"
        })
      );
    }
  }
  const existing = yield* fetchRecord(
    COLLECTION10,
    rkey,
    makePdsError10
  );
  if (existing === null) {
    return yield* Effect13.fail(new AudioRecordingNotFoundError({ rkey }));
  }
  let audioBlob;
  let techMeta;
  if (newAudioFile) {
    const agent = yield* AtprotoAgent;
    const fileBytes = fromSerializableFile(newAudioFile);
    const uploadResult = yield* Effect13.tryPromise({
      try: () => agent.uploadBlob(fileBytes, { encoding: newAudioFile.type }),
      catch: (cause) => new BlobUploadError({ message: "Failed to upload audio blob", cause })
    });
    const raw = uploadResult.data.blob;
    audioBlob = {
      $type: "app.gainforest.common.defs#audio",
      file: { $type: "blob", ref: raw.ref, mimeType: raw.mimeType, size: raw.size }
    };
    techMeta = newTechnicalMetadata;
  } else {
    const existingBlob = existing.blob;
    const normalizedFile = isAnyBlobRef(existingBlob["file"]) ? normalizeBlobRef(existingBlob["file"]) : existingBlob["file"];
    audioBlob = {
      $type: existingBlob["$type"] ?? "app.gainforest.common.defs#audio",
      file: normalizedFile
    };
    const existingMeta2 = existing.metadata;
    techMeta = {
      codec: existingMeta2["codec"],
      channels: existingMeta2["channels"],
      duration: existingMeta2["duration"],
      sampleRate: existingMeta2["sampleRate"]
    };
  }
  const existingMeta = existing.metadata;
  const merged = {
    $type: COLLECTION10,
    name: data.name !== void 0 ? data.name : existing.name,
    description: data.description !== void 0 ? {
      $type: "app.gainforest.common.defs#richtext",
      text: data.description.text,
      facets: data.description.facets
    } : existing.description,
    blob: audioBlob,
    metadata: {
      $type: "app.gainforest.organization.recordings.audio#metadata",
      codec: techMeta.codec,
      channels: techMeta.channels,
      duration: techMeta.duration,
      sampleRate: techMeta.sampleRate,
      recordedAt: data.metadata?.recordedAt ?? existingMeta["recordedAt"],
      coordinates: data.metadata?.coordinates !== void 0 ? data.metadata.coordinates : existingMeta["coordinates"]
    },
    createdAt: existing.createdAt
  };
  const record = yield* Effect13.try({
    try: () => $parse9(merged),
    catch: (cause) => makeValidationError9(`organization.recordings.audio record failed lexicon validation: ${String(cause)}`, cause)
  });
  const { uri, cid } = yield* putRecord(COLLECTION10, rkey, record, makePdsError10);
  return {
    uri,
    cid,
    rkey,
    record
  };
});

// src/mutations/organization.recordings.audio/upsert.ts
import { Effect as Effect14 } from "effect";
import { $parse as $parse10 } from "@gainforest/generated/app/gainforest/organization/recordings/audio.defs";
var COLLECTION11 = "app.gainforest.organization.recordings.audio";
var MAX_AUDIO_BYTES3 = 100 * 1024 * 1024;
var ACCEPTED_AUDIO_MIMES3 = /* @__PURE__ */ new Set([
  "audio/wav",
  "audio/x-wav",
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/x-m4a",
  "audio/aac",
  "audio/flac",
  "audio/x-flac",
  "audio/ogg",
  "audio/opus",
  "audio/webm",
  "audio/aiff",
  "audio/x-aiff"
]);
var makePdsError11 = (message, cause) => new AudioRecordingPdsError({ message, cause });
var makeValidationError10 = (message, cause) => new AudioRecordingValidationError({ message, cause });
var upsertAudioRecording = (input) => Effect14.gen(function* () {
  const { audioFile, name, description, metadata, rkey } = input;
  if (audioFile.size > MAX_AUDIO_BYTES3) {
    return yield* Effect14.fail(
      new FileConstraintError({
        path: ["audioFile"],
        reason: `Audio file size ${audioFile.size} B exceeds maximum ${MAX_AUDIO_BYTES3} B (100 MB)`
      })
    );
  }
  if (!ACCEPTED_AUDIO_MIMES3.has(audioFile.type)) {
    return yield* Effect14.fail(
      new FileConstraintError({
        path: ["audioFile"],
        reason: `MIME type "${audioFile.type}" is not accepted for audio recordings`
      })
    );
  }
  let existing = null;
  if (rkey) {
    existing = yield* fetchRecord(
      COLLECTION11,
      rkey,
      makePdsError11
    );
  }
  const agent = yield* AtprotoAgent;
  const fileBytes = fromSerializableFile(audioFile);
  const uploadResult = yield* Effect14.tryPromise({
    try: () => agent.uploadBlob(fileBytes, { encoding: audioFile.type }),
    catch: (cause) => new BlobUploadError({ message: "Failed to upload audio blob", cause })
  });
  const raw = uploadResult.data.blob;
  const blobRef = { $type: "blob", ref: raw.ref, mimeType: raw.mimeType, size: raw.size };
  const createdAt = existing !== null ? existing.createdAt : (/* @__PURE__ */ new Date()).toISOString();
  const candidate = {
    $type: COLLECTION11,
    name,
    description: description ? {
      $type: "app.gainforest.common.defs#richtext",
      text: description.text,
      facets: description.facets
    } : void 0,
    blob: {
      $type: "app.gainforest.common.defs#audio",
      file: blobRef
    },
    metadata: {
      $type: "app.gainforest.organization.recordings.audio#metadata",
      codec: metadata.codec,
      channels: metadata.channels,
      duration: metadata.duration,
      sampleRate: metadata.sampleRate,
      recordedAt: metadata.recordedAt,
      coordinates: metadata.coordinates
    },
    createdAt
  };
  const record = yield* Effect14.try({
    try: () => $parse10(candidate),
    catch: (cause) => makeValidationError10(`organization.recordings.audio record failed lexicon validation: ${String(cause)}`, cause)
  });
  const isCreate = !rkey || existing === null;
  let resultUri;
  let cid;
  let assignedRkey;
  if (isCreate) {
    const result = yield* createRecord(COLLECTION11, record, rkey, makePdsError11);
    resultUri = result.uri;
    cid = result.cid;
    assignedRkey = resultUri.split("/").pop() ?? rkey ?? "unknown";
  } else {
    const result = yield* putRecord(COLLECTION11, rkey, record, makePdsError11);
    resultUri = result.uri;
    cid = result.cid;
    assignedRkey = rkey;
  }
  return {
    uri: resultUri,
    cid,
    rkey: assignedRkey,
    record,
    created: isCreate
  };
});

// src/mutations/organization.recordings.audio/delete.ts
import { Effect as Effect15 } from "effect";
var COLLECTION12 = "app.gainforest.organization.recordings.audio";
var makePdsError12 = (message, cause) => new AudioRecordingPdsError({ message, cause });
var deleteAudioRecording = (input) => Effect15.gen(function* () {
  const { rkey } = input;
  const agent = yield* AtprotoAgent;
  const repo = agent.assertDid;
  const uri = `at://${repo}/${COLLECTION12}/${rkey}`;
  yield* deleteRecord(COLLECTION12, rkey, makePdsError12);
  return { uri, rkey };
});

// src/mutations/claim.activity/create.ts
import { Effect as Effect16 } from "effect";
import {
  $parse as $parse11,
  main as claimActivitySchema
} from "@gainforest/generated/org/hypercerts/claim/activity.defs";

// src/mutations/claim.activity/utils/errors.ts
import { Data as Data6 } from "effect";
var ClaimActivityValidationError = class extends Data6.TaggedError(
  "ClaimActivityValidationError"
) {
};
var ClaimActivityNotFoundError = class extends Data6.TaggedError(
  "ClaimActivityNotFoundError"
) {
};
var ClaimActivityPdsError = class extends Data6.TaggedError(
  "ClaimActivityPdsError"
) {
};

// src/mutations/claim.activity/create.ts
var COLLECTION13 = "org.hypercerts.claim.activity";
var BLOB_CONSTRAINTS4 = extractBlobConstraints(claimActivitySchema);
var makePdsError13 = (message, cause) => new ClaimActivityPdsError({ message, cause });
var makeValidationError11 = (message, cause) => new ClaimActivityValidationError({ message, cause });
var createClaimActivity = (input) => Effect16.gen(function* () {
  yield* validateFileConstraints(input, BLOB_CONSTRAINTS4);
  const { rkey: inputRkey, ...inputData } = input;
  const candidate = { $type: COLLECTION13, ...inputData, createdAt: (/* @__PURE__ */ new Date()).toISOString() };
  yield* stubValidate(candidate, $parse11, makeValidationError11);
  const resolved = yield* resolveFileInputs(candidate);
  const record = yield* finalValidate(resolved, $parse11, makeValidationError11);
  const { uri, cid } = yield* createRecord(COLLECTION13, record, inputRkey, makePdsError13);
  const rkey = uri.split("/").pop();
  return { uri, cid, rkey, record };
});

// src/mutations/claim.activity/update.ts
import { Effect as Effect17 } from "effect";
import {
  $parse as $parse12,
  main as claimActivitySchema2
} from "@gainforest/generated/org/hypercerts/claim/activity.defs";

// src/mutations/claim.activity/utils/merge.ts
var REQUIRED_FIELDS3 = /* @__PURE__ */ new Set([
  "title",
  "shortDescription"
]);
var applyPatch3 = (existing, data, unset) => applyPatch(existing, data, unset, REQUIRED_FIELDS3);

// src/mutations/claim.activity/update.ts
var COLLECTION14 = "org.hypercerts.claim.activity";
var BLOB_CONSTRAINTS5 = extractBlobConstraints(claimActivitySchema2);
var makePdsError14 = (message, cause) => new ClaimActivityPdsError({ message, cause });
var makeValidationError12 = (message, cause) => new ClaimActivityValidationError({ message, cause });
var updateClaimActivity = (input) => Effect17.gen(function* () {
  const { rkey } = input;
  yield* validateFileConstraints(input.data, BLOB_CONSTRAINTS5);
  const existing = yield* fetchRecord(
    COLLECTION14,
    rkey,
    makePdsError14
  );
  if (existing === null) {
    return yield* Effect17.fail(new ClaimActivityNotFoundError({ rkey }));
  }
  const patched = applyPatch3(existing, input.data, input.unset);
  patched.$type = COLLECTION14;
  patched.createdAt = existing.createdAt;
  yield* stubValidate(patched, $parse12, makeValidationError12);
  const resolved = yield* resolveFileInputs(patched);
  const record = yield* finalValidate(resolved, $parse12, makeValidationError12);
  const { uri, cid } = yield* putRecord(COLLECTION14, rkey, record, makePdsError14);
  return { uri, cid, rkey, record };
});

// src/mutations/claim.activity/upsert.ts
import { Effect as Effect18 } from "effect";
import {
  $parse as $parse13,
  main as claimActivitySchema3
} from "@gainforest/generated/org/hypercerts/claim/activity.defs";
var COLLECTION15 = "org.hypercerts.claim.activity";
var BLOB_CONSTRAINTS6 = extractBlobConstraints(claimActivitySchema3);
var makePdsError15 = (message, cause) => new ClaimActivityPdsError({ message, cause });
var makeValidationError13 = (message, cause) => new ClaimActivityValidationError({ message, cause });
var upsertClaimActivity = (input) => Effect18.gen(function* () {
  yield* validateFileConstraints(input, BLOB_CONSTRAINTS6);
  const { rkey: inputRkey, ...inputData } = input;
  if (inputRkey === void 0) {
    const candidate2 = { $type: COLLECTION15, ...inputData, createdAt: (/* @__PURE__ */ new Date()).toISOString() };
    yield* stubValidate(candidate2, $parse13, makeValidationError13);
    const resolved2 = yield* resolveFileInputs(candidate2);
    const record2 = yield* finalValidate(resolved2, $parse13, makeValidationError13);
    const { uri: uri2, cid: cid2 } = yield* createRecord(COLLECTION15, record2, void 0, makePdsError15);
    const rkey = uri2.split("/").pop();
    return { uri: uri2, cid: cid2, rkey, record: record2, created: true };
  }
  const existing = yield* fetchRecord(
    COLLECTION15,
    inputRkey,
    makePdsError15
  );
  const createdAt = existing !== null ? existing.createdAt : (/* @__PURE__ */ new Date()).toISOString();
  const candidate = { $type: COLLECTION15, ...inputData, createdAt };
  yield* stubValidate(candidate, $parse13, makeValidationError13);
  const resolved = yield* resolveFileInputs(candidate);
  const record = yield* finalValidate(resolved, $parse13, makeValidationError13);
  const { uri, cid } = yield* putRecord(COLLECTION15, inputRkey, record, makePdsError15);
  return {
    uri,
    cid,
    rkey: inputRkey,
    record,
    created: existing === null
  };
});

// src/mutations/claim.activity/delete.ts
import { Effect as Effect19 } from "effect";
var COLLECTION16 = "org.hypercerts.claim.activity";
var makePdsError16 = (message, cause) => new ClaimActivityPdsError({ message, cause });
var deleteClaimActivity = (input) => Effect19.gen(function* () {
  const { rkey } = input;
  const repo = (yield* AtprotoAgent).assertDid;
  const uri = `at://${repo}/${COLLECTION16}/${rkey}`;
  const existing = yield* fetchRecord(COLLECTION16, rkey, makePdsError16);
  if (existing === null) {
    return yield* Effect19.fail(new ClaimActivityNotFoundError({ rkey }));
  }
  yield* deleteRecord(COLLECTION16, rkey, makePdsError16);
  return { uri, rkey };
});

// src/mutations/claim.rights/create.ts
import { Effect as Effect20 } from "effect";
import {
  $parse as $parse14,
  main as claimRightsSchema
} from "@gainforest/generated/org/hypercerts/claim/rights.defs";

// src/mutations/claim.rights/utils/errors.ts
import { Data as Data7 } from "effect";
var ClaimRightsValidationError = class extends Data7.TaggedError(
  "ClaimRightsValidationError"
) {
};
var ClaimRightsNotFoundError = class extends Data7.TaggedError(
  "ClaimRightsNotFoundError"
) {
};
var ClaimRightsPdsError = class extends Data7.TaggedError(
  "ClaimRightsPdsError"
) {
};

// src/mutations/claim.rights/create.ts
var COLLECTION17 = "org.hypercerts.claim.rights";
var BLOB_CONSTRAINTS7 = extractBlobConstraints(claimRightsSchema);
var makePdsError17 = (message, cause) => new ClaimRightsPdsError({ message, cause });
var makeValidationError14 = (message, cause) => new ClaimRightsValidationError({ message, cause });
var createClaimRights = (input) => Effect20.gen(function* () {
  yield* validateFileConstraints(input, BLOB_CONSTRAINTS7);
  const { rkey: inputRkey, ...inputData } = input;
  const candidate = { $type: COLLECTION17, ...inputData, createdAt: (/* @__PURE__ */ new Date()).toISOString() };
  yield* stubValidate(candidate, $parse14, makeValidationError14);
  const resolved = yield* resolveFileInputs(candidate);
  const record = yield* finalValidate(resolved, $parse14, makeValidationError14);
  const { uri, cid } = yield* createRecord(COLLECTION17, record, inputRkey, makePdsError17);
  const rkey = uri.split("/").pop();
  return { uri, cid, rkey, record };
});

// src/mutations/claim.rights/update.ts
import { Effect as Effect21 } from "effect";
import {
  $parse as $parse15,
  main as claimRightsSchema2
} from "@gainforest/generated/org/hypercerts/claim/rights.defs";

// src/mutations/claim.rights/utils/merge.ts
var REQUIRED_FIELDS4 = /* @__PURE__ */ new Set([
  "rightsName",
  "rightsType",
  "rightsDescription"
]);
var applyPatch4 = (existing, data, unset) => applyPatch(existing, data, unset, REQUIRED_FIELDS4);

// src/mutations/claim.rights/update.ts
var COLLECTION18 = "org.hypercerts.claim.rights";
var BLOB_CONSTRAINTS8 = extractBlobConstraints(claimRightsSchema2);
var makePdsError18 = (message, cause) => new ClaimRightsPdsError({ message, cause });
var makeValidationError15 = (message, cause) => new ClaimRightsValidationError({ message, cause });
var updateClaimRights = (input) => Effect21.gen(function* () {
  const { rkey } = input;
  yield* validateFileConstraints(input.data, BLOB_CONSTRAINTS8);
  const existing = yield* fetchRecord(
    COLLECTION18,
    rkey,
    makePdsError18
  );
  if (existing === null) {
    return yield* Effect21.fail(new ClaimRightsNotFoundError({ rkey }));
  }
  const patched = applyPatch4(existing, input.data, input.unset);
  patched.$type = COLLECTION18;
  patched.createdAt = existing.createdAt;
  yield* stubValidate(patched, $parse15, makeValidationError15);
  const resolved = yield* resolveFileInputs(patched);
  const record = yield* finalValidate(resolved, $parse15, makeValidationError15);
  const { uri, cid } = yield* putRecord(COLLECTION18, rkey, record, makePdsError18);
  return { uri, cid, rkey, record };
});

// src/mutations/claim.rights/upsert.ts
import { Effect as Effect22 } from "effect";
import {
  $parse as $parse16
} from "@gainforest/generated/org/hypercerts/claim/rights.defs";
import { main as claimRightsSchema3 } from "@gainforest/generated/org/hypercerts/claim/rights.defs";
var COLLECTION19 = "org.hypercerts.claim.rights";
var BLOB_CONSTRAINTS9 = extractBlobConstraints(claimRightsSchema3);
var makePdsError19 = (message, cause) => new ClaimRightsPdsError({ message, cause });
var makeValidationError16 = (message, cause) => new ClaimRightsValidationError({ message, cause });
var upsertClaimRights = (input) => Effect22.gen(function* () {
  yield* validateFileConstraints(input, BLOB_CONSTRAINTS9);
  const { rkey: inputRkey, ...inputData } = input;
  if (inputRkey === void 0) {
    const candidate2 = { $type: COLLECTION19, ...inputData, createdAt: (/* @__PURE__ */ new Date()).toISOString() };
    yield* stubValidate(candidate2, $parse16, makeValidationError16);
    const resolved2 = yield* resolveFileInputs(candidate2);
    const record2 = yield* finalValidate(resolved2, $parse16, makeValidationError16);
    const { uri: uri2, cid: cid2 } = yield* createRecord(COLLECTION19, record2, void 0, makePdsError19);
    const rkey = uri2.split("/").pop();
    return { uri: uri2, cid: cid2, rkey, record: record2, created: true };
  }
  const existing = yield* fetchRecord(
    COLLECTION19,
    inputRkey,
    makePdsError19
  );
  const createdAt = existing !== null ? existing.createdAt : (/* @__PURE__ */ new Date()).toISOString();
  const candidate = { $type: COLLECTION19, ...inputData, createdAt };
  yield* stubValidate(candidate, $parse16, makeValidationError16);
  const resolved = yield* resolveFileInputs(candidate);
  const record = yield* finalValidate(resolved, $parse16, makeValidationError16);
  const { uri, cid } = yield* putRecord(COLLECTION19, inputRkey, record, makePdsError19);
  return {
    uri,
    cid,
    rkey: inputRkey,
    record,
    created: existing === null
  };
});

// src/mutations/claim.rights/delete.ts
import { Effect as Effect23 } from "effect";
var COLLECTION20 = "org.hypercerts.claim.rights";
var makePdsError20 = (message, cause) => new ClaimRightsPdsError({ message, cause });
var deleteClaimRights = (input) => Effect23.gen(function* () {
  const { rkey } = input;
  const repo = (yield* AtprotoAgent).assertDid;
  const uri = `at://${repo}/${COLLECTION20}/${rkey}`;
  const existing = yield* fetchRecord(COLLECTION20, rkey, makePdsError20);
  if (existing === null) {
    return yield* Effect23.fail(new ClaimRightsNotFoundError({ rkey }));
  }
  yield* deleteRecord(COLLECTION20, rkey, makePdsError20);
  return { uri, rkey };
});

// src/mutations/certified.location/create.ts
import { Effect as Effect25 } from "effect";
import {
  $parse as $parse17
} from "@gainforest/generated/app/certified/location.defs";

// src/mutations/certified.location/utils/process-geojson.ts
import { Effect as Effect24 } from "effect";

// src/geojson/validate.ts
function validateGeojsonOrThrow(value) {
  if (value === null || typeof value !== "object") {
    throw new Error("GeoJSON must be an object");
  }
  const obj = value;
  if (!("type" in obj) || typeof obj.type !== "string") {
    throw new Error("GeoJSON must have a 'type' property of type string");
  }
  const type = obj.type;
  if (type === "FeatureCollection") {
    if (!("features" in obj) || !Array.isArray(obj.features)) {
      throw new Error(
        "FeatureCollection must have a 'features' property of type array"
      );
    }
    for (let i = 0; i < obj.features.length; i++) {
      try {
        validateGeojsonOrThrow(obj.features[i]);
      } catch (error) {
        throw new Error(
          `FeatureCollection.features[${i}] is invalid: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
    return obj;
  }
  if (type === "Feature") {
    if (!("geometry" in obj)) {
      throw new Error("Feature must have a 'geometry' property");
    }
    if (obj.geometry !== null) {
      try {
        validateGeometry(obj.geometry);
      } catch (error) {
        throw new Error(
          `Feature.geometry is invalid: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
    if (!("properties" in obj)) {
      throw new Error("Feature must have a 'properties' property");
    }
    if (obj.properties !== null && typeof obj.properties !== "object") {
      throw new Error("Feature.properties must be an object or null");
    }
    return obj;
  }
  try {
    validateGeometry(obj);
    return obj;
  } catch (error) {
    throw new Error(
      `Invalid GeoJSON type '${type}': ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
function validateGeometry(value) {
  if (value === null || typeof value !== "object") {
    throw new Error("Geometry must be an object");
  }
  const geometry = value;
  if (!("type" in geometry) || typeof geometry.type !== "string") {
    throw new Error("Geometry must have a 'type' property of type string");
  }
  const type = geometry.type;
  if (type === "GeometryCollection") {
    if (!("geometries" in geometry) || !Array.isArray(geometry.geometries)) {
      throw new Error(
        "GeometryCollection must have a 'geometries' property of type array"
      );
    }
    for (let i = 0; i < geometry.geometries.length; i++) {
      try {
        validateGeometry(geometry.geometries[i]);
      } catch (error) {
        throw new Error(
          `GeometryCollection.geometries[${i}] is invalid: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
    return;
  }
  const coordinateGeometries = [
    "Point",
    "LineString",
    "Polygon",
    "MultiPoint",
    "MultiLineString",
    "MultiPolygon"
  ];
  if (coordinateGeometries.includes(type)) {
    if (!("coordinates" in geometry)) {
      throw new Error(`${type} must have a 'coordinates' property`);
    }
    validateCoordinates(geometry.coordinates, type);
    return;
  }
  throw new Error(`Unknown geometry type: ${type}`);
}
function validateCoordinates(coordinates, type) {
  if (!Array.isArray(coordinates)) {
    throw new Error("Coordinates must be an array");
  }
  switch (type) {
    case "Point":
      validatePosition(coordinates);
      break;
    case "LineString":
      validateLineString(coordinates);
      break;
    case "Polygon":
      validatePolygon(coordinates);
      break;
    case "MultiPoint":
      validateMultiPoint(coordinates);
      break;
    case "MultiLineString":
      validateMultiLineString(coordinates);
      break;
    case "MultiPolygon":
      validateMultiPolygon(coordinates);
      break;
  }
}
function validatePosition(value) {
  if (!Array.isArray(value)) {
    throw new Error("Position must be an array");
  }
  if (value.length < 2) {
    throw new Error("Position must have at least 2 elements (longitude, latitude)");
  }
  if (typeof value[0] !== "number" || typeof value[1] !== "number") {
    throw new Error("Position must have numbers for longitude and latitude");
  }
  if (value.length > 2 && typeof value[2] !== "number") {
    throw new Error("Position elevation (3rd element) must be a number if present");
  }
  if (value[0] < -180 || value[0] > 180) {
    throw new Error("Longitude must be between -180 and 180");
  }
  if (value[1] < -90 || value[1] > 90) {
    throw new Error("Latitude must be between -90 and 90");
  }
}
function validateLineString(value) {
  if (!Array.isArray(value)) throw new Error("LineString must be an array");
  if (value.length < 2) throw new Error("LineString must have at least 2 positions");
  for (let i = 0; i < value.length; i++) {
    try {
      validatePosition(value[i]);
    } catch (error) {
      throw new Error(
        `LineString[${i}] is invalid: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
function validatePolygon(value) {
  if (!Array.isArray(value)) throw new Error("Polygon must be an array");
  if (value.length === 0) throw new Error("Polygon must have at least one LinearRing");
  for (let i = 0; i < value.length; i++) {
    try {
      validateLinearRing(value[i]);
    } catch (error) {
      throw new Error(
        `Polygon[${i}] is invalid: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
function validateLinearRing(value) {
  if (!Array.isArray(value)) throw new Error("LinearRing must be an array");
  if (value.length < 4) throw new Error("LinearRing must have at least 4 positions");
  for (let i = 0; i < value.length; i++) {
    try {
      validatePosition(value[i]);
    } catch (error) {
      throw new Error(
        `LinearRing[${i}] is invalid: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
  const first = value[0];
  const last = value[value.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1] || first.length > 2 && first[2] !== last[2]) {
    throw new Error(
      "LinearRing must be closed (first and last positions must be equal)"
    );
  }
}
function validateMultiPoint(value) {
  if (!Array.isArray(value)) throw new Error("MultiPoint must be an array");
  for (let i = 0; i < value.length; i++) {
    try {
      validatePosition(value[i]);
    } catch (error) {
      throw new Error(
        `MultiPoint[${i}] is invalid: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
function validateMultiLineString(value) {
  if (!Array.isArray(value)) throw new Error("MultiLineString must be an array");
  for (let i = 0; i < value.length; i++) {
    try {
      validateLineString(value[i]);
    } catch (error) {
      throw new Error(
        `MultiLineString[${i}] is invalid: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
function validateMultiPolygon(value) {
  if (!Array.isArray(value)) throw new Error("MultiPolygon must be an array");
  for (let i = 0; i < value.length; i++) {
    try {
      validatePolygon(value[i]);
    } catch (error) {
      throw new Error(
        `MultiPolygon[${i}] is invalid: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}

// src/geojson/computations.ts
import {
  area as turfArea,
  bbox as turfBbox,
  centerOfMass,
  centroid as turfCentroid,
  featureCollection
} from "@turf/turf";
var HECTARES_PER_SQUARE_METER = 1e-4;
var isFeatureCollection = (v) => v.type === "FeatureCollection";
var isFeature = (v) => v.type === "Feature";
var isGeometryCollection = (v) => v.type === "GeometryCollection";
var isPolygon = (v) => v.type === "Polygon";
var isMultiPolygon = (v) => v.type === "MultiPolygon";
var isLineString = (v) => v.type === "LineString";
var isMultiLineString = (v) => v.type === "MultiLineString";
var isPoint = (v) => v.type === "Point";
var isMultiPoint = (v) => v.type === "MultiPoint";
var isLineStringClosed = (ls) => {
  const coords = ls.coordinates;
  if (coords.length < 4) return false;
  const first = coords[0];
  const last = coords[coords.length - 1];
  if (!first || !last || first.length < 2 || last.length < 2) return false;
  const [fLon, fLat] = first;
  const [lLon, lLat] = last;
  if (fLon === void 0 || fLat === void 0 || lLon === void 0 || lLat === void 0)
    return false;
  const tol = 1e-10;
  return Math.abs(fLon - lLon) < tol && Math.abs(fLat - lLat) < tol;
};
var lineStringToPolygon = (ls) => {
  if (!isLineStringClosed(ls)) return null;
  return { type: "Polygon", coordinates: [ls.coordinates] };
};
var toFeature = (geometry) => ({
  type: "Feature",
  geometry,
  properties: {}
});
var extractPolygonFeatures = (input) => {
  if (isFeatureCollection(input)) {
    return input.features.flatMap((f) => extractPolygonFeatures(f));
  }
  if (isFeature(input)) {
    const g2 = input.geometry;
    if (!g2) return [];
    if (isGeometryCollection(g2))
      return g2.geometries.flatMap((sub) => extractPolygonFeatures(toFeature(sub)));
    if (isPolygon(g2) || isMultiPolygon(g2))
      return [input];
    return [];
  }
  const g = input;
  if (isGeometryCollection(g))
    return g.geometries.flatMap((sub) => extractPolygonFeatures(toFeature(sub)));
  if (isPolygon(g) || isMultiPolygon(g))
    return [toFeature(g)];
  return [];
};
var extractLineStringFeatures = (input) => {
  if (isFeatureCollection(input)) {
    return input.features.flatMap((f) => extractLineStringFeatures(f));
  }
  if (isFeature(input)) {
    const g2 = input.geometry;
    if (!g2) return [];
    if (isGeometryCollection(g2))
      return g2.geometries.flatMap((sub) => extractLineStringFeatures(toFeature(sub)));
    if (isLineString(g2) || isMultiLineString(g2))
      return [input];
    return [];
  }
  const g = input;
  if (isGeometryCollection(g))
    return g.geometries.flatMap((sub) => extractLineStringFeatures(toFeature(sub)));
  if (isLineString(g) || isMultiLineString(g))
    return [toFeature(g)];
  return [];
};
var extractPointFeatures = (input) => {
  if (isFeatureCollection(input)) {
    return input.features.flatMap((f) => extractPointFeatures(f));
  }
  if (isFeature(input)) {
    const g2 = input.geometry;
    if (!g2) return [];
    if (isGeometryCollection(g2))
      return g2.geometries.flatMap((sub) => extractPointFeatures(toFeature(sub)));
    if (isPoint(g2) || isMultiPoint(g2)) return [input];
    return [];
  }
  const g = input;
  if (isGeometryCollection(g))
    return g.geometries.flatMap((sub) => extractPointFeatures(toFeature(sub)));
  if (isPoint(g) || isMultiPoint(g))
    return [toFeature(g)];
  return [];
};
var computeCentroidPosition = (features) => {
  if (features.length === 0) return null;
  const col = featureCollection(features);
  try {
    return centerOfMass(col).geometry.coordinates;
  } catch {
    try {
      return turfCentroid(col).geometry.coordinates;
    } catch {
      return null;
    }
  }
};
var positionToCoords = (pos) => {
  if (!pos || pos[0] === void 0 || pos[1] === void 0) return null;
  return { lat: pos[1], lon: pos[0] };
};
var computePolygonMetrics = (geoJson) => {
  const polygonFeatures = extractPolygonFeatures(geoJson);
  const lineStringFeatures = extractLineStringFeatures(geoJson);
  const pointFeatures = extractPointFeatures(geoJson);
  const convertedPolygons = [];
  for (const lsf of lineStringFeatures) {
    if (lsf.geometry.type === "LineString") {
      const poly = lineStringToPolygon(lsf.geometry);
      if (poly) convertedPolygons.push({ type: "Feature", geometry: poly, properties: lsf.properties });
    } else if (lsf.geometry.type === "MultiLineString") {
      for (const coords of lsf.geometry.coordinates) {
        const ls = { type: "LineString", coordinates: coords };
        const poly = lineStringToPolygon(ls);
        if (poly) convertedPolygons.push({ type: "Feature", geometry: poly, properties: lsf.properties });
      }
    }
  }
  const allPolygonFeatures = [...polygonFeatures, ...convertedPolygons];
  if (pointFeatures.length > 0 && allPolygonFeatures.length === 0 && lineStringFeatures.length === 0) {
    const centroid2 = positionToCoords(computeCentroidPosition(pointFeatures));
    const bbox2 = turfBbox(featureCollection(pointFeatures));
    return {
      areaSqMeters: null,
      areaHectares: null,
      centroid: centroid2,
      bbox: bbox2,
      message: centroid2 ? "Success (Point)" : "Centroid calculation failed"
    };
  }
  if (lineStringFeatures.length > 0 && allPolygonFeatures.length === 0) {
    const centroid2 = positionToCoords(
      computeCentroidPosition(lineStringFeatures)
    );
    const bbox2 = turfBbox(featureCollection(lineStringFeatures));
    return {
      areaSqMeters: null,
      areaHectares: null,
      centroid: centroid2,
      bbox: bbox2,
      message: centroid2 ? "Success (LineString)" : "Centroid calculation failed"
    };
  }
  const hasPolygons = allPolygonFeatures.length > 0;
  const hasLineStrings = lineStringFeatures.length > 0;
  const hasPoints = pointFeatures.length > 0;
  const typeCount = (hasPolygons ? 1 : 0) + (hasLineStrings ? 1 : 0) + (hasPoints ? 1 : 0);
  if (typeCount > 1) {
    const areaSqMeters2 = allPolygonFeatures.reduce((acc, f) => acc + turfArea(f), 0);
    const allFeatures = [
      ...allPolygonFeatures,
      ...lineStringFeatures,
      ...pointFeatures
    ];
    const centroid2 = positionToCoords(computeCentroidPosition(allFeatures));
    const bbox2 = turfBbox(featureCollection(allFeatures));
    const labels = [
      ...hasPolygons ? ["Polygon"] : [],
      ...hasLineStrings ? ["LineString"] : [],
      ...hasPoints ? ["Point"] : []
    ];
    return {
      areaSqMeters: areaSqMeters2,
      areaHectares: areaSqMeters2 * HECTARES_PER_SQUARE_METER,
      centroid: centroid2,
      bbox: bbox2,
      message: centroid2 ? `Success (mixed: ${labels.join(", ")})` : "Centroid calculation failed"
    };
  }
  if (allPolygonFeatures.length === 0) {
    return {
      areaSqMeters: null,
      areaHectares: null,
      centroid: null,
      bbox: null,
      message: "No polygons found"
    };
  }
  const areaSqMeters = allPolygonFeatures.reduce((acc, f) => acc + turfArea(f), 0);
  const centroid = positionToCoords(
    computeCentroidPosition(allPolygonFeatures)
  );
  const bbox = turfBbox(featureCollection(allPolygonFeatures));
  return {
    areaSqMeters,
    areaHectares: areaSqMeters * HECTARES_PER_SQUARE_METER,
    centroid,
    bbox,
    message: centroid ? "Success" : "Centroid calculation failed"
  };
};
var toFeatureCollection = (geoJson) => {
  if (isFeatureCollection(geoJson)) return geoJson;
  if (isFeature(geoJson)) return featureCollection([geoJson]);
  return featureCollection([toFeature(geoJson)]);
};

// src/geojson/errors.ts
import { Data as Data8 } from "effect";
var GeoJsonValidationError = class extends Data8.TaggedError(
  "GeoJsonValidationError"
) {
};
var GeoJsonProcessingError = class extends Data8.TaggedError(
  "GeoJsonProcessingError"
) {
};

// src/mutations/certified.location/utils/process-geojson.ts
var processGeoJsonFile = (file) => Effect24.gen(function* () {
  if (file.type !== "application/geo+json") {
    return yield* Effect24.fail(
      new GeoJsonValidationError({
        message: `Expected MIME type "application/geo+json", got "${file.type}"`
      })
    );
  }
  const bytes = fromSerializableFile(file);
  const text = new TextDecoder().decode(bytes);
  const parsed = yield* Effect24.try({
    try: () => JSON.parse(text),
    catch: (cause) => new GeoJsonValidationError({ message: `Invalid JSON in GeoJSON file: ${String(cause)}`, cause })
  });
  const geoJson = yield* Effect24.try({
    try: () => validateGeojsonOrThrow(parsed),
    catch: (cause) => new GeoJsonValidationError({ message: `Invalid GeoJSON: ${String(cause)}`, cause })
  });
  const metrics = computePolygonMetrics(geoJson);
  const lat = metrics.centroid?.lat;
  const lon = metrics.centroid?.lon;
  const area = metrics.areaHectares;
  if (lat === void 0 || lat === null || lon === void 0 || lon === null || !area) {
    return yield* Effect24.fail(
      new GeoJsonProcessingError({
        message: `GeoJSON does not contain polygon geometry with computable area. ${metrics.message}`
      })
    );
  }
  return {
    lat: lat.toFixed(6),
    lon: lon.toFixed(6),
    area: area.toFixed(2)
  };
});

// src/mutations/certified.location/utils/errors.ts
import { Data as Data9 } from "effect";
var CertifiedLocationValidationError = class extends Data9.TaggedError(
  "CertifiedLocationValidationError"
) {
};
var CertifiedLocationNotFoundError = class extends Data9.TaggedError(
  "CertifiedLocationNotFoundError"
) {
};
var CertifiedLocationPdsError = class extends Data9.TaggedError(
  "CertifiedLocationPdsError"
) {
};
var CertifiedLocationIsDefaultError = class extends Data9.TaggedError(
  "CertifiedLocationIsDefaultError"
) {
};

// src/mutations/certified.location/create.ts
var COLLECTION21 = "app.certified.location";
var MAX_SHAPEFILE_BYTES = 10 * 1024 * 1024;
var makePdsError21 = (message, cause) => new CertifiedLocationPdsError({ message, cause });
var makeValidationError17 = (message, cause) => new CertifiedLocationValidationError({ message, cause });
var createCertifiedLocation = (input) => Effect25.gen(function* () {
  const { shapefile, name, description, rkey } = input;
  if (shapefile.size > MAX_SHAPEFILE_BYTES) {
    return yield* Effect25.fail(
      new GeoJsonValidationError({
        message: `GeoJSON file size ${shapefile.size} B exceeds maximum ${MAX_SHAPEFILE_BYTES} B (10 MB)`
      })
    );
  }
  yield* processGeoJsonFile(shapefile);
  const agent = yield* AtprotoAgent;
  const fileBytes = fromSerializableFile(shapefile);
  const uploadResult = yield* Effect25.tryPromise({
    try: () => agent.uploadBlob(fileBytes, { encoding: shapefile.type }),
    catch: (cause) => new BlobUploadError({ message: "Failed to upload GeoJSON blob", cause })
  });
  const raw = uploadResult.data.blob;
  const blobRef = {
    $type: "blob",
    ref: raw.ref,
    mimeType: raw.mimeType,
    size: raw.size
  };
  const createdAt = (/* @__PURE__ */ new Date()).toISOString();
  const candidate = {
    $type: COLLECTION21,
    lpVersion: "1.0.0",
    srs: "https://epsg.io/3857",
    locationType: "geojson-point",
    location: {
      $type: "org.hypercerts.defs#smallBlob",
      blob: blobRef
    },
    name,
    description,
    createdAt
  };
  const record = yield* Effect25.try({
    try: () => $parse17(candidate),
    catch: (cause) => makeValidationError17(`certified.location record failed lexicon validation: ${String(cause)}`, cause)
  });
  const { uri, cid } = yield* createRecord(COLLECTION21, record, rkey, makePdsError21);
  const assignedRkey = uri.split("/").pop() ?? rkey ?? "unknown";
  return {
    uri,
    cid,
    rkey: assignedRkey,
    record
  };
});

// src/mutations/certified.location/update.ts
import { Effect as Effect26 } from "effect";
import {
  $parse as $parse18
} from "@gainforest/generated/app/certified/location.defs";
var COLLECTION22 = "app.certified.location";
var MAX_SHAPEFILE_BYTES2 = 10 * 1024 * 1024;
var makePdsError22 = (message, cause) => new CertifiedLocationPdsError({ message, cause });
var makeValidationError18 = (message, cause) => new CertifiedLocationValidationError({ message, cause });
var updateCertifiedLocation = (input) => Effect26.gen(function* () {
  const { rkey, data, newShapefile } = input;
  if (newShapefile) {
    if (newShapefile.size > MAX_SHAPEFILE_BYTES2) {
      return yield* Effect26.fail(
        new GeoJsonValidationError({
          message: `GeoJSON file size ${newShapefile.size} B exceeds maximum ${MAX_SHAPEFILE_BYTES2} B (10 MB)`
        })
      );
    }
    yield* processGeoJsonFile(newShapefile);
  }
  const existing = yield* fetchRecord(
    COLLECTION22,
    rkey,
    makePdsError22
  );
  if (existing === null) {
    return yield* Effect26.fail(new CertifiedLocationNotFoundError({ rkey }));
  }
  let locationBlob;
  if (newShapefile) {
    const agent = yield* AtprotoAgent;
    const fileBytes = fromSerializableFile(newShapefile);
    const uploadResult = yield* Effect26.tryPromise({
      try: () => agent.uploadBlob(fileBytes, { encoding: newShapefile.type }),
      catch: (cause) => new BlobUploadError({ message: "Failed to upload GeoJSON blob", cause })
    });
    const raw = uploadResult.data.blob;
    locationBlob = {
      $type: "org.hypercerts.defs#smallBlob",
      blob: { $type: "blob", ref: raw.ref, mimeType: raw.mimeType, size: raw.size }
    };
  } else {
    const existingLocation = existing.location;
    const normalizedBlob = isAnyBlobRef(existingLocation["blob"]) ? normalizeBlobRef(existingLocation["blob"]) : existingLocation["blob"];
    locationBlob = {
      $type: existingLocation["$type"] ?? "org.hypercerts.defs#smallBlob",
      blob: normalizedBlob
    };
  }
  const merged = {
    $type: COLLECTION22,
    lpVersion: existing.lpVersion,
    srs: existing.srs,
    locationType: existing.locationType,
    location: locationBlob,
    name: data.name !== void 0 ? data.name : existing.name,
    description: data.description !== void 0 ? data.description : existing.description,
    createdAt: existing.createdAt
  };
  const record = yield* Effect26.try({
    try: () => $parse18(merged),
    catch: (cause) => makeValidationError18(`certified.location record failed lexicon validation: ${String(cause)}`, cause)
  });
  const { uri, cid } = yield* putRecord(COLLECTION22, rkey, record, makePdsError22);
  return {
    uri,
    cid,
    rkey,
    record
  };
});

// src/mutations/certified.location/upsert.ts
import { Effect as Effect27 } from "effect";
import {
  $parse as $parse19
} from "@gainforest/generated/app/certified/location.defs";
var COLLECTION23 = "app.certified.location";
var MAX_SHAPEFILE_BYTES3 = 10 * 1024 * 1024;
var makePdsError23 = (message, cause) => new CertifiedLocationPdsError({ message, cause });
var makeValidationError19 = (message, cause) => new CertifiedLocationValidationError({ message, cause });
var upsertCertifiedLocation = (input) => Effect27.gen(function* () {
  const { shapefile, name, description, rkey } = input;
  if (shapefile.size > MAX_SHAPEFILE_BYTES3) {
    return yield* Effect27.fail(
      new GeoJsonValidationError({
        message: `GeoJSON file size ${shapefile.size} B exceeds maximum ${MAX_SHAPEFILE_BYTES3} B (10 MB)`
      })
    );
  }
  yield* processGeoJsonFile(shapefile);
  let existing = null;
  if (rkey) {
    existing = yield* fetchRecord(
      COLLECTION23,
      rkey,
      makePdsError23
    );
  }
  const agent = yield* AtprotoAgent;
  const fileBytes = fromSerializableFile(shapefile);
  const uploadResult = yield* Effect27.tryPromise({
    try: () => agent.uploadBlob(fileBytes, { encoding: shapefile.type }),
    catch: (cause) => new BlobUploadError({ message: "Failed to upload GeoJSON blob", cause })
  });
  const raw = uploadResult.data.blob;
  const blobRef = { $type: "blob", ref: raw.ref, mimeType: raw.mimeType, size: raw.size };
  const createdAt = existing !== null ? existing.createdAt : (/* @__PURE__ */ new Date()).toISOString();
  const candidate = {
    $type: COLLECTION23,
    lpVersion: "1.0.0",
    srs: "https://epsg.io/3857",
    locationType: "geojson-point",
    location: { $type: "org.hypercerts.defs#smallBlob", blob: blobRef },
    name,
    description,
    createdAt
  };
  const record = yield* Effect27.try({
    try: () => $parse19(candidate),
    catch: (cause) => makeValidationError19(`certified.location record failed lexicon validation: ${String(cause)}`, cause)
  });
  const isCreate = !rkey || existing === null;
  let uri;
  let cid;
  let assignedRkey;
  if (isCreate) {
    const result = yield* createRecord(COLLECTION23, record, rkey, makePdsError23);
    uri = result.uri;
    cid = result.cid;
    assignedRkey = uri.split("/").pop() ?? rkey ?? "unknown";
  } else {
    const result = yield* putRecord(COLLECTION23, rkey, record, makePdsError23);
    uri = result.uri;
    cid = result.cid;
    assignedRkey = rkey;
  }
  return {
    uri,
    cid,
    rkey: assignedRkey,
    record,
    created: isCreate
  };
});

// src/mutations/certified.location/delete.ts
import { Effect as Effect28 } from "effect";
var COLLECTION24 = "app.certified.location";
var DEFAULT_SITE_COLLECTION = "app.gainforest.organization.defaultSite";
var makePdsError24 = (message, cause) => new CertifiedLocationPdsError({ message, cause });
var deleteCertifiedLocation = (input) => Effect28.gen(function* () {
  const { rkey } = input;
  const agent = yield* AtprotoAgent;
  const repo = agent.assertDid;
  const locationUri = `at://${repo}/${COLLECTION24}/${rkey}`;
  const defaultSite = yield* fetchRecord(
    DEFAULT_SITE_COLLECTION,
    "self",
    makePdsError24
  );
  if (defaultSite?.site === locationUri) {
    return yield* Effect28.fail(
      new CertifiedLocationIsDefaultError({ uri: locationUri })
    );
  }
  yield* deleteRecord(COLLECTION24, rkey, makePdsError24);
  return { uri: locationUri, rkey };
});

// src/mutations/funding.receipt/create.ts
import { Effect as Effect29 } from "effect";
import {
  $parse as $parse20
} from "@gainforest/generated/org/hypercerts/funding/receipt.defs";

// src/mutations/funding.receipt/utils/errors.ts
import { Data as Data10 } from "effect";
var FundingReceiptValidationError = class extends Data10.TaggedError(
  "FundingReceiptValidationError"
) {
};
var FundingReceiptPdsError = class extends Data10.TaggedError(
  "FundingReceiptPdsError"
) {
};

// src/mutations/funding.receipt/create.ts
var COLLECTION25 = "org.hypercerts.funding.receipt";
var makePdsError25 = (message, cause) => new FundingReceiptPdsError({ message, cause });
var makeValidationError20 = (message, cause) => new FundingReceiptValidationError({ message, cause });
var createFundingReceipt = (input) => Effect29.gen(function* () {
  const { rkey: inputRkey, ...inputData } = input;
  const candidate = {
    $type: COLLECTION25,
    ...inputData,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  yield* stubValidate(candidate, $parse20, makeValidationError20);
  const resolved = yield* resolveFileInputs(candidate);
  const record = yield* finalValidate(resolved, $parse20, makeValidationError20);
  const { uri, cid } = yield* createRecord(COLLECTION25, record, inputRkey, makePdsError25);
  const rkey = uri.split("/").pop();
  return {
    uri,
    cid,
    rkey,
    record
  };
});

// src/mutations/funding.config/create.ts
import { Effect as Effect30 } from "effect";
import {
  $parse as $parse21
} from "@gainforest/generated/app/bumicerts/funding/config.defs";

// src/mutations/funding.config/utils/errors.ts
import { Data as Data11 } from "effect";
var FundingConfigValidationError = class extends Data11.TaggedError(
  "FundingConfigValidationError"
) {
};
var FundingConfigNotFoundError = class extends Data11.TaggedError(
  "FundingConfigNotFoundError"
) {
};
var FundingConfigPdsError = class extends Data11.TaggedError(
  "FundingConfigPdsError"
) {
};

// src/mutations/funding.config/create.ts
var COLLECTION26 = "app.bumicerts.funding.config";
var makePdsError26 = (message, cause) => new FundingConfigPdsError({ message, cause });
var makeValidationError21 = (message, cause) => new FundingConfigValidationError({ message, cause });
var createFundingConfig = (input) => Effect30.gen(function* () {
  const { rkey: inputRkey, ...inputData } = input;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const candidate = {
    $type: COLLECTION26,
    ...inputData,
    createdAt: now,
    updatedAt: now
  };
  yield* stubValidate(candidate, $parse21, makeValidationError21);
  const resolved = yield* resolveFileInputs(candidate);
  const record = yield* finalValidate(resolved, $parse21, makeValidationError21);
  const { uri, cid } = yield* createRecord(COLLECTION26, record, inputRkey, makePdsError26);
  const rkey = uri.split("/").pop();
  return {
    uri,
    cid,
    rkey,
    record
  };
});

// src/mutations/funding.config/update.ts
import { Effect as Effect31 } from "effect";
import {
  $parse as $parse22
} from "@gainforest/generated/app/bumicerts/funding/config.defs";

// src/mutations/funding.config/utils/merge.ts
var REQUIRED_FIELDS5 = /* @__PURE__ */ new Set([
  "receivingWallet"
]);
var applyPatch5 = (existing, data, unset) => applyPatch(existing, data, unset, REQUIRED_FIELDS5);

// src/mutations/funding.config/update.ts
var COLLECTION27 = "app.bumicerts.funding.config";
var makePdsError27 = (message, cause) => new FundingConfigPdsError({ message, cause });
var makeValidationError22 = (message, cause) => new FundingConfigValidationError({ message, cause });
var updateFundingConfig = (input) => Effect31.gen(function* () {
  const { rkey } = input;
  const existing = yield* fetchRecord(
    COLLECTION27,
    rkey,
    makePdsError27
  );
  if (existing === null) {
    return yield* Effect31.fail(new FundingConfigNotFoundError({ rkey }));
  }
  const patched = applyPatch5(existing, input.data, input.unset);
  patched.$type = COLLECTION27;
  patched.createdAt = existing.createdAt;
  patched.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  yield* stubValidate(patched, $parse22, makeValidationError22);
  const resolved = yield* resolveFileInputs(patched);
  const record = yield* finalValidate(resolved, $parse22, makeValidationError22);
  const { uri, cid } = yield* putRecord(COLLECTION27, rkey, record, makePdsError27);
  return { uri, cid, rkey, record };
});

// src/mutations/funding.config/upsert.ts
import { Effect as Effect32 } from "effect";
import {
  $parse as $parse23
} from "@gainforest/generated/app/bumicerts/funding/config.defs";
var COLLECTION28 = "app.bumicerts.funding.config";
var makePdsError28 = (message, cause) => new FundingConfigPdsError({ message, cause });
var makeValidationError23 = (message, cause) => new FundingConfigValidationError({ message, cause });
var upsertFundingConfig = (input) => Effect32.gen(function* () {
  const { rkey: inputRkey, ...inputData } = input;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  if (inputRkey === void 0) {
    const candidate2 = { $type: COLLECTION28, ...inputData, createdAt: now, updatedAt: now };
    yield* stubValidate(candidate2, $parse23, makeValidationError23);
    const resolved2 = yield* resolveFileInputs(candidate2);
    const record2 = yield* finalValidate(resolved2, $parse23, makeValidationError23);
    const { uri: uri2, cid: cid2 } = yield* createRecord(COLLECTION28, record2, void 0, makePdsError28);
    const rkey = uri2.split("/").pop();
    return { uri: uri2, cid: cid2, rkey, record: record2, created: true };
  }
  const existing = yield* fetchRecord(
    COLLECTION28,
    inputRkey,
    makePdsError28
  );
  const createdAt = existing !== null ? existing.createdAt : now;
  const candidate = { $type: COLLECTION28, ...inputData, createdAt, updatedAt: now };
  yield* stubValidate(candidate, $parse23, makeValidationError23);
  const resolved = yield* resolveFileInputs(candidate);
  const record = yield* finalValidate(resolved, $parse23, makeValidationError23);
  const { uri, cid } = yield* putRecord(COLLECTION28, inputRkey, record, makePdsError28);
  return {
    uri,
    cid,
    rkey: inputRkey,
    record,
    created: existing === null
  };
});

// src/mutations/funding.config/delete.ts
import { Effect as Effect33 } from "effect";
var COLLECTION29 = "app.bumicerts.funding.config";
var makePdsError29 = (message, cause) => new FundingConfigPdsError({ message, cause });
var deleteFundingConfig = (input) => Effect33.gen(function* () {
  const { rkey } = input;
  const repo = (yield* AtprotoAgent).assertDid;
  const uri = `at://${repo}/${COLLECTION29}/${rkey}`;
  const existing = yield* fetchRecord(COLLECTION29, rkey, makePdsError29);
  if (existing === null) {
    return yield* Effect33.fail(new FundingConfigNotFoundError({ rkey }));
  }
  yield* deleteRecord(COLLECTION29, rkey, makePdsError29);
  return { uri, rkey };
});

// src/mutations/link.evm/create.ts
import { Effect as Effect34 } from "effect";
import {
  $parse as $parse24
} from "@gainforest/generated/app/bumicerts/link/evm.defs";

// src/mutations/link.evm/utils/errors.ts
import { Data as Data12 } from "effect";
var LinkEvmValidationError = class extends Data12.TaggedError(
  "LinkEvmValidationError"
) {
};
var LinkEvmPdsError = class extends Data12.TaggedError(
  "LinkEvmPdsError"
) {
};
var LinkEvmNotFoundError = class extends Data12.TaggedError(
  "LinkEvmNotFoundError"
) {
};

// src/mutations/link.evm/create.ts
var COLLECTION30 = "app.bumicerts.link.evm";
var makePdsError30 = (message, cause) => new LinkEvmPdsError({ message, cause });
var makeValidationError24 = (message, cause) => new LinkEvmValidationError({ message, cause });
var createLinkEvm = (input) => Effect34.gen(function* () {
  const { rkey: inputRkey, ...inputData } = input;
  const candidate = {
    $type: COLLECTION30,
    ...inputData,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  yield* stubValidate(candidate, $parse24, makeValidationError24);
  const resolved = yield* resolveFileInputs(candidate);
  const record = yield* finalValidate(resolved, $parse24, makeValidationError24);
  const { uri, cid } = yield* createRecord(COLLECTION30, record, inputRkey, makePdsError30);
  const rkey = uri.split("/").pop();
  return {
    uri,
    cid,
    rkey,
    record
  };
});

// src/mutations/link.evm/update.ts
import { Effect as Effect35 } from "effect";
import {
  $parse as $parse25
} from "@gainforest/generated/app/bumicerts/link/evm.defs";
var COLLECTION31 = "app.bumicerts.link.evm";
var makePdsError31 = (message, cause) => new LinkEvmPdsError({ message, cause });
var makeValidationError25 = (message, cause) => new LinkEvmValidationError({ message, cause });
var updateLinkEvm = (input) => Effect35.gen(function* () {
  const { rkey } = input;
  const existing = yield* fetchRecord(
    COLLECTION31,
    rkey,
    makePdsError31
  );
  if (existing === null) {
    return yield* Effect35.fail(new LinkEvmNotFoundError({ rkey }));
  }
  const patched = {
    ...existing,
    $type: COLLECTION31,
    // Allow setting name to undefined (unset) or a new string
    ...Object.prototype.hasOwnProperty.call(input.data, "name") ? { name: input.data.name } : {},
    ...input.unset?.includes("name") ? { name: void 0 } : {}
  };
  yield* stubValidate(patched, $parse25, makeValidationError25);
  const resolved = yield* resolveFileInputs(patched);
  const record = yield* finalValidate(resolved, $parse25, makeValidationError25);
  const { uri, cid } = yield* putRecord(COLLECTION31, rkey, record, makePdsError31);
  return { uri, cid, rkey, record };
});

// src/mutations/link.evm/delete.ts
import { Effect as Effect36 } from "effect";
var COLLECTION32 = "app.bumicerts.link.evm";
var makePdsError32 = (message, cause) => new LinkEvmPdsError({ message, cause });
var deleteLinkEvm = (input) => Effect36.gen(function* () {
  const { rkey } = input;
  const repo = (yield* AtprotoAgent).assertDid;
  const uri = `at://${repo}/${COLLECTION32}/${rkey}`;
  const existing = yield* fetchRecord(COLLECTION32, rkey, makePdsError32);
  if (existing === null) {
    return yield* Effect36.fail(new LinkEvmNotFoundError({ rkey }));
  }
  yield* deleteRecord(COLLECTION32, rkey, makePdsError32);
  return { uri, rkey };
});

// src/mutations/ac.multimedia/create.ts
import { Effect as Effect37 } from "effect";
import { $parse as $parse26 } from "@gainforest/generated/app/gainforest/ac/multimedia.defs";

// src/mutations/ac.multimedia/utils/errors.ts
import { Data as Data13 } from "effect";
var AcMultimediaValidationError = class extends Data13.TaggedError(
  "AcMultimediaValidationError"
) {
};
var AcMultimediaPdsError = class extends Data13.TaggedError(
  "AcMultimediaPdsError"
) {
};

// src/mutations/ac.multimedia/create.ts
var COLLECTION33 = "app.gainforest.ac.multimedia";
var MAX_IMAGE_BYTES = 100 * 1024 * 1024;
var ACCEPTED_IMAGE_MIMES = /* @__PURE__ */ new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "image/tiff",
  "image/tif",
  "image/gif",
  "image/bmp",
  "image/svg+xml"
]);
var makePdsError33 = (message, cause) => new AcMultimediaPdsError({ message, cause });
var makeValidationError26 = (message, cause) => new AcMultimediaValidationError({ message, cause });
var createAcMultimedia = (input) => Effect37.gen(function* () {
  const {
    imageFile,
    occurrenceRef,
    siteRef,
    subjectPart,
    subjectPartUri,
    subjectOrientation,
    caption,
    creator,
    createDate,
    format,
    accessUri,
    variantLiteral,
    rkey
  } = input;
  if (imageFile.size > MAX_IMAGE_BYTES) {
    return yield* Effect37.fail(
      new FileConstraintError({
        path: ["imageFile"],
        reason: `Image file size ${imageFile.size} B exceeds maximum ${MAX_IMAGE_BYTES} B (100 MB)`
      })
    );
  }
  if (!ACCEPTED_IMAGE_MIMES.has(imageFile.type)) {
    return yield* Effect37.fail(
      new FileConstraintError({
        path: ["imageFile"],
        reason: `MIME type "${imageFile.type}" is not accepted for ac.multimedia; allowed: ${[...ACCEPTED_IMAGE_MIMES].join(", ")}`
      })
    );
  }
  const agent = yield* AtprotoAgent;
  const fileBytes = fromSerializableFile(imageFile);
  const uploadResult = yield* Effect37.tryPromise({
    try: () => agent.uploadBlob(fileBytes, { encoding: imageFile.type }),
    catch: (cause) => new BlobUploadError({ message: "Failed to upload image blob", cause })
  });
  const raw = uploadResult.data.blob;
  const blobRef = { $type: "blob", ref: raw.ref, mimeType: raw.mimeType, size: raw.size };
  const createdAt = (/* @__PURE__ */ new Date()).toISOString();
  const candidate = {
    $type: COLLECTION33,
    file: blobRef,
    subjectPart,
    format: format ?? imageFile.type,
    createdAt,
    ...occurrenceRef !== void 0 && { occurrenceRef },
    ...siteRef !== void 0 && { siteRef },
    ...subjectPartUri !== void 0 && { subjectPartUri },
    ...subjectOrientation !== void 0 && { subjectOrientation },
    ...caption !== void 0 && { caption },
    ...creator !== void 0 && { creator },
    ...createDate !== void 0 && { createDate },
    ...accessUri !== void 0 && { accessUri },
    ...variantLiteral !== void 0 && { variantLiteral }
  };
  const record = yield* Effect37.try({
    try: () => $parse26(candidate),
    catch: (cause) => makeValidationError26(`ac.multimedia record failed lexicon validation: ${String(cause)}`, cause)
  });
  const { uri, cid } = yield* createRecord(COLLECTION33, record, rkey, makePdsError33);
  const assignedRkey = uri.split("/").pop() ?? rkey ?? "unknown";
  return {
    uri,
    cid,
    rkey: assignedRkey,
    record
  };
});

// src/mutations/dwc.occurrence/create.ts
import { Effect as Effect38 } from "effect";
import { $parse as $parse27 } from "@gainforest/generated/app/gainforest/dwc/occurrence.defs";

// src/mutations/dwc.occurrence/utils/errors.ts
import { Data as Data14 } from "effect";
var DwcOccurrenceValidationError = class extends Data14.TaggedError(
  "DwcOccurrenceValidationError"
) {
};
var DwcOccurrencePdsError = class extends Data14.TaggedError(
  "DwcOccurrencePdsError"
) {
};

// src/mutations/dwc.occurrence/create.ts
var COLLECTION34 = "app.gainforest.dwc.occurrence";
var makePdsError34 = (message, cause) => new DwcOccurrencePdsError({ message, cause });
var makeValidationError27 = (message, cause) => new DwcOccurrenceValidationError({ message, cause });
var createDwcOccurrence = (input) => Effect38.gen(function* () {
  const {
    scientificName,
    eventDate,
    decimalLatitude,
    decimalLongitude,
    basisOfRecord = "HumanObservation",
    vernacularName,
    recordedBy,
    locality,
    country,
    countryCode,
    occurrenceRemarks,
    habitat,
    samplingProtocol,
    kingdom = "Plantae",
    occurrenceID = crypto.randomUUID(),
    occurrenceStatus = "present",
    geodeticDatum = "EPSG:4326",
    license = "CC-BY-4.0",
    projectRef,
    rkey
  } = input;
  const createdAt = (/* @__PURE__ */ new Date()).toISOString();
  const candidate = {
    $type: COLLECTION34,
    scientificName,
    eventDate,
    decimalLatitude,
    decimalLongitude,
    basisOfRecord,
    occurrenceID,
    occurrenceStatus,
    geodeticDatum,
    license,
    kingdom,
    ...vernacularName !== void 0 ? { vernacularName } : {},
    ...recordedBy !== void 0 ? { recordedBy } : {},
    ...locality !== void 0 ? { locality } : {},
    ...country !== void 0 ? { country } : {},
    ...countryCode !== void 0 ? { countryCode } : {},
    ...occurrenceRemarks !== void 0 ? { occurrenceRemarks } : {},
    ...habitat !== void 0 ? { habitat } : {},
    ...samplingProtocol !== void 0 ? { samplingProtocol } : {},
    ...projectRef !== void 0 ? { projectRef } : {},
    createdAt
  };
  const record = yield* Effect38.try({
    try: () => $parse27(candidate),
    catch: (cause) => makeValidationError27(
      `dwc.occurrence record failed lexicon validation: ${String(cause)}`,
      cause
    )
  });
  const { uri, cid } = yield* createRecord(COLLECTION34, record, rkey, makePdsError34);
  const assignedRkey = uri.split("/").pop() ?? rkey ?? "unknown";
  return {
    uri,
    cid,
    rkey: assignedRkey,
    record
  };
});

// src/mutations/context.attachment/create.ts
import { Effect as Effect39 } from "effect";
import {
  $parse as $parse28,
  main as contextAttachmentSchema
} from "@gainforest/generated/org/hypercerts/context/attachment.defs";

// src/mutations/context.attachment/utils/errors.ts
import { Data as Data15 } from "effect";
var ContextAttachmentValidationError = class extends Data15.TaggedError(
  "ContextAttachmentValidationError"
) {
};
var ContextAttachmentNotFoundError = class extends Data15.TaggedError(
  "ContextAttachmentNotFoundError"
) {
};
var ContextAttachmentPdsError = class extends Data15.TaggedError(
  "ContextAttachmentPdsError"
) {
};

// src/mutations/context.attachment/create.ts
var COLLECTION35 = "org.hypercerts.context.attachment";
var BLOB_CONSTRAINTS10 = extractBlobConstraints(contextAttachmentSchema);
var makePdsError35 = (message, cause) => new ContextAttachmentPdsError({ message, cause });
var makeValidationError28 = (message, cause) => new ContextAttachmentValidationError({ message, cause });
var createContextAttachment = (input) => Effect39.gen(function* () {
  yield* validateFileConstraints(input, BLOB_CONSTRAINTS10);
  const { rkey: inputRkey, ...inputData } = input;
  const candidate = { $type: COLLECTION35, ...inputData, createdAt: (/* @__PURE__ */ new Date()).toISOString() };
  yield* stubValidate(candidate, $parse28, makeValidationError28);
  const resolved = yield* resolveFileInputs(candidate);
  const record = yield* finalValidate(resolved, $parse28, makeValidationError28);
  const { uri, cid } = yield* createRecord(COLLECTION35, record, inputRkey, makePdsError35);
  const rkey = uri.split("/").pop() ?? "";
  return { uri, cid, rkey, record };
});

// src/mutations/context.attachment/update.ts
import { Effect as Effect40 } from "effect";
import {
  $parse as $parse29,
  main as contextAttachmentSchema2
} from "@gainforest/generated/org/hypercerts/context/attachment.defs";

// src/mutations/context.attachment/utils/merge.ts
var REQUIRED_FIELDS6 = /* @__PURE__ */ new Set([
  "title"
]);
var applyPatch6 = (existing, data, unset) => applyPatch(existing, data, unset, REQUIRED_FIELDS6);

// src/mutations/context.attachment/update.ts
var COLLECTION36 = "org.hypercerts.context.attachment";
var BLOB_CONSTRAINTS11 = extractBlobConstraints(contextAttachmentSchema2);
var makePdsError36 = (message, cause) => new ContextAttachmentPdsError({ message, cause });
var makeValidationError29 = (message, cause) => new ContextAttachmentValidationError({ message, cause });
var updateContextAttachment = (input) => Effect40.gen(function* () {
  const { rkey } = input;
  yield* validateFileConstraints(input.data, BLOB_CONSTRAINTS11);
  const existing = yield* fetchRecord(
    COLLECTION36,
    rkey,
    makePdsError36
  );
  if (existing === null) {
    return yield* Effect40.fail(new ContextAttachmentNotFoundError({ rkey }));
  }
  const patched = applyPatch6(existing, input.data, input.unset);
  patched.$type = COLLECTION36;
  patched.createdAt = existing.createdAt;
  yield* stubValidate(patched, $parse29, makeValidationError29);
  const resolved = yield* resolveFileInputs(patched);
  const record = yield* finalValidate(resolved, $parse29, makeValidationError29);
  const { uri, cid } = yield* putRecord(COLLECTION36, rkey, record, makePdsError36);
  return { uri, cid, rkey, record };
});

// src/mutations/context.attachment/upsert.ts
import { Effect as Effect41 } from "effect";
import {
  $parse as $parse30,
  main as contextAttachmentSchema3
} from "@gainforest/generated/org/hypercerts/context/attachment.defs";
var COLLECTION37 = "org.hypercerts.context.attachment";
var BLOB_CONSTRAINTS12 = extractBlobConstraints(contextAttachmentSchema3);
var makePdsError37 = (message, cause) => new ContextAttachmentPdsError({ message, cause });
var makeValidationError30 = (message, cause) => new ContextAttachmentValidationError({ message, cause });
var upsertContextAttachment = (input) => Effect41.gen(function* () {
  yield* validateFileConstraints(input, BLOB_CONSTRAINTS12);
  const { rkey: inputRkey, ...inputData } = input;
  if (inputRkey === void 0) {
    const candidate2 = { $type: COLLECTION37, ...inputData, createdAt: (/* @__PURE__ */ new Date()).toISOString() };
    yield* stubValidate(candidate2, $parse30, makeValidationError30);
    const resolved2 = yield* resolveFileInputs(candidate2);
    const record2 = yield* finalValidate(resolved2, $parse30, makeValidationError30);
    const { uri: uri2, cid: cid2 } = yield* createRecord(COLLECTION37, record2, void 0, makePdsError37);
    const rkey = uri2.split("/").pop() ?? "";
    return { uri: uri2, cid: cid2, rkey, record: record2, created: true };
  }
  const existing = yield* fetchRecord(
    COLLECTION37,
    inputRkey,
    makePdsError37
  );
  const createdAt = existing !== null ? existing.createdAt : (/* @__PURE__ */ new Date()).toISOString();
  const candidate = { $type: COLLECTION37, ...inputData, createdAt };
  yield* stubValidate(candidate, $parse30, makeValidationError30);
  const resolved = yield* resolveFileInputs(candidate);
  const record = yield* finalValidate(resolved, $parse30, makeValidationError30);
  const { uri, cid } = yield* putRecord(COLLECTION37, inputRkey, record, makePdsError37);
  return {
    uri,
    cid,
    rkey: inputRkey,
    record,
    created: existing === null
  };
});

// src/mutations/context.attachment/delete.ts
import { Effect as Effect42 } from "effect";
var COLLECTION38 = "org.hypercerts.context.attachment";
var makePdsError38 = (message, cause) => new ContextAttachmentPdsError({ message, cause });
var deleteContextAttachment = (input) => Effect42.gen(function* () {
  const { rkey } = input;
  const repo = (yield* AtprotoAgent).assertDid;
  const uri = `at://${repo}/${COLLECTION38}/${rkey}`;
  const existing = yield* fetchRecord(COLLECTION38, rkey, makePdsError38);
  if (existing === null) {
    return yield* Effect42.fail(new ContextAttachmentNotFoundError({ rkey }));
  }
  yield* deleteRecord(COLLECTION38, rkey, makePdsError38);
  return { uri, rkey };
});

// src/mutations/dwc.measurement/create.ts
import { Effect as Effect43 } from "effect";
import { $parse as $parse31 } from "@gainforest/generated/app/gainforest/dwc/measurement.defs";

// src/mutations/dwc.measurement/utils/errors.ts
import { Data as Data16 } from "effect";
var DwcMeasurementValidationError = class extends Data16.TaggedError(
  "DwcMeasurementValidationError"
) {
};
var DwcMeasurementPdsError = class extends Data16.TaggedError(
  "DwcMeasurementPdsError"
) {
};

// src/mutations/dwc.measurement/create.ts
var COLLECTION39 = "app.gainforest.dwc.measurement";
var makePdsError39 = (message, cause) => new DwcMeasurementPdsError({ message, cause });
var makeValidationError31 = (message, cause) => new DwcMeasurementValidationError({ message, cause });
var createDwcMeasurement = (input) => Effect43.gen(function* () {
  const {
    occurrenceRef,
    flora,
    occurrenceID,
    measuredBy,
    measurementDate,
    measurementMethod,
    measurementRemarks,
    rkey
  } = input;
  const floraResult = {
    $type: "app.gainforest.dwc.measurement#floraMeasurement"
  };
  if (flora.dbh !== void 0) floraResult.dbh = flora.dbh;
  if (flora.totalHeight !== void 0) floraResult.totalHeight = flora.totalHeight;
  if (flora.basalDiameter !== void 0) floraResult.basalDiameter = flora.basalDiameter;
  if (flora.canopyCoverPercent !== void 0) floraResult.canopyCoverPercent = flora.canopyCoverPercent;
  const candidate = {
    $type: COLLECTION39,
    occurrenceRef,
    result: floraResult,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  if (occurrenceID !== void 0) candidate.occurrenceID = occurrenceID;
  if (measuredBy !== void 0) candidate.measuredBy = measuredBy;
  if (measurementDate !== void 0) candidate.measurementDate = measurementDate;
  if (measurementMethod !== void 0) candidate.measurementMethod = measurementMethod;
  if (measurementRemarks !== void 0) candidate.measurementRemarks = measurementRemarks;
  const record = yield* Effect43.try({
    try: () => $parse31(candidate),
    catch: (cause) => makeValidationError31(
      `dwc.measurement record failed lexicon validation: ${String(cause)}`,
      cause
    )
  });
  const { uri, cid } = yield* createRecord(COLLECTION39, record, rkey, makePdsError39);
  const assignedRkey = uri.split("/").pop() ?? rkey ?? "unknown";
  return {
    uri,
    cid,
    rkey: assignedRkey,
    record
  };
});

// src/blob/upload.ts
import { Effect as Effect44 } from "effect";
var uploadBlob = (input) => Effect44.gen(function* () {
  const agent = yield* AtprotoAgent;
  const { file, mimeType: override } = input;
  let data;
  let mimeType;
  if (isSerializableFile(file)) {
    data = fromSerializableFile(file);
    mimeType = override ?? file.type;
  } else if (isFileOrBlob(file)) {
    const buf = yield* Effect44.tryPromise({
      try: () => file.arrayBuffer(),
      catch: (e) => new BlobUploadError({ message: "Failed to read file data into ArrayBuffer", cause: e })
    });
    data = new Uint8Array(buf);
    mimeType = override ?? (file.type || "application/octet-stream");
  } else {
    return yield* Effect44.die(
      new Error("uploadBlob: input.file must be a File, Blob, or SerializableFile")
    );
  }
  const res = yield* Effect44.tryPromise({
    try: () => agent.uploadBlob(data, { encoding: mimeType }),
    catch: (e) => new BlobUploadError({ message: "PDS blob upload failed", cause: e })
  });
  const raw = res.data.blob;
  const plainBlobRef = {
    $type: "blob",
    ref: raw.ref,
    mimeType: raw.mimeType,
    size: raw.size
  };
  return { blobRef: plainBlobRef };
});

// src/namespace.ts
var mutations = {
  organization: {
    info: {
      create: createOrganizationInfo,
      update: updateOrganizationInfo,
      upsert: upsertOrganizationInfo
    },
    defaultSite: {
      set: setDefaultSite
    },
    layer: {
      create: createLayer,
      update: updateLayer,
      upsert: upsertLayer,
      delete: deleteLayer
    },
    recordings: {
      audio: {
        create: createAudioRecording,
        update: updateAudioRecording,
        upsert: upsertAudioRecording,
        delete: deleteAudioRecording
      }
    }
  },
  claim: {
    activity: {
      create: createClaimActivity,
      update: updateClaimActivity,
      upsert: upsertClaimActivity,
      delete: deleteClaimActivity
    },
    rights: {
      create: createClaimRights,
      update: updateClaimRights,
      upsert: upsertClaimRights,
      delete: deleteClaimRights
    }
  },
  certified: {
    location: {
      create: createCertifiedLocation,
      update: updateCertifiedLocation,
      upsert: upsertCertifiedLocation,
      delete: deleteCertifiedLocation
    }
  },
  funding: {
    receipt: {
      create: createFundingReceipt
    },
    config: {
      create: createFundingConfig,
      update: updateFundingConfig,
      upsert: upsertFundingConfig,
      delete: deleteFundingConfig
    }
  },
  link: {
    evm: {
      create: createLinkEvm,
      update: updateLinkEvm,
      delete: deleteLinkEvm
    }
  },
  ac: {
    multimedia: {
      create: createAcMultimedia
    }
  },
  context: {
    attachment: {
      create: createContextAttachment,
      update: updateContextAttachment,
      upsert: upsertContextAttachment,
      delete: deleteContextAttachment
    }
  },
  dwc: {
    occurrence: {
      create: createDwcOccurrence
    },
    measurement: {
      create: createDwcMeasurement
    }
  },
  blob: {
    upload: uploadBlob
  }
};

// src/result.ts
var ok = (data) => ({
  success: true,
  data
});
var err = (code, message, issues) => ({
  success: false,
  code,
  message,
  ...issues !== void 0 && { issues }
});

// src/error.ts
var MutationError = class _MutationError extends Error {
  code;
  /**
   * Structured validation issues. Present when the failure originated from
   * a lexicon validation error (e.g. code === "INVALID_RECORD").
   * Undefined for auth, network, and PDS errors.
   */
  issues;
  constructor(code, message, issues) {
    super(message);
    this.name = "MutationError";
    this.code = code;
    if (issues !== void 0) this.issues = issues;
    Object.setPrototypeOf(this, new.target.prototype);
  }
  /**
   * Type guard — narrows an unknown catch value to MutationError.
   * Useful in onError callbacks where the type is unknown.
   *
   * @example
   * onError: (e) => {
   *   if (MutationError.is(e)) {
   *     console.log(e.code); // typed as string
   *   }
   * }
   */
  static is(value) {
    return value instanceof _MutationError;
  }
  /**
   * Narrowed type guard — checks both instanceof and a specific code value.
   *
   * @example
   * if (MutationError.isCode(e, "UNAUTHORIZED")) {
   *   redirectToLogin();
   * }
   */
  static isCode(value, code) {
    return _MutationError.is(value) && value.code === code;
  }
};

// src/utils/formatError.ts
function extractField(path) {
  const first = path[0];
  return typeof first === "string" ? first : void 0;
}
function camelToLabel(field) {
  return field.replace(/([A-Z])/g, " $1").replace(/^(.)/, (s) => s.toUpperCase()).trim();
}
function resolveLabel(field, fieldLabels) {
  if (!field) return "This field";
  return fieldLabels?.[field] ?? camelToLabel(field);
}
function formatIssue(issue, fieldLabels) {
  const field = extractField(issue.path);
  const label = resolveLabel(field, fieldLabels);
  switch (issue.code) {
    case "too_small": {
      const min = issue.minimum ?? "?";
      const isChars = issue.type === "string";
      return {
        userMessage: isChars ? `${label} must be at least ${min} characters` : `${label} must be at least ${min}`,
        developerMessage: issue.message,
        field,
        constraint: { type: "minLength", expected: issue.minimum, actual: issue.actual }
      };
    }
    case "too_big": {
      const max = issue.maximum ?? "?";
      const isChars = issue.type === "string";
      return {
        userMessage: isChars ? `${label} must be no more than ${max} characters` : `${label} must be no more than ${max}`,
        developerMessage: issue.message,
        field,
        constraint: { type: "maxLength", expected: issue.maximum, actual: issue.actual }
      };
    }
    case "required_key": {
      const missingLabel = issue.key !== void 0 ? resolveLabel(String(issue.key), fieldLabels) : label;
      return {
        userMessage: `${missingLabel} is required`,
        developerMessage: issue.message,
        field,
        constraint: { type: "required" }
      };
    }
    case "invalid_format":
      return {
        userMessage: `${label} has an invalid format`,
        developerMessage: issue.message,
        field,
        constraint: { type: "format", expected: issue.format }
      };
    case "invalid_type":
      return {
        userMessage: `${label} has an unexpected type`,
        developerMessage: issue.message,
        field,
        constraint: { type: "type", expected: issue.expected }
      };
    case "invalid_value":
      return {
        userMessage: `${label} has an invalid value`,
        developerMessage: issue.message,
        field,
        constraint: { type: "value", expected: issue.values }
      };
    default:
      return {
        userMessage: `There's an issue with ${label.toLowerCase()}`,
        developerMessage: issue.message,
        field,
        constraint: { type: "other" }
      };
  }
}
function parseMessageFallback(message) {
  const tooSmall = message.match(
    /too small \(minimum (\d+)\) at \$\.(\w+)/
  );
  if (tooSmall) {
    return { kind: "too_small", field: tooSmall[2], min: parseInt(tooSmall[1], 10) };
  }
  const tooBig = message.match(
    /too big \(maximum (\d+)\) at \$\.(\w+)/
  );
  if (tooBig) {
    return { kind: "too_big", field: tooBig[2], max: parseInt(tooBig[1], 10) };
  }
  const required = message.match(/Missing required key "(\w+)"/);
  if (required) {
    return { kind: "required", field: required[1] };
  }
  return null;
}
function fallbackFormattedError(error, fieldLabels) {
  const parsed = parseMessageFallback(error.message);
  if (parsed) {
    const label = resolveLabel(parsed.field, fieldLabels);
    switch (parsed.kind) {
      case "too_small":
        return [{
          userMessage: `${label} must be at least ${parsed.min} characters`,
          developerMessage: error.message,
          field: parsed.field,
          constraint: { type: "minLength", expected: parsed.min }
        }];
      case "too_big":
        return [{
          userMessage: `${label} must be no more than ${parsed.max} characters`,
          developerMessage: error.message,
          field: parsed.field,
          constraint: { type: "maxLength", expected: parsed.max }
        }];
      case "required":
        return [{
          userMessage: `${label} is required`,
          developerMessage: error.message,
          field: parsed.field,
          constraint: { type: "required" }
        }];
    }
  }
  const genericMessage = error.code === "UNAUTHORIZED" ? "You're not authorized to perform this action." : error.code === "SESSION_EXPIRED" ? "Your session has expired. Please log in again." : error.code === "NOT_FOUND" ? "The requested item was not found." : error.code === "ALREADY_EXISTS" ? "This record already exists." : error.code === "FILE_CONSTRAINT" ? "The uploaded file doesn't meet the requirements." : error.code === "BLOB_UPLOAD_ERROR" ? "Failed to upload the file. Please try again." : error.code === "PDS_ERROR" ? "The server rejected this request. Please try again." : "Something went wrong. Please try again.";
  return [{
    userMessage: genericMessage,
    developerMessage: error.message
  }];
}
function formatMutationError(error, fieldLabels) {
  if (error.issues && error.issues.length > 0) {
    return error.issues.map((issue) => formatIssue(issue, fieldLabels));
  }
  return fallbackFormattedError(error, fieldLabels);
}
function formatMutationErrorMessage(error, fieldLabels) {
  return formatMutationError(error, fieldLabels).map((e) => e.userMessage).join(". ");
}

// src/adapt.ts
var adapt = (action) => {
  return async (input) => {
    const result = await action(input);
    if (!result.success) {
      throw new MutationError(result.code, result.message, result.issues);
    }
    return result.data;
  };
};

// src/layers/credential.ts
import { Data as Data17, Effect as Effect45, Layer } from "effect";
import { CredentialSession, Agent } from "@atproto/api";
var CredentialLoginError = class extends Data17.TaggedError("CredentialLoginError") {
};
function makeCredentialAgentLayer(config) {
  return Layer.effect(
    AtprotoAgent,
    Effect45.gen(function* () {
      const session = new CredentialSession(new URL(`https://${config.service}`));
      yield* Effect45.tryPromise({
        try: () => session.login({
          identifier: config.identifier,
          password: config.password
        }),
        catch: (cause) => new CredentialLoginError({
          message: "ATProto credential login failed",
          cause
        })
      });
      return new Agent(session);
    })
  );
}
export {
  AcMultimediaPdsError,
  AcMultimediaValidationError,
  AtprotoAgent,
  AudioRecordingNotFoundError,
  AudioRecordingPdsError,
  AudioRecordingValidationError,
  BlobUploadError,
  CertifiedLocationIsDefaultError,
  CertifiedLocationNotFoundError,
  CertifiedLocationPdsError,
  CertifiedLocationValidationError,
  ClaimActivityNotFoundError,
  ClaimActivityPdsError,
  ClaimActivityValidationError,
  ClaimRightsNotFoundError,
  ClaimRightsPdsError,
  ClaimRightsValidationError,
  ContextAttachmentNotFoundError,
  ContextAttachmentPdsError,
  ContextAttachmentValidationError,
  CredentialLoginError,
  DefaultSiteLocationNotFoundError,
  DefaultSitePdsError,
  DefaultSiteValidationError,
  DwcMeasurementPdsError,
  DwcMeasurementValidationError,
  DwcOccurrencePdsError,
  DwcOccurrenceValidationError,
  FileConstraintError,
  FundingConfigNotFoundError,
  FundingConfigPdsError,
  FundingConfigValidationError,
  FundingReceiptPdsError,
  FundingReceiptValidationError,
  GeoJsonProcessingError,
  GeoJsonValidationError,
  HECTARES_PER_SQUARE_METER,
  LayerNotFoundError,
  LayerPdsError,
  LayerValidationError,
  LinkEvmNotFoundError,
  LinkEvmPdsError,
  LinkEvmValidationError,
  MutationError,
  OrganizationInfoAlreadyExistsError,
  OrganizationInfoNotFoundError,
  OrganizationInfoPdsError,
  OrganizationInfoValidationError,
  adapt,
  computePolygonMetrics,
  err,
  extractBlobConstraints,
  extractLineStringFeatures,
  extractPointFeatures,
  extractPolygonFeatures,
  formatMutationError,
  formatMutationErrorMessage,
  fromSerializableFile,
  isAnyBlobRef,
  makeCredentialAgentLayer,
  mimeMatches,
  mutations,
  normalizeBlobRef,
  ok,
  toFeatureCollection,
  toSerializableFile,
  validateGeojsonOrThrow
};
//# sourceMappingURL=index.js.map