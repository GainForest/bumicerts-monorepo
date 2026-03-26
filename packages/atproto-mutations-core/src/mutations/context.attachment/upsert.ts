import { Effect } from "effect";
import { AtprotoAgent } from "../../services/AtprotoAgent";
import {
  $parse,
  main as contextAttachmentSchema,
} from "@gainforest/generated/org/hypercerts/context/attachment.defs";
import type {
  ContextAttachmentMutationResult,
  ContextAttachmentRecord,
  UpsertContextAttachmentInput,
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
  fetchRecord,
  createRecord,
  putRecord,
} from "../../utils/shared";

const COLLECTION = "org.hypercerts.context.attachment";

const BLOB_CONSTRAINTS = extractBlobConstraints(contextAttachmentSchema);

const makePdsError = (message: string, cause: unknown) =>
  new ContextAttachmentPdsError({ message, cause });

const makeValidationError = (message: string, cause: unknown) =>
  new ContextAttachmentValidationError({ message, cause });

export const upsertContextAttachment = (
  input: UpsertContextAttachmentInput
): Effect.Effect<
  ContextAttachmentMutationResult & { created: boolean },
  | ContextAttachmentValidationError
  | ContextAttachmentPdsError
  | FileConstraintError
  | BlobUploadError,
  AtprotoAgent
> =>
  Effect.gen(function* () {
    yield* validateFileConstraints(input, BLOB_CONSTRAINTS);

    const { rkey: inputRkey, ...inputData } = input;

    // No rkey — always a fresh create; skip any existence check.
    if (inputRkey === undefined) {
      const candidate = { $type: COLLECTION, ...inputData, createdAt: new Date().toISOString() };

      yield* stubValidate(candidate, $parse, makeValidationError);

      const resolved = yield* resolveFileInputs(candidate);
      const record = yield* finalValidate(resolved, $parse, makeValidationError);

      const { uri, cid } = yield* createRecord(COLLECTION, record, undefined, makePdsError);
      const rkey = uri.split("/").pop() ?? "";

      return { uri, cid, rkey, record: record as ContextAttachmentRecord, created: true };
    }

    // rkey given — fetch existing to determine create vs. replace and resolve createdAt.
    const existing = yield* fetchRecord<ContextAttachmentRecord, ContextAttachmentPdsError>(
      COLLECTION, inputRkey, makePdsError
    );

    const createdAt = existing !== null ? existing.createdAt : new Date().toISOString();
    const candidate = { $type: COLLECTION, ...inputData, createdAt };

    yield* stubValidate(candidate, $parse, makeValidationError);

    const resolved = yield* resolveFileInputs(candidate);
    const record = yield* finalValidate(resolved, $parse, makeValidationError);

    const { uri, cid } = yield* putRecord(COLLECTION, inputRkey, record, makePdsError);

    return {
      uri,
      cid,
      rkey: inputRkey,
      record: record as ContextAttachmentRecord,
      created: existing === null,
    };
  });

export { ContextAttachmentPdsError, ContextAttachmentValidationError };
