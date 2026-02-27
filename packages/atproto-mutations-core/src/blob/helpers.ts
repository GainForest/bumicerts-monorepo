import { Effect } from "effect";
import { CID } from "@atproto/lex-data";
import { AtprotoAgent } from "../services/AtprotoAgent";
import {
  type FileOrBlobRef,
  type SerializableFile,
  isSerializableFile,
  isFileOrBlob,
  isBlobRef,
  isAnyBlobRef,
  normalizeBlobRef,
  fromSerializableFile,
} from "./types";
import { type BlobConstraint, mimeMatches } from "./introspect";
import { FileConstraintError, BlobUploadError } from "./errors";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Extract {size, type} from any FileOrBlobRef variant, or null for a BlobRef */
function getFileMeta(v: FileOrBlobRef): { size: number; type: string } | null {
  if (isSerializableFile(v)) return { size: v.size, type: v.type };
  if (isFileOrBlob(v))
    return { size: v.size, type: v.type || "application/octet-stream" };
  // Both @atproto/lex plain BlobRefs and @atproto/lexicon class BlobRefs are skipped
  if (isAnyBlobRef(v)) return null;
  return null; // unknown — skip
}

/**
 * Navigate an object graph by path segments.
 * The special segment "[]" means the current value is an array — we return the
 * array itself; the caller must iterate when validating array-typed blob fields.
 */
function getValueAtPath(obj: unknown, path: string[]): unknown {
  let cur = obj;
  for (const key of path) {
    if (cur == null || typeof cur !== "object") return undefined;
    if (key === "[]") return cur; // caller handles iteration
    cur = (cur as Record<string, unknown>)[key];
  }
  return cur;
}

// ---------------------------------------------------------------------------
// validateFileConstraints
// ---------------------------------------------------------------------------

/**
 * Check every FileOrBlobRef value in `input` against the pre-extracted
 * `constraints` from the target lexicon schema.
 *
 * Fails fast on the first violated constraint with a `FileConstraintError`.
 * BlobRefs are skipped (already uploaded — constraints no longer apply).
 * Undefined / null values are skipped (optional fields).
 *
 * This should run **before** any PDS call, including the stub-validation pass.
 */
export const validateFileConstraints = <T extends object>(
  input: T,
  constraints: BlobConstraint[]
): Effect.Effect<void, FileConstraintError> =>
  Effect.try({
    try: () => {
      for (const c of constraints) {
        const raw = getValueAtPath(input, c.path);
        if (raw === undefined || raw === null) continue;

        // If the path ends with "[]" the value is an array — validate each element.
        const values: unknown[] = Array.isArray(raw) ? raw : [raw];

        for (const value of values) {
          const meta = getFileMeta(value as FileOrBlobRef);
          if (!meta) continue; // BlobRef — skip

          if (c.maxSize !== undefined && meta.size > c.maxSize) {
            throw new FileConstraintError({
              path: c.path,
              reason: `File size ${meta.size} B exceeds maximum ${c.maxSize} B`,
            });
          }
          if (c.accept && c.accept.length > 0) {
            const ok = c.accept.some((pattern) => mimeMatches(meta.type, pattern));
            if (!ok) {
              throw new FileConstraintError({
                path: c.path,
                reason: `MIME type "${meta.type}" is not accepted; allowed: ${c.accept.join(", ")}`,
              });
            }
          }
        }
      }
    },
    catch: (e) =>
      e instanceof FileConstraintError
        ? e
        : new FileConstraintError({ path: [], reason: String(e) }),
  });

// ---------------------------------------------------------------------------
// stubBlobRefs
// ---------------------------------------------------------------------------

/**
 * A pre-parsed CID object (not a plain $link string) that isBlobRef() accepts.
 * This is the CID for a known raw-block hash, produced by raw-codec + sha2-256.
 * It must be a real CID _instance_ because @atproto/lex's isBlobRef checks
 * `ifCid(ref)` which requires an actual CID object, not a `{ $link: "..." }` plain object.
 */
const DUMMY_CID = CID.parse("bafkreihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku");

function makeDummyBlobRef(mime: string, size: number): object {
  return {
    $type: "blob",
    ref: DUMMY_CID,
    mimeType: mime,
    size,
  };
}

/**
 * Recursively replace every File / Blob / SerializableFile in `input` with a
 * structurally valid (but fake) BlobRef, so the record can be passed through
 * `$parse` without uploading anything.
 *
 * Existing BlobRefs are left untouched.
 * Call this before the stub-`$parse` step to catch non-blob lexicon errors
 * without wasting bandwidth on uploads.
 */
