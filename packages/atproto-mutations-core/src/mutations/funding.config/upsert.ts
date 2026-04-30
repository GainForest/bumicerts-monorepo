import { Effect } from "effect";
import type { ValidationIssue } from "../../result";
import { AtprotoAgent } from "../../services/AtprotoAgent";
import {
  $parse,
} from "@gainforest/generated/app/gainforest/funding/config.defs";
import type {
  FundingConfigMutationResult,
  FundingConfigRecord,
  UpsertFundingConfigInput,
} from "./utils/types";
import {
  FundingConfigPdsError,
  FundingConfigValidationError,
} from "./utils/errors";
import { BlobUploadError } from "../../blob/errors";
import {
  stubValidate,
  finalValidate,
  resolveFileInputs,
  fetchRecord,
  createRecord,
  putRecord,
} from "../../utils/shared";

const COLLECTION = "app.gainforest.funding.config";

const makePdsError = (message: string, cause: unknown) =>
  new FundingConfigPdsError({ message, cause });

const makeValidationError = (message: string, cause: unknown, issues?: ValidationIssue[]) =>
  new FundingConfigValidationError({ message, cause, issues });

/**
 * Upsert a funding.config record.
 *
 * When `rkey` is provided (which it almost always should be, since the rkey
 * SHOULD match the associated activity's rkey), attempts to fetch the existing
 * record first:
 *   - If found → full replace, preserving original `createdAt`, setting fresh `updatedAt`.
 *   - If not found → create at the given rkey.
 *
 * When no `rkey` is provided → always a fresh create.
 */
export const upsertFundingConfig = (
  input: UpsertFundingConfigInput
): Effect.Effect<
  FundingConfigMutationResult & { created: boolean },
  | FundingConfigValidationError
  | FundingConfigPdsError
  | BlobUploadError,
  AtprotoAgent
> =>
  Effect.gen(function* () {
    const { rkey: inputRkey, ...inputData } = input;
    const now = new Date().toISOString();

    // No rkey — always a fresh create.
    if (inputRkey === undefined) {
      const candidate = { $type: COLLECTION, ...inputData, createdAt: now, updatedAt: now };

      yield* stubValidate(candidate, $parse, makeValidationError);

      const resolved = yield* resolveFileInputs(candidate);
      const record = yield* finalValidate(resolved, $parse, makeValidationError);

      const { uri, cid } = yield* createRecord(COLLECTION, record, undefined, makePdsError);
      const rkey = uri.split("/").pop()!;

      return { uri, cid, rkey, record: record as FundingConfigRecord, created: true };
    }

    // rkey given — fetch existing to determine create vs. replace.
    const existing = yield* fetchRecord(
      COLLECTION, inputRkey, $parse, makePdsError
    );

    const createdAt = existing !== null ? existing.createdAt : now;
    const candidate = { $type: COLLECTION, ...inputData, createdAt, updatedAt: now };

    yield* stubValidate(candidate, $parse, makeValidationError);

    const resolved = yield* resolveFileInputs(candidate);
    const record = yield* finalValidate(resolved, $parse, makeValidationError);

    const { uri, cid } = yield* putRecord(COLLECTION, inputRkey, record, makePdsError);

    return {
      uri,
      cid,
      rkey:    inputRkey,
      record:  record as FundingConfigRecord,
      created: existing === null,
    };
  });

export { FundingConfigPdsError, FundingConfigValidationError };
