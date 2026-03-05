/**
 * Blob normalization utilities.
 *
 * At indexing time, @atproto/lex deserializes CID references into a decoded
 * object form with a byte-array hash. This module converts blobs to a compact
 * normalized form (string CID) before they are stored in the database.
 *
 * Input (from Tap events, as parsed by @atproto/lex):
 * {
 *   "$type": "blob",
 *   "ref": { "code": 85, "hash": {0: 18, 1: 32, ...}, "version": 1 },
 *   "mimeType": "image/jpeg",
 *   "size": 15736
 * }
 *
 * Output (stored in PostgreSQL):
 * {
 *   "$type": "blob",
 *   "cid": "QmcvfEudLvB9pH1WpRCrBiCmzVFac9GfGkTJTfPdusnyec",
 *   "mimeType": "image/jpeg",
 *   "size": 15736
 * }
 */

import { CID, type Version } from "multiformats/cid";
import * as Digest from "multiformats/hashes/digest";

export interface NormalizedBlob {
  $type: "blob";
  cid: string;
  mimeType: string | null;
  size: number | null;
}

/**
 * Convert a decoded CID ref object to its string representation.
 *
 * The decoded form has:
 *   ref.hash:    a plain object whose keys are numeric indices (not a real Uint8Array)
 *                — this is the raw multihash bytes (already includes hash fn code + digest length)
 *   ref.code:    multicodec code (e.g. 85 = 0x55 = raw, used for ATProto blobs)
 *   ref.version: CID version (1)
 *
 * We must use CID.create(version, code, digest) — NOT CID.decode(bytes).
 * CID.decode() expects full CID bytes (version + codec + multihash concatenated),
 * but `ref.hash` is only the multihash portion. Passing just the hash bytes to
 * CID.decode() causes it to misinterpret the first hash bytes as version/codec,
 * producing a wrong CID encoding (e.g. bafyb... instead of bafkr...).
 */
function cidRefToString(ref: unknown): string | null {
  try {
    if (ref == null || typeof ref !== "object") return null;
    const r = ref as Record<string, unknown>;

    const version = r["version"];
    const code = r["code"];
    const hash = r["hash"];

    if (hash == null || typeof hash !== "object") return null;
    if (typeof version !== "number" || typeof code !== "number") return null;

    // The hash is stored as {0: byte, 1: byte, ...} — convert to Uint8Array
    const hashObj = hash as Record<string, number>;
    const length = Object.keys(hashObj).length;
    const hashBytes = new Uint8Array(length);
    for (let i = 0; i < length; i++) hashBytes[i] = hashObj[i] ?? 0;

    // Decode the multihash bytes into a proper Digest, then create the CID
    // with the correct version and multicodec preserved from the original ref.
    const digest = Digest.decode(hashBytes);
    const cid = CID.create(version as Version, code, digest);
    return cid.toString();
  } catch {
    return null;
  }
}

/**
 * Check whether a value is a raw (un-normalized) blob object.
 * i.e. has $type === "blob" and a ref field (either $link string or hash byte-array).
 */
function isRawBlob(val: unknown): boolean {
  if (val == null || typeof val !== "object") return false;
  const obj = val as Record<string, unknown>;
  return obj["$type"] === "blob" && obj["ref"] != null;
}

/**
 * Convert a raw blob (any ref form) to the proper BlobRef format that
 * @atproto/lex validators accept: { $type: "blob", ref: CID, mimeType, size }.
 *
 * Used only for pre-validation — not for DB storage.
 * Returns the input unchanged if it is not a blob.
 */
export function toBlobRef(raw: unknown): unknown {
  if (raw == null || typeof raw !== "object") return raw;
  const obj = raw as Record<string, unknown>;
  if (obj["$type"] !== "blob" || obj["ref"] == null) return raw;

  const mimeType = typeof obj["mimeType"] === "string" ? obj["mimeType"] : "";
  const size = typeof obj["size"] === "number" ? obj["size"] : 0;
  const ref = obj["ref"] as Record<string, unknown>;

  let cidObj: unknown = null;
  if (typeof ref["$link"] === "string") {
    try { cidObj = CID.parse(ref["$link"]); } catch { /* ignore */ }
  }
  if (!cidObj) cidObj = (() => { try { return cidFromRef(ref); } catch { return null; } })();
  if (!cidObj) return raw;

  return { $type: "blob", ref: cidObj, mimeType, size };
}

