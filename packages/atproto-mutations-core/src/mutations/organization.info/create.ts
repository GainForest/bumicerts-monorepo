import { Effect } from "effect";
import { AtprotoAgent } from "../../services/AtprotoAgent";
import {
  $parse,
} from "@gainforest/generated/app/gainforest/organization/info.defs";
import type {
  CreateOrganizationInfoInput,
  OrganizationInfoMutationResult,
  OrganizationInfoRecord,
} from "./utils/types";
import {
  OrganizationInfoAlreadyExistsError,
  OrganizationInfoPdsError,
  OrganizationInfoValidationError,
} from "./utils/errors";

const COLLECTION = "app.gainforest.organization.info";
const RKEY = "self";

/**
 * Creates a new organization.info record in the authenticated user's repo.
 *
 * organization.info uses key=literal:self, meaning each repo may hold exactly
 * one record under the rkey "self". If a record already exists this operation
 * fails with OrganizationInfoAlreadyExistsError — use upsertOrganizationInfo
 * if you want create-or-update semantics.
 *
 * The record is validated against the app.gainforest.organization.info lexicon
 * via @atproto/lex before any PDS call is made.
 */
export const createOrganizationInfo = (
  input: CreateOrganizationInfoInput
): Effect.Effect<
  OrganizationInfoMutationResult,
  | OrganizationInfoValidationError
  | OrganizationInfoAlreadyExistsError
  | OrganizationInfoPdsError,
  AtprotoAgent
> =>
  Effect.gen(function* () {
    const agent = yield* AtprotoAgent;
    const repo = agent.assertDid;

    // -----------------------------------------------------------------------
    // 1. Build the candidate record and validate via @atproto/lex.
    //    Validation is cheap and catches bad input immediately, before making
    //    any network calls. $parse throws if the record doesn't conform to the
    //    app.gainforest.organization.info lexicon.
    // -----------------------------------------------------------------------
    const createdAt = new Date().toISOString();

    const candidate = {
      $type: COLLECTION,
      ...input,
      createdAt,
    } as OrganizationInfoRecord;

    const record = yield* Effect.try({
      try: () => $parse(candidate),
      catch: (cause) =>
        new OrganizationInfoValidationError({
          message: `organization.info record failed lexicon validation: ${String(cause)}`,
          cause,
        }),
    });

    // -----------------------------------------------------------------------
    // 2. Check for an existing record.
    //    getRecord throws when the record doesn't exist (404) — we treat that
    //    as the happy path. A successful response means one already exists.
    // -----------------------------------------------------------------------
    const existing = yield* Effect.tryPromise({
      try: () =>
        agent.com.atproto.repo
          .getRecord({ repo, collection: COLLECTION, rkey: RKEY })
          .then((res) => res.data)
          .catch(() => null),
      catch: (cause) =>
        new OrganizationInfoPdsError({
          message: "Failed to check for existing organization.info record",
          cause,
        }),
    });

    if (existing !== null) {
      return yield* Effect.fail(
        new OrganizationInfoAlreadyExistsError({
          uri: `at://${repo}/${COLLECTION}/${RKEY}`,
        })
      );
    }

    // -----------------------------------------------------------------------
    // 3. Write to the PDS.
    // -----------------------------------------------------------------------
    const response = yield* Effect.tryPromise({
      try: () =>
        agent.com.atproto.repo.createRecord({
          repo,
          collection: COLLECTION,
          rkey: RKEY,
          record,
        }),
      catch: (cause) =>
        new OrganizationInfoPdsError({
          message: "PDS rejected createRecord for organization.info",
          cause,
        }),
    });

    return {
      uri: response.data.uri,
      cid: response.data.cid,
      record,
    } satisfies OrganizationInfoMutationResult;
  });

export {
  OrganizationInfoAlreadyExistsError,
  OrganizationInfoPdsError,
  OrganizationInfoValidationError,
};
