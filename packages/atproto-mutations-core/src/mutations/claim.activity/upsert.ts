import { Effect } from "effect";
import { AtprotoAgent } from "../../services/AtprotoAgent";
import {
  $parse,
  main as claimActivitySchema,
} from "@gainforest/generated/org/hypercerts/claim/activity.defs";
import type {
  ClaimActivityMutationResult,
  ClaimActivityRecord,
  UpsertClaimActivityInput,
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
  fetchRecord,
  createRecord,
  putRecord,
} from "../../utils/shared";

const COLLECTION = "org.hypercerts.claim.activity";

const BLOB_CONSTRAINTS = extractBlobConstraints(claimActivitySchema);

const makePdsError = (message: string, cause: unknown) =>
  new ClaimActivityPdsError({ message, cause });

const makeValidationError = (message: string, cause: unknown) =>
  new ClaimActivityValidationError({ message, cause });

export const upsertClaimActivity = (
  input: UpsertClaimActivityInput
): Effect.Effect<
  ClaimActivityMutationResult & { created: boolean },
  | ClaimActivityValidationError
  | ClaimActivityPdsError
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

      return { uri, cid, rkey, record: record as ClaimActivityRecord, created: true };
    }

    // rkey given — fetch existing to determine create vs. replace and resolve createdAt.
    const existing = yield* fetchRecord<ClaimActivityRecord, ClaimActivityPdsError>(
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
      record: record as ClaimActivityRecord,
      created: existing === null,
    };
  });

export { ClaimActivityPdsError, ClaimActivityValidationError };
