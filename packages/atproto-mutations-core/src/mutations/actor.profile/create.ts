import { Effect } from "effect";
import type { ValidationIssue } from "../../result";
import { AtprotoAgent } from "../../services/AtprotoAgent";
import {
  $parse,
  main as actorProfileSchema,
} from "@gainforest/generated/app/certified/actor/profile.defs";
import type {
  ActorProfileMutationResult,
  ActorProfileRecord,
  CreateActorProfileInput,
} from "./utils/types";
import {
  ActorProfileAlreadyExistsError,
  ActorProfilePdsError,
  ActorProfileValidationError,
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

const COLLECTION = "app.certified.actor.profile";
const RKEY = "self";

const BLOB_CONSTRAINTS = extractBlobConstraints(actorProfileSchema);

const makePdsError = (message: string, cause: unknown) =>
  new ActorProfilePdsError({ message, cause });

const makeValidationError = (
  message: string,
  cause: unknown,
  issues?: ValidationIssue[],
) => new ActorProfileValidationError({ message, cause, issues });

export const createActorProfile = (
  input: CreateActorProfileInput,
): Effect.Effect<
  ActorProfileMutationResult,
  | ActorProfileValidationError
  | ActorProfileAlreadyExistsError
  | ActorProfilePdsError
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
        new ActorProfileAlreadyExistsError({
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
      record: record as ActorProfileRecord,
    } satisfies ActorProfileMutationResult;
  });

export {
  ActorProfileAlreadyExistsError,
  ActorProfilePdsError,
  ActorProfileValidationError,
  BlobUploadError,
  FileConstraintError,
};
