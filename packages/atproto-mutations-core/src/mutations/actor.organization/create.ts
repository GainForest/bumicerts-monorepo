import { Effect } from "effect";
import type { ValidationIssue } from "../../result";
import { AtprotoAgent } from "../../services/AtprotoAgent";
import {
  $parse,
  main as actorOrganizationSchema,
} from "@gainforest/generated/app/certified/actor/organization.defs";
import type {
  ActorOrganizationMutationResult,
  ActorOrganizationRecord,
  CreateActorOrganizationInput,
} from "./utils/types";
import {
  ActorOrganizationAlreadyExistsError,
  ActorOrganizationPdsError,
  ActorOrganizationValidationError,
} from "./utils/errors";
import { extractBlobConstraints } from "../../blob/introspect";
import { validateFileConstraints } from "../../blob/helpers";
import { BlobUploadError, FileConstraintError } from "../../blob/errors";
import {
  createRecord,
  fetchRecord,
  finalValidate,
  resolveFileInputs,
  stubValidate,
} from "../../utils/shared";

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

export const createActorOrganization = (
  input: CreateActorOrganizationInput,
): Effect.Effect<
  ActorOrganizationMutationResult,
  | ActorOrganizationValidationError
  | ActorOrganizationAlreadyExistsError
  | ActorOrganizationPdsError
  | FileConstraintError
  | BlobUploadError,
  AtprotoAgent
> =>
  Effect.gen(function* () {
    yield* validateFileConstraints(input, BLOB_CONSTRAINTS);

    const createdAt = new Date().toISOString();
    const candidate = { $type: COLLECTION, ...input, createdAt };

    yield* stubValidate(candidate, $parse, makeValidationError);

    const existing = yield* fetchRecord(COLLECTION, RKEY, $parse, makePdsError);

    if (existing !== null) {
      return yield* Effect.fail(
        new ActorOrganizationAlreadyExistsError({
          uri: `at://${(yield* AtprotoAgent).assertDid}/${COLLECTION}/${RKEY}`,
        }),
      );
    }

    const resolved = yield* resolveFileInputs(candidate);
    const record = yield* finalValidate(resolved, $parse, makeValidationError);

    const { uri, cid } = yield* createRecord(
      COLLECTION,
      record,
      RKEY,
      makePdsError,
    );

    return {
      uri,
      cid,
      record: record as ActorOrganizationRecord,
    } satisfies ActorOrganizationMutationResult;
  });

export {
  ActorOrganizationAlreadyExistsError,
  ActorOrganizationPdsError,
  ActorOrganizationValidationError,
  BlobUploadError,
  FileConstraintError,
};
