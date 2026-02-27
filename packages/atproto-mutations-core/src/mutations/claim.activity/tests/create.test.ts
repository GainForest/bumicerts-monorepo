import { describe, it, expect } from "bun:test";
import { Effect } from "effect";
import { makeCredentialAgentLayer } from "../../../layers/credential";
import { createClaimActivity } from "../create";
import { ClaimActivityValidationError } from "../utils/errors";
import { FileConstraintError } from "../../../blob/errors";
import type { CreateClaimActivityInput } from "../utils/types";
import type { SerializableFile } from "../../../blob/types";

// ---------------------------------------------------------------------------
// Load test credentials from the package-level tests/.env.test-credentials.
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

/** Build a tiny valid PNG SerializableFile (1×1, 67 bytes). */
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
// Minimal valid input fixture.
// Satisfies all required fields from the org.hypercerts.claim.activity lexicon.
// ---------------------------------------------------------------------------

const minimalInput: CreateClaimActivityInput = {
  title: "Test Claim Activity",
  shortDescription: "A test claim activity record created by the automated test suite.",
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("createClaimActivity", () => {
  it("creates a new record with an auto-generated TID rkey", async () => {
    if (!credentialsProvided) {
      console.log(
        "[skip] Copy tests/.env.test-credentials.example → tests/.env.test-credentials " +
        "and fill in your credentials to run this test."
      );
      return;
    }

    const layer = makeCredentialAgentLayer({ service, identifier, password });

    const result = await Effect.runPromise(
      createClaimActivity(minimalInput).pipe(Effect.provide(layer))
    );

    expect(result.uri).toMatch(/^at:\/\//);
    expect(result.uri).toContain("org.hypercerts.claim.activity");
    expect(result.cid).toBeString();
    expect(result.rkey).toBeString();
    expect(result.rkey.length).toBeGreaterThan(0);
    expect(result.record.title).toBe(minimalInput.title);
    expect(result.record.shortDescription).toBe(minimalInput.shortDescription);
    expect(result.record.createdAt).toBeString();
    console.log(`[ok] Created claim.activity at ${result.uri} (rkey: ${result.rkey})`);
  });

  it("creates a new record with a caller-supplied rkey", async () => {
    if (!credentialsProvided) {
      console.log("[skip] Credentials not set.");
      return;
    }

    const layer = makeCredentialAgentLayer({ service, identifier, password });

    // Use a timestamp suffix to ensure uniqueness across test runs.
    const rkey = `test-create-${Date.now()}`;

    const result = await Effect.runPromise(
      createClaimActivity({ ...minimalInput, rkey }).pipe(Effect.provide(layer))
    );

    expect(result.rkey).toBe(rkey);
    expect(result.uri).toContain(rkey);
    console.log(`[ok] Created claim.activity with caller-supplied rkey: ${result.rkey}`);

    // Clean up — delete the record so it doesn't accumulate across test runs.
    await Effect.runPromise(
      Effect.tryPromise({
        try: async () => {
          const { Agent, CredentialSession } = await import("@atproto/api");
          const session = new CredentialSession(new URL(`https://${service}`));
          await session.login({ identifier, password });
          const agent = new Agent(session);
          await agent.com.atproto.repo.deleteRecord({
            repo: agent.assertDid,
            collection: "org.hypercerts.claim.activity",
            rkey,
          });
        },
        catch: () => undefined,
      }).pipe(Effect.orElse(() => Effect.void))
    );
  });

  it("fails with ClaimActivityValidationError on invalid input (offline)", async () => {
    // This test does NOT need credentials — validation fires before any PDS call.
    const layer = makeCredentialAgentLayer({
      service: service || "bsky.social",
      identifier: identifier || "placeholder",
      password: password || "placeholder",
    });

    // title exceeds maxLength: 256 → validation fails before any PDS call.
    const badInput: CreateClaimActivityInput = {
      ...minimalInput,
      title: "x".repeat(257),
    };

    const result = await Effect.runPromise(
      createClaimActivity(badInput).pipe(
        Effect.either,
        Effect.provide(layer)
      )
    );

    expect(result._tag).toBe("Left");
    if (result._tag === "Left") {
      expect(result.left).toBeInstanceOf(ClaimActivityValidationError);
      expect(result.left._tag).toBe("ClaimActivityValidationError");
      console.log(`[ok] Got expected ClaimActivityValidationError: ${result.left.message}`);
    }
  });

  it("fails with FileConstraintError when image MIME type is invalid (offline)", async () => {
    const layer = makeCredentialAgentLayer({
      service: service || "bsky.social",
      identifier: identifier || "placeholder",
      password: password || "placeholder",
    });

    const result = await Effect.runPromise(
      createClaimActivity({
        ...minimalInput,
        image: {
          $type: "org.hypercerts.defs#smallImage",
          image: makeTinyPng({ type: "application/pdf" }), // wrong MIME
        },
      }).pipe(Effect.either, Effect.provide(layer))
    );

    expect(result._tag).toBe("Left");
    if (result._tag === "Left") {
      expect(result.left).toBeInstanceOf(FileConstraintError);
      expect(result.left._tag).toBe("FileConstraintError");
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
      createClaimActivity({
        ...minimalInput,
        image: {
          $type: "org.hypercerts.defs#smallImage",
          image: makeTinyPng({ size: 5 * 1024 * 1024 + 1 }), // 1 byte over 5 MB
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

  it("creates a record with a SmallImage SerializableFile (integration — requires credentials)", async () => {
    if (!credentialsProvided) {
      console.log("[skip] Credentials not set.");
      return;
    }

    const layer = makeCredentialAgentLayer({ service, identifier, password });

    const result = await Effect.runPromise(
      createClaimActivity({
        ...minimalInput,
        image: {
          $type: "org.hypercerts.defs#smallImage",
          image: makeTinyPng(),
        },
      }).pipe(Effect.provide(layer))
    );

    expect(result.uri).toMatch(/^at:\/\//);
    expect(result.record.image).toBeDefined();
    console.log(`[ok] Created claim.activity with SmallImage at ${result.uri} (rkey: ${result.rkey})`);
  });
});
