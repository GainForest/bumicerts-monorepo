import { Effect } from "effect";
import { AtprotoAgent } from "../../services/AtprotoAgent";
import {
  $parse,
} from "@gainforest/generated/app/gainforest/organization/info.defs";
import type {
  CreateOrganizationInfoInput,
  OrganizationInfoMutationResult,
  OrganizationInfoRecord,
  UpdateOrganizationInfoInput,
} from "./utils/types";
import {
  OrganizationInfoPdsError,
  OrganizationInfoValidationError,
} from "./utils/errors";

const COLLECTION = "app.gainforest.organization.info";
const RKEY = "self";

// ---------------------------------------------------------------------------
// Input union — callers pass either a full create input (no record exists yet)
// or a partial update input (record already exists). The discriminant is
// determined at runtime by checking whether a record is present in the repo.
// ---------------------------------------------------------------------------
export type UpsertOrganizationInfoInput =
  | { mode: "create"; data: CreateOrganizationInfoInput }
  | { mode: "update"; data: UpdateOrganizationInfoInput }
  | { mode: "auto"; data: CreateOrganizationInfoInput };

/**
 * Upserts an organization.info record: creates if absent, updates if present.
 *
 * Three modes:
 *   - "auto"   (default/recommended): you supply a full CreateOrganizationInfoInput.
 *              If no record exists, it is created with that data. If one exists,
 *              the provided fields are merged over it (partial update).
 *   - "create": like createOrganizationInfo but never fails on existing records —
 *              if one exists the provided fields are merged instead.
 *   - "update": like updateOrganizationInfo but creates the record if missing
 *              using the provided data as the initial payload.
 *
 * Prefer "auto" in application code. Use "create" / "update" when you need to
 * be explicit about the intent while still tolerating the other state.
 */
export const upsertOrganizationInfo = (
  input: UpsertOrganizationInfoInput
): Effect.Effect<
  OrganizationInfoMutationResult & { created: boolean },
  OrganizationInfoValidationError | OrganizationInfoPdsError,
  AtprotoAgent
> =>
  Effect.gen(function* () {
    const agent = yield* AtprotoAgent;
    const repo = agent.assertDid;

    // -----------------------------------------------------------------------
    // 1. Attempt to fetch the existing record.
    // -----------------------------------------------------------------------
    const existing = yield* Effect.tryPromise({
      try: () =>
        agent.com.atproto.repo
          .getRecord({ repo, collection: COLLECTION, rkey: RKEY })
          .then((res) => res.data.value as OrganizationInfoRecord)
          .catch(() => null),
      catch: (cause) =>
        new OrganizationInfoPdsError({
          message: "Failed to check for existing organization.info record during upsert",
          cause,
        }),
    });

    const isCreate = existing === null;
    const createdAt = isCreate
      ? new Date().toISOString()
      : (existing as OrganizationInfoRecord).createdAt;

    // -----------------------------------------------------------------------
    // 2. Build the candidate record.
    //    - On create: use the full input data + new createdAt.
    //    - On update: merge input.data over existing fields, preserve createdAt.
    // -----------------------------------------------------------------------
    const base: Partial<OrganizationInfoRecord> = isCreate
      ? {}
      : (existing as OrganizationInfoRecord);

    const candidate = {
      ...base,
      ...input.data,
      $type: COLLECTION,
      createdAt,
    } as OrganizationInfoRecord;

    // -----------------------------------------------------------------------
    // 3. Validate the candidate against the lexicon.
    // -----------------------------------------------------------------------
    const record = yield* Effect.try({
      try: () => $parse(candidate),
      catch: (cause) =>
        new OrganizationInfoValidationError({
          message: `organization.info record failed lexicon validation during upsert: ${String(cause)}`,
          cause,
        }),
    });

    // -----------------------------------------------------------------------
    // 4. Write to the PDS.
    //    putRecord is idempotent for both create-new and replace-existing
    //    when used with a known rkey ("self"), so we use it for both branches.
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
          message: `PDS rejected putRecord for organization.info during upsert`,
          cause,
        }),
    });

    return {
      uri: response.data.uri,
      cid: response.data.cid,
      record,
      created: isCreate,
    };
  });

export { OrganizationInfoPdsError, OrganizationInfoValidationError };
