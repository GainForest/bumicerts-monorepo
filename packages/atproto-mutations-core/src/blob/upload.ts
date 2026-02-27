import { Effect } from "effect";
import { AtprotoAgent } from "../services/AtprotoAgent";
import {
  type SerializableFile,
  isSerializableFile,
  isFileOrBlob,
  fromSerializableFile,
} from "./types";
import { BlobUploadError } from "./errors";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type UploadBlobInput = {
  /** The file to upload. Can be a browser File, Blob, or a SerializableFile. */
  file: File | Blob | SerializableFile;
  /**
   * Optional MIME type override.
   * If omitted, the file's own `type` field (or "application/octet-stream") is used.
   */
  mimeType?: string;
};

export type UploadBlobResult = {
  /**
   * The BlobRef returned by the PDS after a successful upload.
   * Typed as `object` to avoid leaking @atproto/lex internal types into callers;
   * cast to `BlobRef` from `@atproto/lex` when you need the exact type.
   */
  blobRef: object;
};

// ---------------------------------------------------------------------------
// uploadBlob — standalone mutation
// ---------------------------------------------------------------------------

/**
 * Upload a single blob to the authenticated user's PDS.
 *
 * This is a standalone mutation for advanced use cases — for example, when you
 * want to pre-upload an image before constructing a record. In normal
 * application code, prefer passing File / Blob / SerializableFile directly to
 * create / update / upsert inputs; blob upload is handled automatically there.
 *
 * The returned `blobRef` must be referenced by a record write within a few
 * seconds of upload, or the PDS will garbage-collect it.
 *
 * @param input - The file to upload and an optional MIME type override.
 * @returns Effect that resolves to { blobRef } on success.
 * @throws BlobUploadError if the file cannot be read or the PDS rejects the upload.
 */
export const uploadBlob = (
  input: UploadBlobInput
): Effect.Effect<UploadBlobResult, BlobUploadError, AtprotoAgent> =>
  Effect.gen(function* () {
    const agent = yield* AtprotoAgent;
    const { file, mimeType: override } = input;

    let data: Uint8Array;
    let mimeType: string;

    if (isSerializableFile(file)) {
      data = fromSerializableFile(file);
      mimeType = override ?? file.type;
    } else if (isFileOrBlob(file)) {
      const buf = yield* Effect.tryPromise({
        try: () => file.arrayBuffer(),
        catch: (e) =>
          new BlobUploadError({ message: "Failed to read file data into ArrayBuffer", cause: e }),
      });
      data = new Uint8Array(buf);
      mimeType = override ?? (file.type || "application/octet-stream");
    } else {
      // Exhaustiveness guard — TypeScript should catch this, but be defensive
      return yield* Effect.die(
        new Error("uploadBlob: input.file must be a File, Blob, or SerializableFile")
      );
    }

    const res = yield* Effect.tryPromise({
      try: () => agent.uploadBlob(data, { encoding: mimeType }),
      catch: (e) => new BlobUploadError({ message: "PDS blob upload failed", cause: e }),
    });

    // agent.uploadBlob returns a @atproto/lexicon BlobRef class instance.
    // Re-wrap as a plain object so @atproto/lex's isBlobRef accepts it.
    const raw = res.data.blob as { ref: unknown; mimeType: string; size: number };
    const plainBlobRef = {
      $type: "blob" as const,
      ref: raw.ref,
      mimeType: raw.mimeType,
      size: raw.size,
    };

    return { blobRef: plainBlobRef as object };
  });

// Re-export error class so callers can `import { BlobUploadError } from "./blob/upload"`
export { BlobUploadError };
