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
  UpdateActorProfileInput,
} from "./utils/types";
import {
  ActorProfileNotFoundError,
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
import { applyPatch } from "../../utils/shared/patch";

const COLLECTION = "app.certified.actor.profile";
const RKEY = "self";

const BLOB_CONSTRAINTS = extractBlobConstraints(actorProfileSchema);
const REQUIRED_FIELDS: ReadonlySet<string> = new Set();

const makePdsError = (message: string, cause: unknown) =>
  new ActorProfilePdsError({ message, cause });

const makeValidationError = (
  message: string,
  cause: unknown,
  issues?: ValidationIssue[],
) => new ActorProfileValidationError({ message, cause, issues });

export const updateActorProfile = (
  input: UpdateActorProfileInput,
): Effect.Effect<
  ActorProfileMutationResult,
  | ActorProfileValidationError
  | ActorProfileNotFoundError
  | ActorProfilePdsError
  | FileConstraintError
  | BlobUploadError,
  AtprotoAgent
> =>
  Effect.gen(function* () {
    yield* validateFileConstraints(input.data, BLOB_CONSTRAINTS);

    const existing = yield* fetchRecord(COLLECTION, RKEY, $parse, makePdsError);

    if (existing === null) {
      return yield* Effect.fail(
        new ActorProfileNotFoundError({ repo: (yield* AtprotoAgent).assertDid }),
      );
    }

    const patched = applyPatch(
      existing,
      input.data,
      input.unset,
      REQUIRED_FIELDS,
    ) as ActorProfileRecord;
    patched.$type = COLLECTION;
    patched.createdAt = existing.createdAt;

    yield* stubValidate(patched, $parse, makeValidationError);

    const resolved = yield* resolveFileInputs(patched);
    const record = yield* finalValidate(resolved, $parse, makeValidationError);

    const { uri, cid } = yield* putRecord(COLLECTION, RKEY, record, makePdsError);

    return {
      uri,
      cid,
      record: record as ActorProfileRecord,
    } satisfies ActorProfileMutationResult;
  });

export {
  ActorProfileNotFoundError,
  ActorProfilePdsError,
  ActorProfileValidationError,
  BlobUploadError,
  FileConstraintError,
};
