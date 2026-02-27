import { describe, it, expect } from "bun:test";
import { Effect } from "effect";
import { makeCredentialAgentLayer } from "../src/layers/credential";
import { upsertOrganizationInfo } from "../src/mutations/organization.info/update-or-create";
import type { CreateOrganizationInfoInput } from "../src/mutations/organization.info/utils/types";

// ---------------------------------------------------------------------------
// Credentials
// ---------------------------------------------------------------------------

await Bun.file(new URL(".env.test-credentials", import.meta.url))
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

const fullInput: CreateOrganizationInfoInput = {
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

describe("upsertOrganizationInfo", () => {
  it("creates or updates idempotently with mode=auto", async () => {
    if (!credentialsProvided) {
      console.log(
        "[skip] Copy tests/.env.test-credentials.example → tests/.env.test-credentials " +
        "and fill in your credentials to run this test."
      );
      return;
    }

    const layer = makeCredentialAgentLayer({ service, identifier, password });

    // First call — creates if not present, updates if present.
    const first = await Effect.runPromise(
      upsertOrganizationInfo({ mode: "auto", data: fullInput }).pipe(
        Effect.provide(layer)
      )
    );

    expect(first.uri).toMatch(/^at:\/\//);
    expect(first.cid).toBeString();
    expect(first.record.displayName).toBe(fullInput.displayName);
    expect(first.record.country).toBe("BR");
    console.log(
      `[ok] Upsert (first call) — created=${first.created}, uri=${first.uri}`
    );

    // Second call — always an update (record now exists).
    const second = await Effect.runPromise(
      upsertOrganizationInfo({
        mode: "auto",
        data: { ...fullInput, displayName: "Test Org — Upserted Name!!" },
      }).pipe(Effect.provide(layer))
    );

    expect(second.created).toBe(false);
    expect(second.record.displayName).toBe("Test Org — Upserted Name!!");
    // createdAt must be the same value set during the initial creation.
    expect(second.record.createdAt).toBe(first.record.createdAt);
    console.log(
      `[ok] Upsert (second call) — created=${second.created}, ` +
      `displayName=${second.record.displayName}, createdAt preserved=${second.record.createdAt}`
    );
  });

  it("reports created=true on first upsert and created=false on subsequent ones", async () => {
    if (!credentialsProvided) {
      console.log("[skip] Credentials not set.");
      return;
    }

    const layer = makeCredentialAgentLayer({ service, identifier, password });

    const results = await Effect.runPromise(
      Effect.gen(function* () {
        const a = yield* upsertOrganizationInfo({ mode: "auto", data: fullInput });
        const b = yield* upsertOrganizationInfo({ mode: "auto", data: fullInput });
        return { a, b };
      }).pipe(Effect.provide(layer))
    );

    // At least one of a or b should be created=false (account already has a record
    // by the time both calls have run). We can't guarantee a.created=true because
    // another test may have already created the record.
    expect(results.b.created).toBe(false);
    console.log(
      `[ok] a.created=${results.a.created}, b.created=${results.b.created}`
    );
  });

  it("sets createdAt only once and preserves it across upserts", async () => {
    if (!credentialsProvided) {
      console.log("[skip] Credentials not set.");
      return;
    }

    const layer = makeCredentialAgentLayer({ service, identifier, password });

    const first = await Effect.runPromise(
      upsertOrganizationInfo({ mode: "auto", data: fullInput }).pipe(
        Effect.provide(layer)
      )
    );

    const second = await Effect.runPromise(
      upsertOrganizationInfo({
        mode: "auto",
        data: { ...fullInput, displayName: "Test Org — CreatedAt Test!!!!" },
      }).pipe(Effect.provide(layer))
    );

    expect(first.record.createdAt).toBe(second.record.createdAt);
    console.log(`[ok] createdAt stable across upserts: ${second.record.createdAt}`);
  });

  it("fails with OrganizationInfoValidationError on invalid data", async () => {
    if (!credentialsProvided) {
      console.log("[skip] Credentials not set.");
      return;
    }

    const layer = makeCredentialAgentLayer({ service, identifier, password });

    // "Bad" is too short for displayName (min 8 chars).
    const result = await Effect.runPromise(
      upsertOrganizationInfo({
        mode: "auto",
        data: { ...fullInput, displayName: "Bad" },
      }).pipe(
        Effect.either,
        Effect.provide(layer)
      )
    );

    expect(result._tag).toBe("Left");
    if (result._tag === "Left") {
      expect(result.left._tag).toBe("OrganizationInfoValidationError");
      console.log(
        `[ok] Got expected OrganizationInfoValidationError: ${result.left.message}`
      );
    }
  });
});
