import { Data } from "effect";

/**
 * Input failed validation against the org.hypercerts.context.attachment lexicon.
 * Raised by all operations (create, update, upsert) before any PDS call.
 */
export class ContextAttachmentValidationError extends Data.TaggedError(
  "ContextAttachmentValidationError"
)<{
  message: string;
  cause?: unknown;
}> {}

/**
 * An update, upsert (with rkey), or delete was attempted but no record with
 * that rkey exists in the repo.
 */
export class ContextAttachmentNotFoundError extends Data.TaggedError(
  "ContextAttachmentNotFoundError"
)<{
  /** The rkey that was looked up */
  rkey: string;
}> {}

/**
 * The PDS rejected or failed to process the record operation.
 * Wraps the raw error from agent.com.atproto.repo.* calls.
 */
export class ContextAttachmentPdsError extends Data.TaggedError(
  "ContextAttachmentPdsError"
)<{
  message: string;
  cause?: unknown;
}> {}
