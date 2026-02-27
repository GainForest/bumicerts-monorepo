import { Data } from "effect";

/**
 * Raised when a file violates size or MIME type constraints extracted
 * automatically from the @atproto/lex schema for the target record type.
 * This error is emitted before any blob upload is attempted.
 */
export class FileConstraintError extends Data.TaggedError("FileConstraintError")<{
  /** Field path within the record where the violation occurred, e.g. ["logo", "image"] */
  path: string[];
  /** Human-readable description of the constraint that was violated */
  reason: string;
}> {}

/**
 * Raised when agent.uploadBlob() fails.
 * Wraps the raw error from the PDS or from reading the file's ArrayBuffer.
 */
export class BlobUploadError extends Data.TaggedError("BlobUploadError")<{
  message: string;
  cause?: unknown;
}> {}
