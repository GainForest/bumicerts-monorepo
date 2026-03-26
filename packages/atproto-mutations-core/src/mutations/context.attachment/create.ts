import { Effect } from "effect";
import { AtprotoAgent } from "../../services/AtprotoAgent";
import {
  $parse,
  main as contextAttachmentSchema,
} from "@gainforest/generated/org/hypercerts/context/attachment.defs";
import type {
  ContextAttachmentMutationResult,
  ContextAttachmentRecord,
  CreateContextAttachmentInput,
} from "./utils/types";
import {
  ContextAttachmentPdsError,
  ContextAttachmentValidationError,
} from "./utils/errors";
import { extractBlobConstraints } from "../../blob/introspect";
import { validateFileConstraints } from "../../blob/helpers";
import { BlobUploadError, FileConstraintError } from "../../blob/errors";
import {
  stubValidate,
  finalValidate,
  resolveFileInputs,
  createRecord,
} from "../../utils/shared";

const COLLECTION = "org.hypercerts.context.attachment";

const BLOB_CONSTRAINTS = extractBlobConstraints(contextAttachmentSchema);

const makePdsError = (message: string, cause: unknown) =>
  new ContextAttachmentPdsError({ message, cause });

const makeValidationError = (message: string, cause: unknown) =>
  new ContextAttachmentValidationError({ message, cause });

export const createContextAttachment = (
  input: CreateContextAttachmentInput
): Effect.Effect<
  ContextAttachmentMutationResult,
  | ContextAttachmentValidationError
  | ContextAttachmentPdsError
  | FileConstraintError
  | BlobUploadError,
  AtprotoAgent
> =>
  Effect.gen(function* () {
    yield* validateFileConstraints(input, BLOB_CONSTRAINTS);

    const { rkey: inputRkey, ...inputData } = input;
    const candidate = { $type: COLLECTION, ...inputData, createdAt: new Date().toISOString() };

    yield* stubValidate(candidate, $parse, makeValidationError);

    const resolved = yield* resolveFileInputs(candidate);
    const record = yield* finalValidate(resolved, $parse, makeValidationError);

    const { uri, cid } = yield* createRecord(COLLECTION, record, inputRkey, makePdsError);
    const rkey = uri.split("/").pop() ?? "";

    return { uri, cid, rkey, record: record as ContextAttachmentRecord } satisfies ContextAttachmentMutationResult;
  });

export {
  ContextAttachmentPdsError,
  ContextAttachmentValidationError,
  FileConstraintError,
  BlobUploadError,
};
