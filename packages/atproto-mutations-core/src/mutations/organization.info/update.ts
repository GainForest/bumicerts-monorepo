import { Effect } from "effect";
import { AtprotoAgent } from "../../services/AtprotoAgent";
import {
  $parse,
} from "@gainforest/generated/app/gainforest/organization/info.defs";
import type {
  OrganizationInfoMutationResult,
  OrganizationInfoRecord,
  UpdateOrganizationInfoInput,
} from "./utils/types";
import {
  OrganizationInfoNotFoundError,
  OrganizationInfoPdsError,
  OrganizationInfoValidationError,
} from "./utils/errors";

const COLLECTION = "app.gainforest.organization.info";
const RKEY = "self";

/**
 * Updates an existing organization.info record with the provided partial input.
 *
 * Only the fields present in `input` are changed — all other fields retain
 * their existing values. Fails with OrganizationInfoNotFoundError if no record
 * exists yet. Use upsertOrganizationInfo if you need create-or-update semantics.
 *
 * The merged result is re-validated against the lexicon before writing.
 */
export const updateOrganizationInfo = (
  input: UpdateOrganizationInfoInput
): Effect.Effect<
  OrganizationInfoMutationResult,
  | OrganizationInfoValidationError
  | OrganizationInfoNotFoundError
  | OrganizationInfoPdsError,
  AtprotoAgent
> =>
  Effect.gen(function* () {
    const agent = yield* AtprotoAgent;
    const repo = agent.assertDid;

    // -----------------------------------------------------------------------
    // 1. Fetch the existing record.
    //    If the repo has no organization.info record yet we fail — use upsert.
    // -----------------------------------------------------------------------
    const existing = yield* Effect.tryPromise({
      try: () =>
        agent.com.atproto.repo
          .getRecord({ repo, collection: COLLECTION, rkey: RKEY })
          .then((res) => res.data.value as OrganizationInfoRecord)
          .catch(() => null),
      catch: (cause) =>
        new OrganizationInfoPdsError({
          message: "Failed to fetch existing organization.info record",
          cause,
        }),
    });

    if (existing === null) {
      return yield* Effect.fail(new OrganizationInfoNotFoundError({ repo }));
    }

    // -----------------------------------------------------------------------
    // 2. Merge: existing record values are the base; input fields overwrite.
    //    createdAt is intentionally preserved from the original record.
    // -----------------------------------------------------------------------
    const merged = {
      ...existing,
      ...input,
      $type: COLLECTION,
      createdAt: existing.createdAt,
    } as OrganizationInfoRecord;

    const record = yield* Effect.try({
      try: () => $parse(merged),
      catch: (cause) =>
        new OrganizationInfoValidationError({
          message: `Merged organization.info record failed lexicon validation: ${String(cause)}`,
          cause,
        }),
    });

    // -----------------------------------------------------------------------
    // 3. Write back with putRecord (full replacement, same rkey).
    // -----------------------------------------------------------------------
    const response = yield* Effect.tryPromise({
      try: () =>
        agent.com.atproto.repo.putRecord({
          repo,
          collection: COLLECTION,
          rkey: RKEY,
          record,
        }),
      catch: (cause) =>
        new OrganizationInfoPdsError({
          message: "PDS rejected putRecord for organization.info",
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
  OrganizationInfoNotFoundError,
  OrganizationInfoPdsError,
  OrganizationInfoValidationError,
};
