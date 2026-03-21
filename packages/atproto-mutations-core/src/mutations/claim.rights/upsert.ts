import { Effect } from "effect";
import { AtprotoAgent } from "../../services/AtprotoAgent";
import {
  $parse,
} from "@gainforest/generated/org/hypercerts/claim/rights.defs";
import type {
  ClaimRightsMutationResult,
  ClaimRightsRecord,
  UpsertClaimRightsInput,
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
  fetchRecord,
  createRecord,
  putRecord,
} from "../../utils/shared";
import { main as claimRightsSchema } from "@gainforest/generated/org/hypercerts/claim/rights.defs";

const COLLECTION = "org.hypercerts.claim.rights";

const BLOB_CONSTRAINTS = extractBlobConstraints(claimRightsSchema);

const makePdsError = (message: string, cause: unknown) =>
  new ClaimRightsPdsError({ message, cause });

const makeValidationError = (message: string, cause: unknown) =>
  new ClaimRightsValidationError({ message, cause });

export const upsertClaimRights = (
  input: UpsertClaimRightsInput
): Effect.Effect<
  ClaimRightsMutationResult & { created: boolean },
  | ClaimRightsValidationError
  | ClaimRightsPdsError
  | FileConstraintError
  | BlobUploadError,
  AtprotoAgent
> =>
  Effect.gen(function* () {
    yield* validateFileConstraints(input, BLOB_CONSTRAINTS);

    const { rkey: inputRkey, ...inputData } = input;

    // No rkey — always a fresh create; skip any existence check.
    if (inputRkey === undefined) {
      const candidate = { $type: COLLECTION, ...inputData, createdAt: new Date().toISOString() };

      yield* stubValidate(candidate, $parse, makeValidationError);

      const resolved = yield* resolveFileInputs(candidate);
      const record = yield* finalValidate(resolved, $parse, makeValidationError);

      const { uri, cid } = yield* createRecord(COLLECTION, record, undefined, makePdsError);
      const rkey = uri.split("/").pop()!;

      return { uri, cid, rkey, record: record as ClaimRightsRecord, created: true };
    }

    // rkey given — fetch existing to determine create vs. replace and resolve createdAt.
    const existing = yield* fetchRecord<ClaimRightsRecord, ClaimRightsPdsError>(
      COLLECTION, inputRkey, makePdsError
    );

    const createdAt = existing !== null ? existing.createdAt : new Date().toISOString();
    const candidate = { $type: COLLECTION, ...inputData, createdAt };

    yield* stubValidate(candidate, $parse, makeValidationError);

    const resolved = yield* resolveFileInputs(candidate);
    const record = yield* finalValidate(resolved, $parse, makeValidationError);

    const { uri, cid } = yield* putRecord(COLLECTION, inputRkey, record, makePdsError);

    return {
      uri,
      cid,
      rkey: inputRkey,
      record: record as ClaimRightsRecord,
      created: existing === null,
    };
  });

export { ClaimRightsPdsError, ClaimRightsValidationError };
