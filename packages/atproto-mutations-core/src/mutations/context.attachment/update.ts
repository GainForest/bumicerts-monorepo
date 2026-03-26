import { Effect } from "effect";
import { AtprotoAgent } from "../../services/AtprotoAgent";
import {
  $parse,
  main as contextAttachmentSchema,
} from "@gainforest/generated/org/hypercerts/context/attachment.defs";
import type {
  ContextAttachmentMutationResult,
  ContextAttachmentRecord,
  UpdateContextAttachmentInput,
} from "./utils/types";
import {
  ContextAttachmentNotFoundError,
  ContextAttachmentPdsError,
  ContextAttachmentValidationError,
} from "./utils/errors";
import { applyPatch } from "./utils/merge";
import { extractBlobConstraints } from "../../blob/introspect";
import { validateFileConstraints } from "../../blob/helpers";
import { BlobUploadError, FileConstraintError } from "../../blob/errors";
import {
  stubValidate,
  finalValidate,
  resolveFileInputs,
  fetchRecord,
  putRecord,
} from "../../utils/shared";

const COLLECTION = "org.hypercerts.context.attachment";

const BLOB_CONSTRAINTS = extractBlobConstraints(contextAttachmentSchema);

const makePdsError = (message: string, cause: unknown) =>
  new ContextAttachmentPdsError({ message, cause });

const makeValidationError = (message: string, cause: unknown) =>
  new ContextAttachmentValidationError({ message, cause });

export const updateContextAttachment = (
  input: UpdateContextAttachmentInput
): Effect.Effect<
  ContextAttachmentMutationResult,
  | ContextAttachmentValidationError
  | ContextAttachmentNotFoundError
  | ContextAttachmentPdsError
  | FileConstraintError
  | BlobUploadError,
  AtprotoAgent
> =>
  Effect.gen(function* () {
    const { rkey } = input;

    yield* validateFileConstraints(input.data, BLOB_CONSTRAINTS);

    const existing = yield* fetchRecord<ContextAttachmentRecord, ContextAttachmentPdsError>(
      COLLECTION, rkey, makePdsError
    );

    if (existing === null) {
      return yield* Effect.fail(new ContextAttachmentNotFoundError({ rkey }));
    }

    const patched = applyPatch(existing, input.data, input.unset) as ContextAttachmentRecord;
    patched.$type = COLLECTION;
    patched.createdAt = existing.createdAt;

    yield* stubValidate(patched, $parse, makeValidationError);

    const resolved = yield* resolveFileInputs(patched);
    const record = yield* finalValidate(resolved, $parse, makeValidationError);

    const { uri, cid } = yield* putRecord(COLLECTION, rkey, record, makePdsError);

    return { uri, cid, rkey, record: record as ContextAttachmentRecord } satisfies ContextAttachmentMutationResult;
  });

export {
  ContextAttachmentNotFoundError,
  ContextAttachmentPdsError,
  ContextAttachmentValidationError,
  FileConstraintError,
  BlobUploadError,
};