/**
 * Recursively walk a record and convert all blob objects to proper BlobRef form
 * (with CID instance as ref). Used for pre-validation only.
 */
export function prepareBlobsForValidation<T>(record: T): T {
  if (record == null || typeof record !== "object") return record;
  if (Array.isArray(record)) {
    return record.map(prepareBlobsForValidation) as unknown as T;
  }
  const obj = record as Record<string, unknown>;
  if (obj["$type"] === "blob" && obj["ref"] != null) {
    return toBlobRef(obj) as unknown as T;
  }
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    result[key] = prepareBlobsForValidation(value);
  }
  return result as unknown as T;
}

/**
 * Reconstruct a CID instance from a decoded ref object using the correct
 * version, multicodec, and multihash — same logic as cidRefToString().
 * Used by toBlobRef() which needs a CID instance (not a string).
 */
function cidFromRef(ref: Record<string, unknown>): CID {
  const version = ref["version"];
  const code = ref["code"];
  const hash = ref["hash"];

  if (hash == null || typeof hash !== "object") throw new Error("missing hash");
  if (typeof version !== "number" || typeof code !== "number") throw new Error("missing version/code");

  const hashObj = hash as Record<string, number>;
  const length = Object.keys(hashObj).length;
  const hashBytes = new Uint8Array(length);
  for (let i = 0; i < length; i++) hashBytes[i] = hashObj[i] ?? 0;

  const digest = Digest.decode(hashBytes);
  return CID.create(version as Version, code, digest);
}

/**
 * Check whether a value is already a normalized blob object.
 * i.e. has $type === "blob" and a cid string.
 */
function isNormalizedBlob(val: unknown): boolean {
  if (val == null || typeof val !== "object") return false;
  const obj = val as Record<string, unknown>;
  return obj["$type"] === "blob" && typeof obj["cid"] === "string";
}

/**
 * Normalize a single blob object (raw or already normalized) to compact form.
 * Returns null if the input is not a recognizable blob.
 */
export function normalizeBlob(raw: unknown): NormalizedBlob | null {
  if (raw == null || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;

  if (obj["$type"] !== "blob") return null;

  const mimeType = typeof obj["mimeType"] === "string" ? obj["mimeType"] : null;
  const size = typeof obj["size"] === "number" ? obj["size"] : null;

  // Already normalized
  if (typeof obj["cid"] === "string") {
    return { $type: "blob", cid: obj["cid"], mimeType, size };
  }

  // Convert from decoded ref form (hash byte-array) or $link string form
  const ref = obj["ref"];
  let cid: string | null = null;
  if (ref != null && typeof ref === "object") {
    const r = ref as Record<string, unknown>;
    if (typeof r["$link"] === "string") {
      cid = r["$link"];
    } else {
      cid = cidRefToString(ref);
    }
  }
  if (!cid) return null;

  return { $type: "blob", cid, mimeType, size };
}

/**
 * Recursively walk a record and replace all blob objects with their
 * normalized (compact CID) form. Handles blobs at any nesting depth
 * including inside arrays.
 *
 * Returns a new object — the input is not mutated.
 */
export function normalizeBlobsInRecord<T>(record: T): T {
  if (record == null || typeof record !== "object") return record;

  if (Array.isArray(record)) {
    return record.map(normalizeBlobsInRecord) as unknown as T;
  }

  const obj = record as Record<string, unknown>;

  // If this object IS a blob, normalize it directly
  if (isRawBlob(obj) || isNormalizedBlob(obj)) {
    const normalized = normalizeBlob(obj);
    return (normalized ?? obj) as unknown as T;
  }

  // Otherwise recurse into each field
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    result[key] = normalizeBlobsInRecord(value);
  }
  return result as unknown as T;
}
