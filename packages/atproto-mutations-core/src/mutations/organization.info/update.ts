import { Effect } from "effect";
import { AtprotoAgent } from "../../services/AtprotoAgent";
import {
  $parse,
  main as orgInfoSchema,
} from "@gainforest/generated/app/gainforest/organization/info.defs";
import type {
  OrganizationInfoMutationResult,
  OrganizationInfoRecord,
  UpdateOrganizationInfoInput,
} from "./utils/types";
import {
  OrganizationInfoNotFoundError,
  OrganizationInfoPdsError,
  OrganizationInfoValidationError,
} from "./utils/errors";
import { applyPatch } from "./utils/merge";
import { extractBlobConstraints } from "../../blob/introspect";
import { validateFileConstraints } from "../../blob/helpers";
import { FileConstraintError, BlobUploadError } from "../../blob/errors";
import {
  stubValidate,
  finalValidate,
  resolveFileInputs,
  fetchRecord,
  putRecord,
} from "../../utils/shared";

const COLLECTION = "app.gainforest.organization.info";
const RKEY = "self";

const BLOB_CONSTRAINTS = extractBlobConstraints(orgInfoSchema);

const makePdsError = (message: string, cause: unknown) =>
  new OrganizationInfoPdsError({ message, cause });

const makeValidationError = (message: string, cause: unknown) =>
  new OrganizationInfoValidationError({ message, cause });

export const updateOrganizationInfo = (
  input: UpdateOrganizationInfoInput
): Effect.Effect<
  OrganizationInfoMutationResult,
  | OrganizationInfoValidationError
  | OrganizationInfoNotFoundError
  | OrganizationInfoPdsError
  | FileConstraintError
  | BlobUploadError,
  AtprotoAgent
> =>
  Effect.gen(function* () {
    yield* validateFileConstraints(input.data, BLOB_CONSTRAINTS);

    const existing = yield* fetchRecord<OrganizationInfoRecord, OrganizationInfoPdsError>(
      COLLECTION, RKEY, makePdsError
    );

    if (existing === null) {
      return yield* Effect.fail(
        new OrganizationInfoNotFoundError({ repo: (yield* AtprotoAgent).assertDid })
      );
    }

    const patched = applyPatch(existing, input.data, input.unset) as OrganizationInfoRecord;
    patched.$type = COLLECTION;
    patched.createdAt = existing.createdAt;

    yield* stubValidate(patched, $parse, makeValidationError);

    const resolved = yield* resolveFileInputs(patched);
    const record = yield* finalValidate(resolved, $parse, makeValidationError);

    const { uri, cid } = yield* putRecord(COLLECTION, RKEY, record, makePdsError);

    return { uri, cid, record: record as OrganizationInfoRecord } satisfies OrganizationInfoMutationResult;
  });

export {
  OrganizationInfoNotFoundError,
  OrganizationInfoPdsError,
  OrganizationInfoValidationError,
  FileConstraintError,
  BlobUploadError,
};
