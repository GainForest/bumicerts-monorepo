import { JSONContent } from '@tiptap/react';
import { m as LeafletLinearDocument } from '../index-BA1P_5HV.js';

/**
 * Convert a TipTap JSONContent document to a LeafletLinearDocument.
 *
 * This is the "save" path: when the user finishes editing, the TipTap JSON is
 * serialized into the ATProto Leaflet format ready to be written to the PDS.
 */

/**
 * Convert a TipTap JSONContent document to a `LeafletLinearDocument`.
 *
 * @example
 * ```ts
 * const leafletDoc = tiptapToLeaflet(editor.getJSON());
 * // Save leafletDoc to ATProto PDS
 * ```
 */
declare function tiptapToLeaflet(doc: JSONContent): LeafletLinearDocument;

/**
 * Convert a LeafletLinearDocument to a TipTap JSONContent document.
 *
 * This is the "load" path: when opening existing content for editing, the
 * ATProto Leaflet record is converted into the TipTap JSON format that the
 * editor understands.
 */

/**
 * Convert a `LeafletLinearDocument` to a TipTap `JSONContent` document.
 *
 * @param doc                  - The Leaflet document to convert
 * @param resolveImageCid      - Optional function to resolve a CID to a display URL.
 *                               If omitted, image `src` will be set to the raw CID.
 *
 * @example
 * ```ts
 * const tiptapDoc = leafletToTiptap(leafletDoc, (cid) => buildBlobUrl(pdsUrl, did, cid));
 * editor.commands.setContent(tiptapDoc);
 * ```
 */
declare function leafletToTiptap(doc: LeafletLinearDocument, resolveImageCid?: (cid: string) => string): JSONContent;

/**
 * Get the UTF-8 byte length of the portion of `text` up to character index `charIndex`.
 */
declare function byteOffsetAt(text: string, charIndex: number): number;
/**
 * Get the character index (UTF-16 string index) corresponding to a UTF-8 byte offset.
 *
 * If `byteOffset` falls in the middle of a multi-byte sequence, the offset is
 * walked back to the start of that sequence to avoid producing U+FFFD replacement
 * characters.
 */
declare function charIndexAtByteOffset(text: string, byteOffset: number): number;
/**
 * Clamp a byte offset to a valid UTF-8 character boundary.
 * If `offset` points into the middle of a multi-byte sequence, walk it back.
 */
declare function clampToCharBoundary(bytes: Uint8Array, offset: number): number;

export { byteOffsetAt, charIndexAtByteOffset, clampToCharBoundary, leafletToTiptap, tiptapToLeaflet };
