import { describe, it, expect } from "bun:test";
import { Effect } from "effect";
import { makeCredentialAgentLayer } from "../../../layers/credential";
import { createClaimActivity } from "../create";
import { updateClaimActivity } from "../update";
import {
  ClaimActivityNotFoundError,
  ClaimActivityValidationError,
} from "../utils/errors";
import { FileConstraintError } from "../../../blob/errors";
import type { CreateClaimActivityInput } from "../utils/types";
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

/**
 * Create a LinearDocument from a plain text string.
 * The description field in org.hypercerts.claim.activity now expects a
 * pub.leaflet.pages.linearDocument object instead of a plain string.
 */
function makeLinearDocument(text: string) {
  return {
    $type: "pub.leaflet.pages.linearDocument" as const,
    blocks: [
      {
        $type: "pub.leaflet.pages.linearDocument#block" as const,
        block: {
          $type: "pub.leaflet.blocks.text" as const,
          plaintext: text,
        },
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Fixture
// ---------------------------------------------------------------------------

const baseInput: CreateClaimActivityInput = {
  title: "Test Claim Activity",
  shortDescription: "A test claim activity record created by the automated test suite.",
  startDate: "2024-01-01T00:00:00.000Z",
  endDate: "2024-12-31T23:59:59.000Z",
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("updateClaimActivity", () => {
  it("updates an existing record with partial data fields", async () => {
    if (!credentialsProvided) {
      console.log(
        "[skip] Copy tests/.env.test-credentials.example → tests/.env.test-credentials " +
        "and fill in your credentials to run this test."
      );
      return;
    }

    const layer = makeCredentialAgentLayer({ service, identifier, password });

    // Create a fresh record to update.
    const created = await Effect.runPromise(
      createClaimActivity(baseInput).pipe(Effect.provide(layer))
    );

    const newDescription = makeLinearDocument("Now with a long description.");
    const result = await Effect.runPromise(
      updateClaimActivity({
        rkey: created.rkey,
        data: {
          title: "Updated Claim Activity Title",
          description: newDescription,
          startDate: "2024-01-01T00:00:00.000Z",
        },
      }).pipe(Effect.provide(layer))
    );

    expect(result.uri).toMatch(/^at:\/\//);
    expect(result.cid).toBeString();
    expect(result.rkey).toBe(created.rkey);
    expect(result.record.title).toBe("Updated Claim Activity Title");
    expect(result.record.description).toMatchObject(newDescription);
    expect(result.record.startDate).toBe("2024-01-01T00:00:00.000Z");
    // shortDescription was not in the patch — must be preserved from original.
    expect(result.record.shortDescription).toBe(baseInput.shortDescription);
    // createdAt must be preserved from original record (not reset).
    expect(result.record.createdAt).toBe(created.record.createdAt);
    console.log(`[ok] Updated claim.activity at ${result.uri} (rkey: ${result.rkey})`);
  });

  it("preserves createdAt from the original record across updates", async () => {
    if (!credentialsProvided) {
      console.log("[skip] Credentials not set.");
      return;
    }

    const layer = makeCredentialAgentLayer({ service, identifier, password });

    const created = await Effect.runPromise(
      createClaimActivity(baseInput).pipe(Effect.provide(layer))
    );

    const first = await Effect.runPromise(
      updateClaimActivity({
        rkey: created.rkey,
        data: { title: "Update 1" },
      }).pipe(Effect.provide(layer))
    );

    const second = await Effect.runPromise(
      updateClaimActivity({
        rkey: created.rkey,
        data: { title: "Update 2" },
      }).pipe(Effect.provide(layer))
    );

    expect(first.record.createdAt).toBe(second.record.createdAt);
    expect(second.record.createdAt).toBe(created.record.createdAt);
    console.log(`[ok] createdAt preserved across updates: ${second.record.createdAt}`);
  });

  it("fails with ClaimActivityNotFoundError when record does not exist", async () => {
    if (!credentialsProvided) {
      console.log("[skip] Credentials not set.");
      return;
    }

    const layer = makeCredentialAgentLayer({ service, identifier, password });

    const result = await Effect.runPromise(
      updateClaimActivity({
        rkey: "nonexistent-rkey-that-will-never-exist",
        data: { title: "Should Fail" },
      }).pipe(Effect.either, Effect.provide(layer))
    );

    expect(result._tag).toBe("Left");
    if (result._tag === "Left") {
      expect(result.left).toBeInstanceOf(ClaimActivityNotFoundError);
      expect(result.left._tag).toBe("ClaimActivityNotFoundError");
      if (result.left._tag === "ClaimActivityNotFoundError") {
        console.log(`[ok] Got expected ClaimActivityNotFoundError for rkey: ${result.left.rkey}`);
      }
    }
  });

  it("fails with ClaimActivityValidationError on an invalid patch", async () => {
    if (!credentialsProvided) {
      console.log("[skip] Credentials not set.");
      return;
    }

    const layer = makeCredentialAgentLayer({ service, identifier, password });

    const created = await Effect.runPromise(
      createClaimActivity(baseInput).pipe(Effect.provide(layer))
    );

    // title exceeds maxLength: 256.
    const result = await Effect.runPromise(
      updateClaimActivity({
        rkey: created.rkey,
        data: { title: "x".repeat(257) },
      }).pipe(Effect.either, Effect.provide(layer))
    );

    expect(result._tag).toBe("Left");
    if (result._tag === "Left") {
      expect(result.left).toBeInstanceOf(ClaimActivityValidationError);
      console.log(`[ok] Got expected ClaimActivityValidationError: ${result.left.message}`);
    }
  });

  it("unsets an optional field when listed in unset array", async () => {
    if (!credentialsProvided) {
      console.log("[skip] Credentials not set.");
      return;
    }

    const layer = makeCredentialAgentLayer({ service, identifier, password });

    // Create a record that has an optional description set.
    const created = await Effect.runPromise(
      createClaimActivity({
        ...baseInput,
        description: makeLinearDocument("A description that will be unset."),
      }).pipe(Effect.provide(layer))
    );

    // Unset description.
    const result = await Effect.runPromise(
      updateClaimActivity({
        rkey: created.rkey,
        data: {},
        unset: ["description"],
      }).pipe(Effect.provide(layer))
    );

    expect(result.record.description).toBeUndefined();
    console.log("[ok] description successfully unset — record.description is undefined");
  });

  it("silently ignores unset of required fields — field is preserved unchanged", async () => {
    if (!credentialsProvided) {
      console.log("[skip] Credentials not set.");
      return;
    }

    const layer = makeCredentialAgentLayer({ service, identifier, password });

    const created = await Effect.runPromise(
      createClaimActivity(baseInput).pipe(Effect.provide(layer))
    );

    // Attempt to unset title (required) — must be silently ignored.
    const result = await Effect.runPromise(
      updateClaimActivity({
        rkey: created.rkey,
        data: {},
        unset: ["title"],
      }).pipe(Effect.provide(layer))
    );

    expect(result.record.title).toBe(created.record.title);
    console.log(`[ok] title silently preserved after unset attempt: "${result.record.title}"`);
  });

  it("can unset and update in the same call", async () => {
    if (!credentialsProvided) {
      console.log("[skip] Credentials not set.");
      return;
    }

    const layer = makeCredentialAgentLayer({ service, identifier, password });

    // Create a record with description and startDate.
    const created = await Effect.runPromise(
      createClaimActivity({
        ...baseInput,
        description: makeLinearDocument("Will be unset."),
        startDate: "2024-01-01T00:00:00.000Z",
      }).pipe(Effect.provide(layer))
    );

    // Unset description, simultaneously update title.
    const result = await Effect.runPromise(
      updateClaimActivity({
        rkey: created.rkey,
        data: { title: "Combined Op Title" },
        unset: ["description"],
      }).pipe(Effect.provide(layer))
    );

    expect(result.record.description).toBeUndefined();
    expect(result.record.title).toBe("Combined Op Title");
    // startDate should be untouched (not in data, not in unset).
    expect(result.record.startDate).toBe("2024-01-01T00:00:00.000Z");
    console.log("[ok] Combined unset + update — description gone, title updated, startDate intact");
  });

  // -------------------------------------------------------------------------
  // Blob tests
  // -------------------------------------------------------------------------

  it("fails with FileConstraintError when image MIME type is invalid (offline)", async () => {
    const layer = makeCredentialAgentLayer({
      service: service || "bsky.social",
      identifier: identifier || "placeholder",
      password: password || "placeholder",
    });

    const result = await Effect.runPromise(
      updateClaimActivity({
        rkey: "any-rkey",
        data: {
          image: {
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

  it("fails with FileConstraintError when image exceeds 5 MB (offline)", async () => {
    const layer = makeCredentialAgentLayer({
      service: service || "bsky.social",
      identifier: identifier || "placeholder",
      password: password || "placeholder",
    });

    const result = await Effect.runPromise(
      updateClaimActivity({
        rkey: "any-rkey",
        data: {
          image: {
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

  it("updates image with a SmallImage SerializableFile (integration — requires credentials)", async () => {
    if (!credentialsProvided) {
      console.log("[skip] Credentials not set.");
      return;
    }

    const layer = makeCredentialAgentLayer({ service, identifier, password });

    const created = await Effect.runPromise(
      createClaimActivity(baseInput).pipe(Effect.provide(layer))
    );

    const result = await Effect.runPromise(
      updateClaimActivity({
        rkey: created.rkey,
        data: {
          image: {
            $type: "org.hypercerts.defs#smallImage",
            image: makeTinyPng(),
          },
        },
      }).pipe(Effect.provide(layer))
    );

    expect(result.uri).toMatch(/^at:\/\//);
    expect(result.record.image).toBeDefined();
    console.log(`[ok] Updated claim.activity with SmallImage at ${result.uri}`);
  });
});
