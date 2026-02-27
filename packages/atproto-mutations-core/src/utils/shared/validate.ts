import { Effect } from "effect";
import { stubBlobRefs, resolveFileInputs } from "../../blob/helpers";
import { AtprotoAgent } from "../../services/AtprotoAgent";
import { BlobUploadError } from "../../blob/errors";

/**
 * Stub-validate a candidate record before any uploads.
 *
 * Replaces every file input (File | Blob | SerializableFile) in `candidate`
 * with a structurally valid dummy BlobRef, then runs the lexicon parser.
 * This catches non-blob errors — bad field values, missing required fields,
 * type mismatches — without spending any bandwidth on uploads.
 *
 * Run this immediately after building the candidate, before `resolveFileInputs`.
 */
export const stubValidate = <TValidationError>(
  candidate: object,
  parse: (v: unknown) => unknown,
  makeValidationError: (message: string, cause: unknown) => TValidationError
): Effect.Effect<void, TValidationError> =>
  Effect.try({
    try: () => {
      parse(stubBlobRefs(candidate));
    },
    catch: (cause) => makeValidationError(String(cause), cause),
  });

/**
 * Final-validate a candidate record after file uploads.
 *
 * Runs the lexicon parser on the fully-resolved record (all file inputs
 * replaced with real BlobRefs). Returns the parsed, typed record on success.
 *
 * Run this after `resolveFileInputs`, before writing to the PDS.
 */
export const finalValidate = <TRecord, TValidationError>(
  resolved: object,
  parse: (v: unknown) => TRecord,
  makeValidationError: (message: string, cause: unknown) => TValidationError
): Effect.Effect<TRecord, TValidationError> =>
  Effect.try({
    try: () => parse(resolved),
    catch: (cause) => makeValidationError(String(cause), cause),
  });

export { resolveFileInputs } from "../../blob/helpers";
export type { AtprotoAgent };
export type { BlobUploadError };
