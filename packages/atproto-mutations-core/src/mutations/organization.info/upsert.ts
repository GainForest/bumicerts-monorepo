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
  putRecord,
} from "../../utils/shared";

const COLLECTION = "app.gainforest.organization.info";
const RKEY = "self";

const BLOB_CONSTRAINTS = extractBlobConstraints(orgInfoSchema);

const makePdsError = (message: string, cause: unknown) =>
  new OrganizationInfoPdsError({ message, cause });

const makeValidationError = (message: string, cause: unknown) =>
  new OrganizationInfoValidationError({ message, cause });

export const upsertOrganizationInfo = (
  input: CreateOrganizationInfoInput
): Effect.Effect<
  OrganizationInfoMutationResult & { created: boolean },
  | OrganizationInfoValidationError
  | OrganizationInfoPdsError
  | FileConstraintError
  | BlobUploadError,
  AtprotoAgent
> =>
  Effect.gen(function* () {
    yield* validateFileConstraints(input, BLOB_CONSTRAINTS);

    const existing = yield* fetchRecord<OrganizationInfoRecord, OrganizationInfoPdsError>(
      COLLECTION, RKEY, makePdsError
    );

    const createdAt = existing !== null
      ? existing.createdAt
      : new Date().toISOString();

    const candidate = { $type: COLLECTION, ...input, createdAt };

    yield* stubValidate(candidate, $parse, makeValidationError);

    const resolved = yield* resolveFileInputs(candidate);
    const record = yield* finalValidate(resolved, $parse, makeValidationError);

    const { uri, cid } = yield* putRecord(COLLECTION, RKEY, record, makePdsError);

    return {
      uri,
      cid,
      record: record as OrganizationInfoRecord,
      created: existing === null,
    };
  });

export { OrganizationInfoPdsError, OrganizationInfoValidationError };
