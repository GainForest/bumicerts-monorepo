import { describe, it, expect } from "bun:test";
import { Effect } from "effect";
import { makeCredentialAgentLayer } from "../../../layers/credential";
import { createOrganizationInfo } from "../create";
import { updateOrganizationInfo } from "../update";
import {
  OrganizationInfoNotFoundError,
  OrganizationInfoValidationError,
} from "../utils/errors";
import { FileConstraintError } from "../../../blob/errors";
import type { CreateOrganizationInfoInput } from "../utils/types";
import type { SerializableFile } from "../../../blob/types";

// ---------------------------------------------------------------------------
// Credentials
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
  .catch(() => {});

const service    = process.env["ATPROTO_SERVICE"]    ?? "";
const identifier = process.env["ATPROTO_IDENTIFIER"] ?? "";
const password   = process.env["ATPROTO_PASSWORD"]   ?? "";
const credentialsProvided = service !== "" && identifier !== "" && password !== "";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTinyPng(overrides?: { size?: number; type?: string }): SerializableFile {
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
// Fixture
// ---------------------------------------------------------------------------

const baseInput: CreateOrganizationInfoInput = {
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

describe("updateOrganizationInfo", () => {
  it("updates an existing record with partial data fields", async () => {
    if (!credentialsProvided) {
      console.log(
        "[skip] Copy tests/.env.test-credentials.example → tests/.env.test-credentials " +
        "and fill in your credentials to run this test."
      );
      return;
    }

    const layer = makeCredentialAgentLayer({ service, identifier, password });

    // Ensure the record exists before attempting an update.
    await Effect.runPromise(
      createOrganizationInfo(baseInput).pipe(
        Effect.catchTag("OrganizationInfoAlreadyExistsError", () => Effect.void),
        Effect.provide(layer)
      )
    );

    // Patch only the fields we want to change.
    const result = await Effect.runPromise(
      updateOrganizationInfo({
        data: {
          displayName: "Test Org — Updated Name!!",
          objectives: ["Conservation", "Research"],
          website: "https://example.com",
        },
      }).pipe(Effect.provide(layer))
    );

    expect(result.uri).toMatch(/^at:\/\//);
    expect(result.cid).toBeString();
    expect(result.record.displayName).toBe("Test Org — Updated Name!!");
    expect(result.record.objectives).toContain("Research");
    expect(result.record.website).toBe("https://example.com");
    // createdAt must be preserved from original record (not reset)
    expect(result.record.createdAt).toBeString();
    // country must be preserved from original (not in patch)
    expect(result.record.country).toBe("BR");
    console.log(`[ok] Updated organization.info at ${result.uri} (cid: ${result.cid})`);
  });

  it("preserves createdAt from the original record across updates", async () => {
    if (!credentialsProvided) {
      console.log("[skip] Credentials not set.");
      return;
    }

    const layer = makeCredentialAgentLayer({ service, identifier, password });

    await Effect.runPromise(
      createOrganizationInfo(baseInput).pipe(
        Effect.catchTag("OrganizationInfoAlreadyExistsError", () => Effect.void),
        Effect.provide(layer)
      )
    );

    const before = await Effect.runPromise(
      updateOrganizationInfo({ data: { displayName: "Test Org — Created At Check!!" } }).pipe(
        Effect.provide(layer)
      )
    );

    const after = await Effect.runPromise(
      updateOrganizationInfo({ data: { displayName: "Test Org — Created At Check 2!!" } }).pipe(
        Effect.provide(layer)
      )
    );

    expect(before.record.createdAt).toBe(after.record.createdAt);
    console.log(`[ok] createdAt preserved: ${after.record.createdAt}`);
  });

  it("fails with OrganizationInfoValidationError on an invalid patch", async () => {
    if (!credentialsProvided) {
      console.log("[skip] Credentials not set.");
      return;
    }

    const layer = makeCredentialAgentLayer({ service, identifier, password });

    await Effect.runPromise(
      createOrganizationInfo(baseInput).pipe(
        Effect.catchTag("OrganizationInfoAlreadyExistsError", () => Effect.void),
        Effect.provide(layer)
      )
    );

    // displayName must be at least 8 chars.
    const result = await Effect.runPromise(
      updateOrganizationInfo({ data: { displayName: "Bad" } }).pipe(
        Effect.either,
        Effect.provide(layer)
      )
    );

    expect(result._tag).toBe("Left");
    if (result._tag === "Left") {
      expect(result.left).toBeInstanceOf(OrganizationInfoValidationError);
      console.log(`[ok] Got expected OrganizationInfoValidationError: ${result.left.message}`);
    }
  });

  it("fails with OrganizationInfoNotFoundError when no record exists", async () => {
    if (!credentialsProvided) {
      console.log("[skip] Credentials not set.");
      return;
    }

    const secondaryService    = process.env["ATPROTO_SECONDARY_SERVICE"]    ?? "";
    const secondaryIdentifier = process.env["ATPROTO_SECONDARY_IDENTIFIER"] ?? "";
    const secondaryPassword   = process.env["ATPROTO_SECONDARY_PASSWORD"]   ?? "";
    const secondaryProvided =
      secondaryService !== "" && secondaryIdentifier !== "" && secondaryPassword !== "";

    if (!secondaryProvided) {
      console.log(
        "[skip] Set ATPROTO_SECONDARY_SERVICE / ATPROTO_SECONDARY_IDENTIFIER / " +
        "ATPROTO_SECONDARY_PASSWORD in tests/.env.test-credentials to test the NotFound path."
      );
      return;
    }

    const layer = makeCredentialAgentLayer({
      service: secondaryService,
      identifier: secondaryIdentifier,
      password: secondaryPassword,
    });

    const result = await Effect.runPromise(
      updateOrganizationInfo({ data: { displayName: "Should Fail!!!!" } }).pipe(
        Effect.either,
        Effect.provide(layer)
      )
    );

    expect(result._tag).toBe("Left");
    if (result._tag === "Left") {
      expect(result.left).toBeInstanceOf(OrganizationInfoNotFoundError);
      console.log(`[ok] Got expected OrganizationInfoNotFoundError for repo: ${result.left.repo}`);
    }
  });

  // -------------------------------------------------------------------------
  // unset tests
  // -------------------------------------------------------------------------

  it("unsets an optional field when listed in unset array", async () => {
    if (!credentialsProvided) {
      console.log("[skip] Credentials not set.");
      return;
    }

    const layer = makeCredentialAgentLayer({ service, identifier, password });

    // First ensure the record has a website set.
    await Effect.runPromise(
      createOrganizationInfo(baseInput).pipe(
        Effect.catchTag("OrganizationInfoAlreadyExistsError", () => Effect.void),
        Effect.provide(layer)
      )
    );
    await Effect.runPromise(
      updateOrganizationInfo({ data: { website: "https://example.com" } }).pipe(
        Effect.provide(layer)
      )
    );

    // Now unset it.
    const result = await Effect.runPromise(
      updateOrganizationInfo({ data: {}, unset: ["website"] }).pipe(
        Effect.provide(layer)
      )
    );

    expect(result.record.website).toBeUndefined();
    console.log("[ok] website successfully unset — record.website is undefined");
  });

  it("silently ignores unset of required fields — field is preserved unchanged", async () => {
    if (!credentialsProvided) {
      console.log("[skip] Credentials not set.");
      return;
    }

    const layer = makeCredentialAgentLayer({ service, identifier, password });

    await Effect.runPromise(
      createOrganizationInfo(baseInput).pipe(
        Effect.catchTag("OrganizationInfoAlreadyExistsError", () => Effect.void),
        Effect.provide(layer)
      )
    );

    // Fetch the current displayName first so we know what to compare against.
    const before = await Effect.runPromise(
      updateOrganizationInfo({ data: { displayName: "Test Org — Unset Guard!!!" } }).pipe(
        Effect.provide(layer)
      )
    );

    // Attempt to unset displayName (required) — should be silently ignored.
    const after = await Effect.runPromise(
      updateOrganizationInfo({ data: {}, unset: ["displayName"] }).pipe(
        Effect.provide(layer)
      )
    );

    expect(after.record.displayName).toBe(before.record.displayName);
    console.log(
      `[ok] displayName silently preserved after unset attempt: "${after.record.displayName}"`
    );
  });

  it("can unset and update in the same call", async () => {
    if (!credentialsProvided) {
      console.log("[skip] Credentials not set.");
      return;
    }

    const layer = makeCredentialAgentLayer({ service, identifier, password });

    await Effect.runPromise(
      createOrganizationInfo(baseInput).pipe(
        Effect.catchTag("OrganizationInfoAlreadyExistsError", () => Effect.void),
        Effect.provide(layer)
      )
    );

    // Set both website and startDate.
    await Effect.runPromise(
      updateOrganizationInfo({
        data: {
          website: "https://example.com",
          startDate: "2024-01-01T00:00:00.000Z",
        },
      }).pipe(Effect.provide(layer))
    );

    // Unset website, simultaneously update displayName.
    const result = await Effect.runPromise(
      updateOrganizationInfo({
        data: { displayName: "Test Org — Combined Op!!!" },
        unset: ["website"],
      }).pipe(Effect.provide(layer))
    );

    expect(result.record.website).toBeUndefined();
    expect(result.record.displayName).toBe("Test Org — Combined Op!!!");
    // startDate should be untouched (not in data, not in unset)
    expect(result.record.startDate).toBe("2024-01-01T00:00:00.000Z");
    console.log("[ok] Combined unset + update — website gone, displayName updated, startDate intact");
  });

  // -------------------------------------------------------------------------
  // Blob tests
  // -------------------------------------------------------------------------

  it("fails with FileConstraintError when logo MIME type is invalid (offline)", async () => {
    const layer = makeCredentialAgentLayer({
      service: service || "https://bsky.social",
      identifier: identifier || "placeholder",
      password: password || "placeholder",
    });

    const result = await Effect.runPromise(
      updateOrganizationInfo({
        data: {
          logo: {
            // @ts-expect-error — deliberately wrong type for the test
            $type: "org.hypercerts.defs#smallImage",
            image: makeTinyPng({ type: "video/mp4" }),
          },
        },
      }).pipe(Effect.either, Effect.provide(layer))
    );

    expect(result._tag).toBe("Left");
    if (result._tag === "Left") {
      expect(result.left).toBeInstanceOf(FileConstraintError);
      expect((result.left as FileConstraintError).reason).toContain("not accepted");
      console.log(`[ok] Got expected FileConstraintError: ${(result.left as FileConstraintError).reason}`);
    }
  });

  it("fails with FileConstraintError when coverImage exceeds 5 MB (offline)", async () => {
    const layer = makeCredentialAgentLayer({
      service: service || "https://bsky.social",
      identifier: identifier || "placeholder",
      password: password || "placeholder",
    });

    const result = await Effect.runPromise(
      updateOrganizationInfo({
        data: {
          coverImage: {
            // @ts-expect-error
            $type: "org.hypercerts.defs#smallImage",
            image: makeTinyPng({ size: 5 * 1024 * 1024 + 1 }),
          },
        },
      }).pipe(Effect.either, Effect.provide(layer))
    );

    expect(result._tag).toBe("Left");
    if (result._tag === "Left") {
      expect(result.left).toBeInstanceOf(FileConstraintError);
      expect((result.left as FileConstraintError).reason).toContain("exceeds maximum");
      console.log(`[ok] Got expected FileConstraintError: ${(result.left as FileConstraintError).reason}`);
    }
  });

  it("updates logo with a SerializableFile (integration — requires credentials)", async () => {
    if (!credentialsProvided) {
      console.log("[skip] Credentials not set.");
      return;
    }

    const layer = makeCredentialAgentLayer({ service, identifier, password });

    await Effect.runPromise(
      createOrganizationInfo(baseInput).pipe(
        Effect.catchTag("OrganizationInfoAlreadyExistsError", () => Effect.void),
        Effect.provide(layer)
      )
    );

    const result = await Effect.runPromise(
      updateOrganizationInfo({
        data: {
          logo: {
            // @ts-expect-error — type widening for test
            $type: "org.hypercerts.defs#smallImage",
            image: makeTinyPng(),
          },
        },
      }).pipe(Effect.provide(layer))
    );

    expect(result.uri).toMatch(/^at:\/\//);
    expect(result.record.logo).toBeDefined();
    expect(result.record.logo?.image).toBeDefined();
    console.log(`[ok] Updated organization.info with logo blob at ${result.uri}`);
  });
});
