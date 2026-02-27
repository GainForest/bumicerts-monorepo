import { Effect } from "effect";
import { AtprotoAgent } from "../../services/AtprotoAgent";
import {
  $parse,
  main as orgInfoSchema,
} from "@gainforest/generated/app/gainforest/organization/info.defs";
import type {
  CreateOrganizationInfoInput,
  OrganizationInfoMutationResult,
  OrganizationInfoRecord,
} from "./utils/types";
import {
  OrganizationInfoAlreadyExistsError,
  OrganizationInfoPdsError,
  OrganizationInfoValidationError,
} from "./utils/errors";
import { extractBlobConstraints } from "../../blob/introspect";
import { validateFileConstraints } from "../../blob/helpers";
import { FileConstraintError, BlobUploadError } from "../../blob/errors";
import {
  stubValidate,
  finalValidate,
  resolveFileInputs,
  fetchRecord,
  createRecord,
} from "../../utils/shared";

const COLLECTION = "app.gainforest.organization.info";
const RKEY = "self";

const BLOB_CONSTRAINTS = extractBlobConstraints(orgInfoSchema);

const makePdsError = (message: string, cause: unknown) =>
  new OrganizationInfoPdsError({ message, cause });

const makeValidationError = (message: string, cause: unknown) =>
  new OrganizationInfoValidationError({ message, cause });

export const createOrganizationInfo = (
  input: CreateOrganizationInfoInput
): Effect.Effect<
  OrganizationInfoMutationResult,
  | OrganizationInfoValidationError
  | OrganizationInfoAlreadyExistsError
  | OrganizationInfoPdsError
  | FileConstraintError
  | BlobUploadError,
  AtprotoAgent
> =>
  Effect.gen(function* () {
    yield* validateFileConstraints(input, BLOB_CONSTRAINTS);

    const createdAt = new Date().toISOString();
    const candidate = { $type: COLLECTION, ...input, createdAt };

    yield* stubValidate(candidate, $parse, makeValidationError);

    const existing = yield* fetchRecord(COLLECTION, RKEY, makePdsError);

    if (existing !== null) {
      return yield* Effect.fail(
        new OrganizationInfoAlreadyExistsError({ uri: `at://${(yield* AtprotoAgent).assertDid}/${COLLECTION}/${RKEY}` })
      );
    }

    const resolved = yield* resolveFileInputs(candidate);
    const record = yield* finalValidate(resolved, $parse, makeValidationError);

    const { uri, cid } = yield* createRecord(COLLECTION, record, RKEY, makePdsError);

    return { uri, cid, record: record as OrganizationInfoRecord } satisfies OrganizationInfoMutationResult;
  });

export {
  OrganizationInfoAlreadyExistsError,
  OrganizationInfoPdsError,
  OrganizationInfoValidationError,
  FileConstraintError,
  BlobUploadError,
};
