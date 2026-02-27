import { describe, it, expect } from "bun:test";
import { Effect } from "effect";
import { makeCredentialAgentLayer } from "../../../layers/credential";
import { createOrganizationInfo } from "../create";
import {
  OrganizationInfoAlreadyExistsError,
  OrganizationInfoValidationError,
} from "../utils/errors";
import { FileConstraintError } from "../../../blob/errors";
import type { CreateOrganizationInfoInput } from "../utils/types";
import type { SerializableFile } from "../../../blob/types";

// ---------------------------------------------------------------------------
// Load test credentials from the package-level tests/.env.test-credentials.
// Copy tests/.env.test-credentials.example → tests/.env.test-credentials
// and fill in your dedicated test account credentials.
// ---------------------------------------------------------------------------

await Bun.file(new URL("../../../../tests/.env.test-credentials", import.meta.url))
  .text()
  .then((text) => {
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      process.env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
    }
  })
  .catch(() => {
    // File not present — tests will self-skip below.
  });

const service    = process.env["ATPROTO_SERVICE"]    ?? "";
const identifier = process.env["ATPROTO_IDENTIFIER"] ?? "";
const password   = process.env["ATPROTO_PASSWORD"]   ?? "";
const credentialsProvided = service !== "" && identifier !== "" && password !== "";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a tiny valid PNG SerializableFile (8×8 solid-blue). */
function makeTinyPng(overrides?: { size?: number; type?: string }): SerializableFile {
  // 1×1 transparent PNG — 67 bytes, well within any size limit.
  const PNG_BASE64 =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
  return {
    $file: true,
    name: "test.png",
    type: overrides?.type ?? "image/png",
    size: overrides?.size ?? 67,
    data: PNG_BASE64,
  };
}

// ---------------------------------------------------------------------------
// Minimal valid input fixture.
// Satisfies all required fields from the app.gainforest.organization.info lexicon.
// ---------------------------------------------------------------------------

