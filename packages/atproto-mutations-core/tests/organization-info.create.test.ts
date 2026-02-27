import { describe, it, expect } from "bun:test";
import { Effect } from "effect";
import { makeCredentialAgentLayer } from "../src/layers/credential";
import { createOrganizationInfo } from "../src/mutations/organization.info/create";
import {
  OrganizationInfoAlreadyExistsError,
  OrganizationInfoValidationError,
} from "../src/mutations/organization.info/utils/errors";
import type { CreateOrganizationInfoInput } from "../src/mutations/organization.info/utils/types";

// ---------------------------------------------------------------------------
// Load test credentials from tests/.env.test-credentials (gitignored).
// Copy tests/.env.test-credentials.example → tests/.env.test-credentials
// and fill in your dedicated test account credentials.
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
  .catch(() => {
    // File not present — tests will self-skip below.
  });

const service    = process.env["ATPROTO_SERVICE"]    ?? "";
const identifier = process.env["ATPROTO_IDENTIFIER"] ?? "";
const password   = process.env["ATPROTO_PASSWORD"]   ?? "";
const credentialsProvided = service !== "" && identifier !== "" && password !== "";

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
});
