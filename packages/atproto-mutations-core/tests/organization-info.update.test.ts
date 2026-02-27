import { describe, it, expect } from "bun:test";
import { Effect } from "effect";
import { makeCredentialAgentLayer } from "../src/layers/credential";
import { createOrganizationInfo } from "../src/mutations/organization.info/create";
import { updateOrganizationInfo } from "../src/mutations/organization.info/update";
import {
  OrganizationInfoNotFoundError,
  OrganizationInfoValidationError,
} from "../src/mutations/organization.info/utils/errors";
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
  it("updates an existing organization.info record with partial fields", async () => {
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
        displayName: "Test Org — Updated Name!!",
        objectives: ["Conservation", "Research"],
        website: "https://example.com",
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

  it("preserves createdAt from the original record (not overridable via update)", async () => {
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

    // Fetch the current createdAt before updating.
    const before = await Effect.runPromise(
      updateOrganizationInfo({ displayName: "Test Org — Created At Check!!" }).pipe(
        Effect.provide(layer)
      )
    );

    // Update again — createdAt should remain identical.
    const after = await Effect.runPromise(
      updateOrganizationInfo({ displayName: "Test Org — Created At Check 2!!" }).pipe(
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
      updateOrganizationInfo({ displayName: "Bad" }).pipe(
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

    // This test uses a different account that has no organization.info record.
    // We can't easily test this against the same account used for creation,
    // so we test it by providing credentials for a fresh account.
    // If ATPROTO_SECONDARY_* vars are set, use them; otherwise skip this sub-test.
    const secondaryService    = process.env["ATPROTO_SECONDARY_SERVICE"]    ?? "";
    const secondaryIdentifier = process.env["ATPROTO_SECONDARY_IDENTIFIER"] ?? "";
    const secondaryPassword   = process.env["ATPROTO_SECONDARY_PASSWORD"]   ?? "";
    const secondaryProvided = secondaryService !== "" && secondaryIdentifier !== "" && secondaryPassword !== "";

    if (!secondaryProvided) {
      console.log(
        "[skip] Set ATPROTO_SECONDARY_SERVICE / ATPROTO_SECONDARY_IDENTIFIER / ATPROTO_SECONDARY_PASSWORD " +
        "in tests/.env.test-credentials to test the NotFound path."
      );
      return;
    }

    const layer = makeCredentialAgentLayer({
      service: secondaryService,
      identifier: secondaryIdentifier,
      password: secondaryPassword,
    });

    const result = await Effect.runPromise(
      updateOrganizationInfo({ displayName: "Should Fail!!!!" }).pipe(
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
});