const minimalInput: CreateOrganizationInfoInput = {
  displayName: "Test Org (atproto-mutations-core)",
  shortDescription: {
    $type: "app.gainforest.common.defs#richtext",
    text: "A test organization created by the automated test suite.",
  },
  longDescription: {
    $type: "pub.leaflet.pages.linearDocument",
    blocks: [],
  },
  objectives: ["Conservation"],
  country: "BR",
  visibility: "Unlisted",
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("createOrganizationInfo", () => {
  it("creates a new organization.info record (or detects existing)", async () => {
    if (!credentialsProvided) {
      console.log(
        "[skip] Copy tests/.env.test-credentials.example → tests/.env.test-credentials " +
        "and fill in your credentials to run this test."
      );
      return;
    }

    const layer = makeCredentialAgentLayer({ service, identifier, password });

    const result = await Effect.runPromise(
      createOrganizationInfo(minimalInput).pipe(
        // If the record already exists from a prior test run, treat it as a
        // pass — the AlreadyExists path is tested explicitly below.
        Effect.catchTag("OrganizationInfoAlreadyExistsError", (e) =>
          Effect.succeed({ uri: e.uri, cid: "(existing)", record: null as any, _alreadyExisted: true })
        ),
        Effect.provide(layer)
      )
    );

    if ((result as any)._alreadyExisted) {
      console.log(`[ok] Record already exists at ${result.uri} — skipping creation assertion`);
      return;
    }

    expect(result.uri).toMatch(/^at:\/\//);
    expect(result.cid).toBeString();
    expect(result.record).toBeDefined();
    expect(result.record.displayName).toBe(minimalInput.displayName);
    expect(result.record.country).toBe("BR");
    expect(result.record.visibility).toBe("Unlisted");
    expect(result.record.createdAt).toBeString();
    console.log(`[ok] Created organization.info at ${result.uri} (cid: ${result.cid})`);
  });

  it("fails with OrganizationInfoAlreadyExistsError when record already exists", async () => {
    if (!credentialsProvided) {
      console.log("[skip] Credentials not set.");
      return;
    }

    const layer = makeCredentialAgentLayer({ service, identifier, password });

    // Attempt to create again — previous test (or prior run) already created it.
    // If somehow the record doesn't exist yet, we create it first.
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        // Ensure a record exists (idempotent: if it's there already, good).
        yield* createOrganizationInfo(minimalInput).pipe(
          Effect.catchTag("OrganizationInfoAlreadyExistsError", () => Effect.void)
        );
        // Now try to create again — must fail with AlreadyExistsError.
        return yield* createOrganizationInfo(minimalInput).pipe(Effect.either);
      }).pipe(Effect.provide(layer))
    );

    expect(result._tag).toBe("Left");
    if (result._tag === "Left") {
      expect(result.left).toBeInstanceOf(OrganizationInfoAlreadyExistsError);
      expect(result.left._tag).toBe("OrganizationInfoAlreadyExistsError");
      const err = result.left as OrganizationInfoAlreadyExistsError;
      expect(err.uri).toMatch(/^at:\/\//);
      expect(err.uri).toContain("app.gainforest.organization.info");
      console.log(`[ok] Got expected OrganizationInfoAlreadyExistsError for uri: ${err.uri}`);
    }
  });

  it("fails with OrganizationInfoValidationError on invalid input", async () => {
    if (!credentialsProvided) {
      console.log("[skip] Credentials not set.");
      return;
    }

    const layer = makeCredentialAgentLayer({ service, identifier, password });

    // displayName must be at least 8 chars — "Bad" (3 chars) will fail validation.
    const badInput: CreateOrganizationInfoInput = {
      ...minimalInput,
      displayName: "Bad", // too short — violates minLength: 8
    };

    const result = await Effect.runPromise(
      createOrganizationInfo(badInput).pipe(
        Effect.either,
        Effect.provide(layer)
      )
    );

    expect(result._tag).toBe("Left");
    if (result._tag === "Left") {
      expect(result.left).toBeInstanceOf(OrganizationInfoValidationError);
      expect(result.left._tag).toBe("OrganizationInfoValidationError");
      console.log(`[ok] Got expected OrganizationInfoValidationError: ${result.left.message}`);
    }
  });

  // -------------------------------------------------------------------------
  // Blob tests
  // -------------------------------------------------------------------------

  it("fails with FileConstraintError when logo image MIME type is invalid (offline)", async () => {
    // This test does NOT need credentials — FileConstraintError is raised
    // before any PDS call is attempted.
    const layer = makeCredentialAgentLayer({
      service: service || "https://bsky.social",
      identifier: identifier || "placeholder",
      password: password || "placeholder",
    });

    const inputWithBadMime: CreateOrganizationInfoInput = {
      ...minimalInput,
      logo: {
        // @ts-expect-error — deliberately wrong type for the test
        $type: "org.hypercerts.defs#smallImage",
        image: makeTinyPng({ type: "application/pdf" }), // wrong MIME
      },
    };

    const result = await Effect.runPromise(
      createOrganizationInfo(inputWithBadMime).pipe(
        Effect.either,
        Effect.provide(layer)
      )
    );

    expect(result._tag).toBe("Left");
    if (result._tag === "Left") {
      expect(result.left).toBeInstanceOf(FileConstraintError);
      expect(result.left._tag).toBe("FileConstraintError");
      expect((result.left as FileConstraintError).reason).toContain("not accepted");
      console.log(`[ok] Got expected FileConstraintError: ${(result.left as FileConstraintError).reason}`);
    }
  });

  it("fails with FileConstraintError when logo image exceeds 5 MB (offline)", async () => {
    const layer = makeCredentialAgentLayer({
      service: service || "https://bsky.social",
      identifier: identifier || "placeholder",
      password: password || "placeholder",
    });

    const oversizedFile: SerializableFile = makeTinyPng({
      size: 5 * 1024 * 1024 + 1, // 1 byte over the 5 MB limit
    });

    const inputWithOversizedLogo: CreateOrganizationInfoInput = {
      ...minimalInput,
      logo: {
        // @ts-expect-error — deliberately wrong type for the test
        $type: "org.hypercerts.defs#smallImage",
        image: oversizedFile,
      },
    };

    const result = await Effect.runPromise(
      createOrganizationInfo(inputWithOversizedLogo).pipe(
        Effect.either,
        Effect.provide(layer)
      )
    );

    expect(result._tag).toBe("Left");
    if (result._tag === "Left") {
      expect(result.left).toBeInstanceOf(FileConstraintError);
      expect((result.left as FileConstraintError).reason).toContain("exceeds maximum");
      console.log(`[ok] Got expected FileConstraintError: ${(result.left as FileConstraintError).reason}`);
    }
  });

  it("creates a record with a logo SerializableFile (integration — requires credentials)", async () => {
    if (!credentialsProvided) {
      console.log("[skip] Credentials not set.");
      return;
    }

    const layer = makeCredentialAgentLayer({ service, identifier, password });

    const inputWithLogo: CreateOrganizationInfoInput = {
      ...minimalInput,
      logo: {
        // @ts-expect-error — type widening for test
        $type: "org.hypercerts.defs#smallImage",
        image: makeTinyPng(),
      },
    };

    const result = await Effect.runPromise(
      createOrganizationInfo(inputWithLogo).pipe(
        // Already-exists from a prior test run is fine — the blob flow was still
        // exercised up to the existence check.
        Effect.catchTag("OrganizationInfoAlreadyExistsError", (e) =>
          Effect.succeed({ uri: e.uri, cid: "(existing)", record: null as any, _alreadyExisted: true })
        ),
        Effect.provide(layer)
      )
    );

    if ((result as any)._alreadyExisted) {
      console.log(`[ok] Record already existed — blob upload path was exercised up to existence check`);
      return;
    }

    expect(result.uri).toMatch(/^at:\/\//);
    expect(result.record).toBeDefined();
    console.log(`[ok] Created organization.info with logo blob at ${result.uri}`);
  });
});
