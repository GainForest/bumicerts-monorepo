import { describe, it, expect } from "bun:test";
import { Effect } from "effect";
import { makeCredentialAgentLayer } from "../../../layers/credential";
import { upsertClaimActivity } from "../upsert";
import { FileConstraintError } from "../../../blob/errors";
import { ClaimActivityValidationError } from "../utils/errors";
import type { UpsertClaimActivityInput } from "../utils/types";
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

const baseInput: UpsertClaimActivityInput = {
  title: "Test Claim Activity",
  shortDescription: "A test claim activity record created by the automated test suite.",
  startDate: "2024-01-01T00:00:00.000Z",
  endDate: "2024-12-31T23:59:59.000Z",
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("upsertClaimActivity", () => {
  it("creates a new record when no rkey is provided (always creates, created=true)", async () => {
    if (!credentialsProvided) {
      console.log(
        "[skip] Copy tests/.env.test-credentials.example → tests/.env.test-credentials " +
        "and fill in your credentials to run this test."
      );
      return;
    }

    const layer = makeCredentialAgentLayer({ service, identifier, password });

    // No rkey — always creates a brand new record.
    const result = await Effect.runPromise(
      upsertClaimActivity(baseInput).pipe(Effect.provide(layer))
    );

    expect(result.uri).toMatch(/^at:\/\//);
    expect(result.uri).toContain("org.hypercerts.claim.activity");
    expect(result.cid).toBeString();
    expect(result.rkey).toBeString();
    expect(result.created).toBe(true);
    expect(result.record.title).toBe(baseInput.title);
    expect(result.record.createdAt).toBeString();
    console.log(
      `[ok] Upsert (no rkey) — created=${result.created}, uri=${result.uri}, rkey=${result.rkey}`
    );
  });

  it("creates a record when rkey is provided but record does not exist (created=true)", async () => {
    if (!credentialsProvided) {
      console.log("[skip] Credentials not set.");
      return;
    }

    const layer = makeCredentialAgentLayer({ service, identifier, password });
    const rkey = `test-upsert-create-${Date.now()}`;

    const result = await Effect.runPromise(
      upsertClaimActivity({ ...baseInput, rkey }).pipe(Effect.provide(layer))
    );

    expect(result.rkey).toBe(rkey);
    expect(result.created).toBe(true);
    expect(result.record.title).toBe(baseInput.title);
    console.log(
      `[ok] Upsert (new rkey) — created=${result.created}, rkey=${result.rkey}`
    );
  });

  it("replaces the record when rkey is provided and record exists (created=false)", async () => {
    if (!credentialsProvided) {
      console.log("[skip] Credentials not set.");
      return;
    }

    const layer = makeCredentialAgentLayer({ service, identifier, password });
    const rkey = `test-upsert-replace-${Date.now()}`;

    // First upsert — creates.
    const first = await Effect.runPromise(
      upsertClaimActivity({ ...baseInput, rkey }).pipe(Effect.provide(layer))
    );

    expect(first.created).toBe(true);

    // Second upsert at same rkey — replaces.
    const second = await Effect.runPromise(
      upsertClaimActivity({
        ...baseInput,
        rkey,
        title: "Replaced Title",
        description: makeLinearDocument("Now with a description."),
      }).pipe(Effect.provide(layer))
    );

    expect(second.created).toBe(false);
    expect(second.rkey).toBe(rkey);
    expect(second.record.title).toBe("Replaced Title");
    expect(second.record.description).toEqual(makeLinearDocument("Now with a description."));
    console.log(
      `[ok] Upsert (replace) — created=${second.created}, title="${second.record.title}"`
    );
  });

  it("preserves createdAt from the original record on replacement", async () => {
    if (!credentialsProvided) {
      console.log("[skip] Credentials not set.");
      return;
    }

    const layer = makeCredentialAgentLayer({ service, identifier, password });
    const rkey = `test-upsert-createdat-${Date.now()}`;

    const first = await Effect.runPromise(
      upsertClaimActivity({ ...baseInput, rkey }).pipe(Effect.provide(layer))
    );

    const second = await Effect.runPromise(
      upsertClaimActivity({ ...baseInput, rkey, title: "Updated Title" }).pipe(
        Effect.provide(layer)
      )
    );

    expect(second.record.createdAt).toBe(first.record.createdAt);
    console.log(`[ok] createdAt preserved across upserts: ${second.record.createdAt}`);
  });

  it("fully replaces the record — fields absent from the new input are removed", async () => {
    if (!credentialsProvided) {
      console.log("[skip] Credentials not set.");
      return;
    }

    const layer = makeCredentialAgentLayer({ service, identifier, password });
    const rkey = `test-upsert-fullreplace-${Date.now()}`;

    // First upsert: set a description.
    await Effect.runPromise(
      upsertClaimActivity({
        ...baseInput,
        rkey,
        description: makeLinearDocument("This will disappear on the next upsert."),
      }).pipe(Effect.provide(layer))
    );

    // Second upsert: baseInput has no description — it should be gone.
    const result = await Effect.runPromise(
      upsertClaimActivity({ ...baseInput, rkey }).pipe(Effect.provide(layer))
    );

    expect(result.record.description).toBeUndefined();
    console.log("[ok] description absent from second upsert input — field was removed from record");
  });

  it("fails with ClaimActivityValidationError on invalid input", async () => {
    if (!credentialsProvided) {
      console.log("[skip] Credentials not set.");
      return;
    }

    const layer = makeCredentialAgentLayer({ service, identifier, password });

    // title exceeds maxLength: 256.
    const result = await Effect.runPromise(
      upsertClaimActivity({ ...baseInput, title: "x".repeat(257) }).pipe(
        Effect.either,
        Effect.provide(layer)
      )
    );

    expect(result._tag).toBe("Left");
    if (result._tag === "Left") {
      expect(result.left).toBeInstanceOf(ClaimActivityValidationError);
      console.log(`[ok] Got expected ClaimActivityValidationError: ${result.left.message}`);
    }
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
      upsertClaimActivity({
        ...baseInput,
        image: {
          $type: "org.hypercerts.defs#smallImage",
          image: makeTinyPng({ type: "application/octet-stream" }),
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
      upsertClaimActivity({
        ...baseInput,
        image: {
          $type: "org.hypercerts.defs#smallImage",
          image: makeTinyPng({ size: 5 * 1024 * 1024 + 1 }),
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

  it("upserts with a SmallImage SerializableFile (integration — requires credentials)", async () => {
    if (!credentialsProvided) {
      console.log("[skip] Credentials not set.");
      return;
    }

    const layer = makeCredentialAgentLayer({ service, identifier, password });

    const result = await Effect.runPromise(
      upsertClaimActivity({
        ...baseInput,
        image: {
          $type: "org.hypercerts.defs#smallImage",
          image: makeTinyPng(),
        },
      }).pipe(Effect.provide(layer))
    );

    expect(result.uri).toMatch(/^at:\/\//);
    expect(result.record.image).toBeDefined();
    console.log(
      `[ok] Upserted claim.activity with SmallImage — created=${result.created}, uri=${result.uri}`
    );
  });
});
