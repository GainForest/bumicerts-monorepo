import { describe, it, expect } from "bun:test";
import { Effect } from "effect";
import { makeCredentialAgentLayer } from "../../../layers/credential";
import { createClaimActivity } from "../create";
import { deleteClaimActivity } from "../delete";
import { ClaimActivityNotFoundError } from "../utils/errors";
import type { CreateClaimActivityInput } from "../utils/types";

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
// Fixture
// ---------------------------------------------------------------------------

const baseInput: CreateClaimActivityInput = {
  title: "Test Claim Activity (for deletion)",
  shortDescription: "A record created only to be deleted by the test suite.",
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("deleteClaimActivity", () => {
  it("creates a record then deletes it successfully", async () => {
    if (!credentialsProvided) {
      console.log(
        "[skip] Copy tests/.env.test-credentials.example → tests/.env.test-credentials " +
        "and fill in your credentials to run this test."
      );
      return;
    }

    const layer = makeCredentialAgentLayer({ service, identifier, password });

    // Create a fresh record specifically for this delete test.
    const created = await Effect.runPromise(
      createClaimActivity(baseInput).pipe(Effect.provide(layer))
    );

    expect(created.uri).toMatch(/^at:\/\//);
    console.log(`[ok] Created record to delete: ${created.uri} (rkey: ${created.rkey})`);

    // Delete it.
    const deleted = await Effect.runPromise(
      deleteClaimActivity({ rkey: created.rkey }).pipe(Effect.provide(layer))
    );

    expect(deleted.uri).toBe(created.uri);
    expect(deleted.rkey).toBe(created.rkey);
    console.log(`[ok] Deleted claim.activity — uri: ${deleted.uri}, rkey: ${deleted.rkey}`);

    // Verify the record is actually gone — a subsequent delete must fail with NotFoundError.
    const afterDelete = await Effect.runPromise(
      deleteClaimActivity({ rkey: created.rkey }).pipe(
        Effect.either,
        Effect.provide(layer)
      )
    );

    expect(afterDelete._tag).toBe("Left");
    if (afterDelete._tag === "Left") {
      expect(afterDelete.left).toBeInstanceOf(ClaimActivityNotFoundError);
      console.log("[ok] Record confirmed gone — second delete gives ClaimActivityNotFoundError");
    }
  });

  it("fails with ClaimActivityNotFoundError when record does not exist", async () => {
    if (!credentialsProvided) {
      console.log("[skip] Credentials not set.");
      return;
    }

    const layer = makeCredentialAgentLayer({ service, identifier, password });

    const result = await Effect.runPromise(
      deleteClaimActivity({ rkey: "nonexistent-rkey-that-will-never-exist" }).pipe(
        Effect.either,
        Effect.provide(layer)
      )
    );

    expect(result._tag).toBe("Left");
    if (result._tag === "Left") {
      expect(result.left).toBeInstanceOf(ClaimActivityNotFoundError);
      expect(result.left._tag).toBe("ClaimActivityNotFoundError");
      expect(result.left.rkey).toBe("nonexistent-rkey-that-will-never-exist");
      console.log(
        `[ok] Got expected ClaimActivityNotFoundError for rkey: "${result.left.rkey}"`
      );
    }
  });
});
