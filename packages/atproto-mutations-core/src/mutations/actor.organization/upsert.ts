import { Effect } from "effect";
import type { ValidationIssue } from "../../result";
import {
  $parse,
  main as actorOrganizationSchema,
} from "@gainforest/generated/app/certified/actor/organization.defs";
import type {
  ActorOrganizationMutationResult,
  ActorOrganizationRecord,
  UpsertActorOrganizationInput,
} from "./utils/types";
import {
  ActorOrganizationPdsError,
  ActorOrganizationValidationError,
} from "./utils/errors";
import { extractBlobConstraints } from "../../blob/introspect";
import { validateFileConstraints } from "../../blob/helpers";
import { BlobUploadError, FileConstraintError } from "../../blob/errors";
import {
  fetchRecord,
  finalValidate,
  putRecord,
  resolveFileInputs,
  stubValidate,
} from "../../utils/shared";
import { AtprotoAgent } from "../../services/AtprotoAgent";

const COLLECTION = "app.certified.actor.organization";
const RKEY = "self";

const BLOB_CONSTRAINTS = extractBlobConstraints(actorOrganizationSchema);

const makePdsError = (message: string, cause: unknown) =>
  new ActorOrganizationPdsError({ message, cause });

const makeValidationError = (
  message: string,
  cause: unknown,
  issues?: ValidationIssue[],
) => new ActorOrganizationValidationError({ message, cause, issues });

export const upsertActorOrganization = (
  input: UpsertActorOrganizationInput,
): Effect.Effect<
  ActorOrganizationMutationResult & { created: boolean },
  | ActorOrganizationValidationError
  | ActorOrganizationPdsError
  | FileConstraintError
  | BlobUploadError,
  AtprotoAgent
> =>
  Effect.gen(function* () {
    yield* validateFileConstraints(input, BLOB_CONSTRAINTS);

    const existing = yield* fetchRecord(COLLECTION, RKEY, $parse, makePdsError);

    const createdAt =
      existing !== null ? existing.createdAt : new Date().toISOString();

    const candidate = { $type: COLLECTION, ...input, createdAt };

    yield* stubValidate(candidate, $parse, makeValidationError);

    const resolved = yield* resolveFileInputs(candidate);
    const record = yield* finalValidate(resolved, $parse, makeValidationError);

    const { uri, cid } = yield* putRecord(COLLECTION, RKEY, record, makePdsError);

    return {
      uri,
      cid,
      record: record as ActorOrganizationRecord,
      created: existing === null,
    };
  });

export {
  ActorOrganizationPdsError,
  ActorOrganizationValidationError,
  BlobUploadError,
  FileConstraintError,
};
