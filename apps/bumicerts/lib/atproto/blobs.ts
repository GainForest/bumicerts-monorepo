/**
 * ATProto Blob Utilities
 * 
 * Helper functions for working with blobs stored on Personal Data Servers (PDS).
 */

import type { AllowedPDSDomain } from "@/lib/config/pds";
import type { l } from "@atproto/lex";

/**
 * A blob reference - the standard ATProto blob format.
 * Can be a full BlobRef or a "generator" format with ref.$link.
 */
export type BlobRef = l.BlobRef;

/**
 * A blob reference in "generator" format where the CID is nested in ref.$link.
 */
export interface BlobRefGenerator {
  $type: "blob";
  ref: { $link: string };
  mimeType: string;
  size: number;
}

/**
 * Typed wrapper for small images (up to 5MB).
 */
export interface SmallImage {
  $type?: string;
  image: BlobRef;
}

/**
 * Typed wrapper for large images (up to 10MB).
 */
export interface LargeImage {
  $type?: string;
  image: BlobRef;
}

/**
 * Typed wrapper for small blobs (up to 10MB).
 */
export interface SmallBlob {
  $type?: string;
  blob: BlobRef;
}

/**
 * Typed wrapper for large blobs (up to 100MB).
 */
export interface LargeBlob {
  $type?: string;
  blob: BlobRef;
}

/**
 * Union type for any supported blob input.
 */
export type BlobInput =
  | BlobRef
  | BlobRefGenerator
  | SmallImage
  | LargeImage
  | SmallBlob
  | LargeBlob;

/**
 * Extract the CID string from various blob formats.
 */
function extractCid(blob: BlobInput): string | null {
  // BlobRefGenerator format: { ref: { $link: "cid" } }
  if ("ref" in blob && typeof blob.ref === "object" && blob.ref && "$link" in blob.ref) {
    return blob.ref.$link;
  }
  
  // Wrapped image format: { image: BlobRef }
  if ("image" in blob && blob.image) {
    return extractCid(blob.image as BlobInput);
  }
  
  // Wrapped blob format: { blob: BlobRef }
  if ("blob" in blob && blob.blob) {
    return extractCid(blob.blob as BlobInput);
  }
  
  // Standard BlobRef format: { ref: { $link: "cid" } } or { cid: "..." }
  // The @atproto/lex BlobRef type uses ref.$link
  if ("ref" in blob && typeof blob.ref === "object" && blob.ref) {
    const ref = blob.ref as { $link?: string };
    if ("$link" in ref && ref.$link) {
      return ref.$link;
    }
  }
  
  return null;
}

/**
 * Construct a URL to fetch a blob from the PDS.
 * 
 * @param did - The DID of the repository that owns the blob
 * @param blob - The blob reference (various formats supported)
 * @param pdsDomain - The PDS domain to fetch from
 * @returns The full URL to fetch the blob, or null if the blob format is invalid
 */
export function getBlobUrl(
  did: string,
  blob: BlobInput,
  pdsDomain: AllowedPDSDomain
): string | null {
  const cid = extractCid(blob);
  if (!cid) return null;
  
  return `https://${pdsDomain}/xrpc/com.atproto.sync.getBlob?did=${encodeURIComponent(did)}&cid=${encodeURIComponent(cid)}`;
}
