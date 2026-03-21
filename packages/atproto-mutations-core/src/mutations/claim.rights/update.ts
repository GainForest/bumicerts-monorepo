import { Effect } from "effect";
import { AtprotoAgent } from "../../services/AtprotoAgent";
import {
  $parse,
  main as claimRightsSchema,
} from "@gainforest/generated/org/hypercerts/claim/rights.defs";
import type {
  ClaimRightsMutationResult,
  ClaimRightsRecord,
  UpdateClaimRightsInput,
} from "./utils/types";
import {
  ClaimRightsNotFoundError,
  ClaimRightsPdsError,
  ClaimRightsValidationError,
} from "./utils/errors";
import { applyPatch } from "./utils/merge";
import { extractBlobConstraints } from "../../blob/introspect";
import { validateFileConstraints } from "../../blob/helpers";
import { BlobUploadError, FileConstraintError } from "../../blob/errors";
import {
  stubValidate,
  finalValidate,
  resolveFileInputs,
  fetchRecord,
  putRecord,
} from "../../utils/shared";

const COLLECTION = "org.hypercerts.claim.rights";

const BLOB_CONSTRAINTS = extractBlobConstraints(claimRightsSchema);

const makePdsError = (message: string, cause: unknown) =>
  new ClaimRightsPdsError({ message, cause });

const makeValidationError = (message: string, cause: unknown) =>
  new ClaimRightsValidationError({ message, cause });

export const updateClaimRights = (
  input: UpdateClaimRightsInput
): Effect.Effect<
  ClaimRightsMutationResult,
  | ClaimRightsValidationError
  | ClaimRightsNotFoundError
  | ClaimRightsPdsError
  | FileConstraintError
  | BlobUploadError,
  AtprotoAgent
> =>
  Effect.gen(function* () {
    const { rkey } = input;

    yield* validateFileConstraints(input.data, BLOB_CONSTRAINTS);

    const existing = yield* fetchRecord<ClaimRightsRecord, ClaimRightsPdsError>(
      COLLECTION, rkey, makePdsError
    );

    if (existing === null) {
      return yield* Effect.fail(new ClaimRightsNotFoundError({ rkey }));
    }

    const patched = applyPatch(existing, input.data, input.unset) as ClaimRightsRecord;
    patched.$type = COLLECTION;
    patched.createdAt = existing.createdAt;

    yield* stubValidate(patched, $parse, makeValidationError);

    const resolved = yield* resolveFileInputs(patched);
    const record = yield* finalValidate(resolved, $parse, makeValidationError);

    const { uri, cid } = yield* putRecord(COLLECTION, rkey, record, makePdsError);

    return { uri, cid, rkey, record: record as ClaimRightsRecord } satisfies ClaimRightsMutationResult;
  });

export {
  ClaimRightsNotFoundError,
  ClaimRightsPdsError,
  ClaimRightsValidationError,
  FileConstraintError,
  BlobUploadError,
};
