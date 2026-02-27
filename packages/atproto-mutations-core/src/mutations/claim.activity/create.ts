import { Effect } from "effect";
import { AtprotoAgent } from "../../services/AtprotoAgent";
import {
  $parse,
  main as claimActivitySchema,
} from "@gainforest/generated/org/hypercerts/claim/activity.defs";
import type {
  ClaimActivityMutationResult,
  ClaimActivityRecord,
  CreateClaimActivityInput,
} from "./utils/types";
import {
  ClaimActivityPdsError,
  ClaimActivityValidationError,
} from "./utils/errors";
import { extractBlobConstraints } from "../../blob/introspect";
import { validateFileConstraints } from "../../blob/helpers";
import { BlobUploadError, FileConstraintError } from "../../blob/errors";
import {
  stubValidate,
  finalValidate,
  resolveFileInputs,
  createRecord,
} from "../../utils/shared";

const COLLECTION = "org.hypercerts.claim.activity";

const BLOB_CONSTRAINTS = extractBlobConstraints(claimActivitySchema);

const makePdsError = (message: string, cause: unknown) =>
  new ClaimActivityPdsError({ message, cause });

const makeValidationError = (message: string, cause: unknown) =>
  new ClaimActivityValidationError({ message, cause });

export const createClaimActivity = (
  input: CreateClaimActivityInput
): Effect.Effect<
  ClaimActivityMutationResult,
  | ClaimActivityValidationError
  | ClaimActivityPdsError
  | FileConstraintError
  | BlobUploadError,
  AtprotoAgent
> =>
  Effect.gen(function* () {
    yield* validateFileConstraints(input, BLOB_CONSTRAINTS);

    const { rkey: inputRkey, ...inputData } = input;
    const candidate = { $type: COLLECTION, ...inputData, createdAt: new Date().toISOString() };

    yield* stubValidate(candidate, $parse, makeValidationError);

    const resolved = yield* resolveFileInputs(candidate);
    const record = yield* finalValidate(resolved, $parse, makeValidationError);

    const { uri, cid } = yield* createRecord(COLLECTION, record, inputRkey, makePdsError);
    const rkey = uri.split("/").pop()!;

    return { uri, cid, rkey, record: record as ClaimActivityRecord } satisfies ClaimActivityMutationResult;
  });

export {
  ClaimActivityPdsError,
  ClaimActivityValidationError,
  FileConstraintError,
  BlobUploadError,
};
