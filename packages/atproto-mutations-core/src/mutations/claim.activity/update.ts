import { Effect } from "effect";
import { AtprotoAgent } from "../../services/AtprotoAgent";
import {
  $parse,
  main as claimActivitySchema,
} from "@gainforest/generated/org/hypercerts/claim/activity.defs";
import type {
  ClaimActivityMutationResult,
  ClaimActivityRecord,
  UpdateClaimActivityInput,
} from "./utils/types";
import {
  ClaimActivityNotFoundError,
  ClaimActivityPdsError,
  ClaimActivityValidationError,
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

const COLLECTION = "org.hypercerts.claim.activity";

const BLOB_CONSTRAINTS = extractBlobConstraints(claimActivitySchema);

const makePdsError = (message: string, cause: unknown) =>
  new ClaimActivityPdsError({ message, cause });

const makeValidationError = (message: string, cause: unknown) =>
  new ClaimActivityValidationError({ message, cause });

export const updateClaimActivity = (
  input: UpdateClaimActivityInput
): Effect.Effect<
  ClaimActivityMutationResult,
  | ClaimActivityValidationError
  | ClaimActivityNotFoundError
  | ClaimActivityPdsError
  | FileConstraintError
  | BlobUploadError,
  AtprotoAgent
> =>
  Effect.gen(function* () {
    const { rkey } = input;

    yield* validateFileConstraints(input.data, BLOB_CONSTRAINTS);

    const existing = yield* fetchRecord<ClaimActivityRecord, ClaimActivityPdsError>(
      COLLECTION, rkey, makePdsError
    );

    if (existing === null) {
      return yield* Effect.fail(new ClaimActivityNotFoundError({ rkey }));
    }

    const patched = applyPatch(existing, input.data, input.unset) as ClaimActivityRecord;
    patched.$type = COLLECTION;
    patched.createdAt = existing.createdAt;

    yield* stubValidate(patched, $parse, makeValidationError);

    const resolved = yield* resolveFileInputs(patched);
    const record = yield* finalValidate(resolved, $parse, makeValidationError);

    const { uri, cid } = yield* putRecord(COLLECTION, rkey, record, makePdsError);

    return { uri, cid, rkey, record: record as ClaimActivityRecord } satisfies ClaimActivityMutationResult;
  });

export {
  ClaimActivityNotFoundError,
  ClaimActivityPdsError,
  ClaimActivityValidationError,
  FileConstraintError,
  BlobUploadError,
};
