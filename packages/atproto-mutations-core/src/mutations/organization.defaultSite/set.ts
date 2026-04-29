import { Effect } from "effect";
import { extractValidationIssues } from "../../validation";
import type { ValidationIssue } from "../../result";
import {
  $parse,
} from "@gainforest/generated/app/gainforest/organization/defaultSite.defs";
import { AtprotoAgent } from "../../services/AtprotoAgent";
import { fetchRecord, putRecord } from "../../utils/shared";
import {
  DefaultSiteValidationError,
  DefaultSiteLocationNotFoundError,
  DefaultSitePdsError,
} from "./utils/errors";
import type {
  SetDefaultSiteInput,
  DefaultSiteMutationResult,
  DefaultSiteRecord,
} from "./utils/types";

const COLLECTION = "app.gainforest.organization.defaultSite";
const LOCATION_COLLECTION = "app.certified.location";
const RKEY = "self";

const makePdsError = (message: string, cause: unknown) =>
  new DefaultSitePdsError({ message, cause });

const makeValidationError = (message: string, cause: unknown, issues?: ValidationIssue[]) =>
  new DefaultSiteValidationError({ message, cause, issues });

/**
 * Set (or replace) the organization's default site.
 *
 * Acts as a pure upsert — creates the singleton `organization.defaultSite`
 * record if it doesn't exist, replaces it if it does.
 *
 * Validates that:
 * 1. The `locationUri` is a well-formed AT-URI pointing at a `certified.location`.
 * 2. The DID in the URI matches the authenticated user's DID (the location must
 *    be in the user's own PDS, not a remote one).
 * 3. The location record actually exists in the user's PDS.
 */
export const setDefaultSite = (
  input: SetDefaultSiteInput
): Effect.Effect<
  DefaultSiteMutationResult,
  | DefaultSiteValidationError
  | DefaultSiteLocationNotFoundError
  | DefaultSitePdsError,
  AtprotoAgent
> =>
  Effect.gen(function* () {
    const { locationUri } = input;
    const agent = yield* AtprotoAgent;
    const myDid = agent.assertDid;

    // 1. Validate URI format: must be `at://{did}/app.certified.location/{rkey}`.
    if (!locationUri.startsWith("at://") || !locationUri.includes(LOCATION_COLLECTION)) {
      return yield* Effect.fail(
        new DefaultSiteValidationError({
          message: `locationUri must be an AT-URI pointing at a "${LOCATION_COLLECTION}" record. Got: "${locationUri}"`,
        })
      );
    }

    // Parse the URI: at://{did}/{collection}/{rkey}
    const uriWithoutScheme = locationUri.slice("at://".length);
    const parts = uriWithoutScheme.split("/");
    const uriDid = parts[0] ?? "";
    const locationRkey = parts[2] ?? "";

    if (!uriDid || !locationRkey) {
      return yield* Effect.fail(
        new DefaultSiteValidationError({
          message: `locationUri has unexpected format. Expected "at://{did}/${LOCATION_COLLECTION}/{rkey}". Got: "${locationUri}"`,
        })
      );
    }

    // 2. DID must match the authenticated user's DID.
    if (uriDid !== myDid) {
      return yield* Effect.fail(
        new DefaultSiteValidationError({
          message: `The certified.location must be in the user's own PDS. URI DID "${uriDid}" does not match authenticated DID "${myDid}"`,
        })
      );
    }

    // 3. Verify the location record exists.
    // IMPORTANT: this check is intentionally schema-tolerant.
    // We only care about existence here, not strict validation of the location
    // payload. Older records can fail $parse due to historical blob shapes, which
    // would incorrectly block setting them as default.
    const location = yield* fetchRecord(
      LOCATION_COLLECTION,
      locationRkey,
      (value) => value,
      makePdsError,
    );

    if (location === null) {
      return yield* Effect.fail(
        new DefaultSiteLocationNotFoundError({ locationUri })
      );
    }

    // 4. Build and validate the defaultSite record.
    const createdAt = new Date().toISOString();
    const candidate = {
      $type: COLLECTION,
      site: locationUri,
      createdAt,
    };

    const record = yield* Effect.try({
      try: () => $parse(candidate),
      catch: (cause) => { const issues = extractValidationIssues(cause); return makeValidationError("Validation failed", cause, issues); },
    });

    // 5. Write (putRecord = singleton upsert at rkey "self").
    const { uri, cid } = yield* putRecord(COLLECTION, RKEY, record, makePdsError);

    return {
      uri,
      cid,
      record: record as DefaultSiteRecord,
    } satisfies DefaultSiteMutationResult;
  });

export {
  DefaultSiteValidationError,
  DefaultSiteLocationNotFoundError,
  DefaultSitePdsError,
};
