import { Effect } from "effect";
import type { ValidationIssue } from "../../result";
import { AtprotoAgent } from "../../services/AtprotoAgent";
import {
  $parse,
} from "@gainforest/generated/app/gainforest/funding/config.defs";
import type {
  FundingConfigMutationResult,
  FundingConfigRecord,
  CreateFundingConfigInput,
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
  createRecord,
} from "../../utils/shared";

const COLLECTION = "app.gainforest.funding.config";

const makePdsError = (message: string, cause: unknown) =>
  new FundingConfigPdsError({ message, cause });

const makeValidationError = (message: string, cause: unknown, issues?: ValidationIssue[]) =>
  new FundingConfigValidationError({ message, cause, issues });

/**
 * Creates a new app.gainforest.funding.config record.
 *
 * The rkey SHOULD match the rkey of the associated org.hypercerts.claim.activity
 * record to enable the shared-rkey join in the indexer (the `fundingConfig` field
 * on activity query results is resolved via a DID + rkey lookup).
 */
export const createFundingConfig = (
  input: CreateFundingConfigInput
): Effect.Effect<
  FundingConfigMutationResult,
  FundingConfigValidationError | FundingConfigPdsError | BlobUploadError,
  AtprotoAgent
> =>
  Effect.gen(function* () {
    const { rkey: inputRkey, ...inputData } = input;
    const now = new Date().toISOString();
    const candidate = {
      $type: COLLECTION,
      ...inputData,
      createdAt: now,
      updatedAt: now,
    };

    yield* stubValidate(candidate, $parse, makeValidationError);

    const resolved = yield* resolveFileInputs(candidate);
    const record = yield* finalValidate(resolved, $parse, makeValidationError);

    const { uri, cid } = yield* createRecord(COLLECTION, record, inputRkey, makePdsError);
    const rkey = uri.split("/").pop()!;

    return {
      uri,
      cid,
      rkey,
      record: record as FundingConfigRecord,
    } satisfies FundingConfigMutationResult;
  });

export { FundingConfigPdsError, FundingConfigValidationError, BlobUploadError };
