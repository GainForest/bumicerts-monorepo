import { Effect } from "effect";
import type { ValidationIssue } from "../../result";
import {
  $parse,
  main as actorProfileSchema,
} from "@gainforest/generated/app/certified/actor/profile.defs";
import type {
  ActorProfileMutationResult,
  ActorProfileRecord,
  UpsertActorProfileInput,
} from "./utils/types";
import {
  ActorProfilePdsError,
  ActorProfileValidationError,
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

export const upsertActorProfile = (
  input: UpsertActorProfileInput,
): Effect.Effect<
  ActorProfileMutationResult & { created: boolean },
  | ActorProfileValidationError
  | ActorProfilePdsError
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
      record: record as ActorProfileRecord,
      created: existing === null,
    };
  });

export {
  ActorProfilePdsError,
  ActorProfileValidationError,
  BlobUploadError,
  FileConstraintError,
};
