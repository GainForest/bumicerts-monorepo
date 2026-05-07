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
  UpdateActorOrganizationInput,
} from "./utils/types";
import {
  ActorOrganizationNotFoundError,
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
import { applyPatch } from "../../utils/shared/patch";

const COLLECTION = "app.certified.actor.organization";
const RKEY = "self";

const BLOB_CONSTRAINTS = extractBlobConstraints(actorOrganizationSchema);
const REQUIRED_FIELDS: ReadonlySet<string> = new Set();

const makePdsError = (message: string, cause: unknown) =>
  new ActorOrganizationPdsError({ message, cause });

const makeValidationError = (
  message: string,
  cause: unknown,
  issues?: ValidationIssue[],
) => new ActorOrganizationValidationError({ message, cause, issues });

export const updateActorOrganization = (
  input: UpdateActorOrganizationInput,
): Effect.Effect<
  ActorOrganizationMutationResult,
  | ActorOrganizationValidationError
  | ActorOrganizationNotFoundError
  | ActorOrganizationPdsError
  | FileConstraintError
  | BlobUploadError,
  AtprotoAgent
> =>
  Effect.gen(function* () {
    yield* validateFileConstraints(input.data, BLOB_CONSTRAINTS);

    const existing = yield* fetchRecord(COLLECTION, RKEY, $parse, makePdsError);

    if (existing === null) {
      return yield* Effect.fail(
        new ActorOrganizationNotFoundError({
          repo: (yield* AtprotoAgent).assertDid,
        }),
      );
    }

    const patched = applyPatch(
      existing,
      input.data,
      input.unset,
      REQUIRED_FIELDS,
    ) as ActorOrganizationRecord;
    patched.$type = COLLECTION;
    patched.createdAt = existing.createdAt;

    yield* stubValidate(patched, $parse, makeValidationError);

    const resolved = yield* resolveFileInputs(patched);
    const record = yield* finalValidate(resolved, $parse, makeValidationError);

    const { uri, cid } = yield* putRecord(
      COLLECTION,
      RKEY,
      record,
      makePdsError,
    );

    return {
      uri,
      cid,
      record: record as ActorOrganizationRecord,
    } satisfies ActorOrganizationMutationResult;
  });

export {
  ActorOrganizationNotFoundError,
  ActorOrganizationPdsError,
  ActorOrganizationValidationError,
  BlobUploadError,
  FileConstraintError,
};