export function stubBlobRefs<T>(input: T): T {
  if (input == null) return input;

  // Serialize file types → dummy BlobRef
  if (isSerializableFile(input as unknown)) {
    const sf = input as unknown as SerializableFile;
    return makeDummyBlobRef(sf.type, sf.size) as unknown as T;
  }
  if (isFileOrBlob(input as unknown)) {
    const f = input as unknown as File | Blob;
    return makeDummyBlobRef(f.type || "application/octet-stream", f.size) as unknown as T;
  }
  // Already a real BlobRef (plain-object form) — pass through
  if (isBlobRef(input as unknown)) return input;
  // @atproto/lexicon class BlobRef (returned by @atproto/api when reading records) —
  // normalize to a plain-object BlobRef that $parse accepts, then pass through
  if (isAnyBlobRef(input as unknown)) {
    return normalizeBlobRef(input as unknown) as T;
  }

  // Array — recurse into elements
  if (Array.isArray(input)) return input.map(stubBlobRefs) as unknown as T;

  // Plain object — recurse into values
  if (typeof input === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input as object)) {
      out[k] = stubBlobRefs(v);
    }
    return out as T;
  }

  return input;
}

// ---------------------------------------------------------------------------
// resolveFileInputs — upload all files in parallel
// ---------------------------------------------------------------------------

/** Upload a single File | Blob | SerializableFile → real BlobRef */
function uploadSingle(
  file: File | Blob | SerializableFile
): Effect.Effect<object, BlobUploadError, AtprotoAgent> {
  return Effect.gen(function* () {
    const agent = yield* AtprotoAgent;

    let data: Uint8Array;
    let mimeType: string;

    if (isSerializableFile(file)) {
      data = fromSerializableFile(file);
      mimeType = file.type;
    } else {
      const buf = yield* Effect.tryPromise({
        try: () => (file as File | Blob).arrayBuffer(),
        catch: (e) =>
          new BlobUploadError({ message: "Failed to read file data into ArrayBuffer", cause: e }),
      });
      data = new Uint8Array(buf);
      mimeType = (file as File | Blob).type || "application/octet-stream";
    }

    const res = yield* Effect.tryPromise({
      try: () => agent.uploadBlob(data, { encoding: mimeType }),
      catch: (e) => new BlobUploadError({ message: "PDS blob upload failed", cause: e }),
    });

    // agent.uploadBlob returns a @atproto/lexicon BlobRef class instance.
    // @atproto/lex's isBlobRef rejects class instances — it requires a plain object
    // with { $type: "blob", ref: <CID instance>, mimeType, size }.
    // The @atproto/lexicon BlobRef stores the CID in `.ref` — we can re-wrap it.
    const raw = res.data.blob as { ref: unknown; mimeType: string; size: number };
    const plainBlobRef = {
      $type: "blob" as const,
      ref: raw.ref,      // This is a real CID instance — isBlobRef accepts it
      mimeType: raw.mimeType,
      size: raw.size,
    };

    return plainBlobRef as object;
  });
}

/**
 * Recursively walk `input`, upload every File / Blob / SerializableFile in
 * parallel, and return a new object tree where all file inputs have been
 * replaced with the real BlobRefs returned by the PDS.
 *
 * Existing BlobRefs are returned as-is.
 * Uploads run with unbounded concurrency — callers should ensure the
 * AtprotoAgent's underlying HTTP client handles connection pooling.
 */
export function resolveFileInputs<T>(
  input: T
): Effect.Effect<T, BlobUploadError, AtprotoAgent> {
  if (input == null) return Effect.succeed(input);

  // Already a BlobRef (either @atproto/lex plain-object or @atproto/lexicon class instance)
  // — normalize to a plain-object BlobRef that $parse accepts and pass through unchanged.
  if (isAnyBlobRef(input as unknown)) {
    return Effect.succeed(normalizeBlobRef(input as unknown) as T);
  }

  // Upload individual files
  if (isSerializableFile(input as unknown) || isFileOrBlob(input as unknown)) {
    return uploadSingle(input as unknown as File | Blob | SerializableFile) as Effect.Effect<
      T,
      BlobUploadError,
      AtprotoAgent
    >;
  }

  // Array — upload all elements in parallel
  if (Array.isArray(input)) {
    return Effect.all(input.map(resolveFileInputs), {
      concurrency: "unbounded",
    }) as Effect.Effect<T, BlobUploadError, AtprotoAgent>;
  }

  // Object — upload all values in parallel, rebuild
  if (typeof input === "object") {
    const entries = Object.entries(input as object);
    return Effect.all(
      entries.map(([k, v]) => resolveFileInputs(v).pipe(Effect.map((r) => [k, r] as const))),
      { concurrency: "unbounded" }
    ).pipe(Effect.map((pairs) => Object.fromEntries(pairs) as T));
  }

  return Effect.succeed(input);
}
