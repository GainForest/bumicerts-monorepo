import { Effect } from "effect";
import { AtprotoAgent } from "../../services/AtprotoAgent";
import {
  $parse,
  main as claimRightsSchema,
} from "@gainforest/generated/org/hypercerts/claim/rights.defs";
import type {
  ClaimRightsMutationResult,
  ClaimRightsRecord,
  CreateClaimRightsInput,
} from "./utils/types";
import {
  ClaimRightsPdsError,
  ClaimRightsValidationError,
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

const COLLECTION = "org.hypercerts.claim.rights";

const BLOB_CONSTRAINTS = extractBlobConstraints(claimRightsSchema);

const makePdsError = (message: string, cause: unknown) =>
  new ClaimRightsPdsError({ message, cause });

const makeValidationError = (message: string, cause: unknown) =>
  new ClaimRightsValidationError({ message, cause });

export const createClaimRights = (
  input: CreateClaimRightsInput
): Effect.Effect<
  ClaimRightsMutationResult,
  | ClaimRightsValidationError
  | ClaimRightsPdsError
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

    return { uri, cid, rkey, record: record as ClaimRightsRecord } satisfies ClaimRightsMutationResult;
  });

export {
  ClaimRightsPdsError,
  ClaimRightsValidationError,
  FileConstraintError,
  BlobUploadError,
};
