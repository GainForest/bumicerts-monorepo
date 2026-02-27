import { isBlobRef as lexIsBlobRef } from "@atproto/lex";
import type { BlobRef } from "@atproto/lex";

// ---------------------------------------------------------------------------
// SerializableFile — a File that can cross a Next.js server action boundary
// ---------------------------------------------------------------------------

/**
 * A JSON-safe representation of a browser File or Blob.
 * Use `toSerializableFile` to convert a File/Blob to this shape,
 * then pass it across the server action boundary and let the mutation
 * upload it via `resolveFileInputs`.
 */
export type SerializableFile = {
  /** Discriminant — always true */
  $file: true;
  /** Original filename (or "blob" if the source was a plain Blob) */
  name: string;
  /** MIME type (e.g. "image/jpeg") */
  type: string;
  /** File size in bytes */
  size: number;
  /** Base64-encoded raw bytes */
  data: string;
};

// ---------------------------------------------------------------------------
// FileOrBlobRef — the union callers can pass wherever a BlobRef is expected
// ---------------------------------------------------------------------------

/**
 * Anywhere a record type has a BlobRef, callers can pass any of:
 *   - File         — browser File object (client-side only)
 *   - Blob         — browser Blob object (client-side only)
 *   - SerializableFile — JSON-safe file descriptor (works across action boundaries)
 *   - BlobRef      — pre-uploaded blob reference (pass-through, no re-upload)
 */
export type FileOrBlobRef = File | Blob | SerializableFile | BlobRef;

// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------

export const isSerializableFile = (v: unknown): v is SerializableFile =>
  typeof v === "object" &&
  v !== null &&
  (v as Record<string, unknown>)["$file"] === true;

/**
 * Authoritative BlobRef guard — delegates to @atproto/lex's own implementation.
 *
 * Note: this returns true for plain-object BlobRefs `{ $type: "blob", ref: <CID>, ... }`
 * but false for @atproto/lexicon `BlobRef` class instances (a different representation
 * returned by @atproto/api when fetching existing records).
 * Use `isAnyBlobRef` if you need to catch both.
 */
export const isBlobRef = (v: unknown): v is BlobRef => lexIsBlobRef(v);

/**
 * Extended BlobRef guard that also recognises @atproto/lexicon BlobRef class instances.
 *
 * @atproto/api returns these class instances when you read back records from the PDS.
 * They have the shape `{ ref: CID, mimeType: string, size: number, original: {...} }`.
 * @atproto/lex's isBlobRef rejects them (they're not plain objects), but they carry
 * a real CID object in `.ref` and can be normalised to a plain BlobRef.
 */
export function isAnyBlobRef(v: unknown): boolean {
  if (v == null || typeof v !== "object") return false;
  // @atproto/lex plain-object BlobRef
  if (lexIsBlobRef(v)) return true;
  // @atproto/lexicon class BlobRef: has .ref (CID), .mimeType (string), .size (number)
  const o = v as Record<string, unknown>;
  return (
    typeof o["mimeType"] === "string" &&
    typeof o["size"] === "number" &&
    o["ref"] != null &&
    typeof o["ref"] === "object"
  );
}

/**
 * Convert any BlobRef (plain or @atproto/lexicon class instance) to a plain-object
 * BlobRef that @atproto/lex's isBlobRef and $parse accept.
 *
 * For @atproto/lexicon class BlobRefs, the CID instance is already in `.ref`.
 * For plain-object BlobRefs, they pass through unchanged.
 */
export function normalizeBlobRef(v: unknown): unknown {
  if (lexIsBlobRef(v)) return v; // already a valid plain BlobRef
  // @atproto/lexicon class BlobRef
  const o = v as Record<string, unknown>;
  if (
    typeof o["mimeType"] === "string" &&
    typeof o["size"] === "number" &&
    o["ref"] != null
  ) {
    return {
      $type: "blob" as const,
      ref: o["ref"],        // CID instance — isBlobRef accepts this
      mimeType: o["mimeType"],
      size: o["size"],
    };
  }
  return v;
}

export const isFileOrBlob = (v: unknown): v is File | Blob =>
  (typeof File !== "undefined" && v instanceof File) ||
  (typeof Blob !== "undefined" && v instanceof Blob);

// ---------------------------------------------------------------------------
// WithFileInputs<T> — recursive type transform
// ---------------------------------------------------------------------------

/**
 * Recursively replaces every BlobRef leaf in T with FileOrBlobRef.
 *
 * This allows operation inputs to accept File | Blob | SerializableFile | BlobRef
 * wherever the underlying ATProto record type has a BlobRef field.
 *
 * Example:
 *   type SmallImage = { image: BlobRef }
 *   type SmallImageInput = WithFileInputs<SmallImage>
 *   // => { image: FileOrBlobRef }
 */
export type WithFileInputs<T> = T extends BlobRef
  ? FileOrBlobRef
  : T extends object
  ? { [K in keyof T]: WithFileInputs<T[K]> }
  : T;

// ---------------------------------------------------------------------------
// Converters
// ---------------------------------------------------------------------------

/**
 * Convert a browser File or Blob into a SerializableFile that can be
 * safely transmitted across a Next.js server action boundary (JSON-safe).
 *
 * Call this on the client before invoking a server action that accepts
 * file inputs.
 */
export async function toSerializableFile(file: File | Blob): Promise<SerializableFile> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  // Build base64 via binary string — avoids large intermediate allocations
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return {
    $file: true,
    name: file instanceof File ? file.name : "blob",
    type: file.type || "application/octet-stream",
    size: file.size,
    data: btoa(binary),
  };
}

/**
 * Decode a SerializableFile back to a Uint8Array for upload.
 * Called server-side inside resolveFileInputs / uploadSingle.
 */
export function fromSerializableFile(sf: SerializableFile): Uint8Array {
  const binary = atob(sf.data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
