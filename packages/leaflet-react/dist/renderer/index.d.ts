import React__default from 'react';
import { m as LeafletLinearDocument, g as LeafletFacet } from '../index-BA1P_5HV.js';

/**
 * LeafletRenderer — readonly display component for pub.leaflet.pages.linearDocument.
 *
 * Usage:
 * ```tsx
 * import { LeafletRenderer } from "@gainforest/leaflet-react/renderer";
 *
 * <LeafletRenderer
 *   document={linearDocument}
 *   resolveImageUrl={(cid) => `https://my-pds.example/xrpc/com.atproto.sync.getBlob?did=${did}&cid=${cid}`}
 * />
 * ```
 */

interface LeafletRendererProps {
    /** The document to render. */
    document: LeafletLinearDocument;
    /**
     * Resolve a blob CID to a displayable URL.
     *
     * @example
     * ```ts
     * resolveImageUrl={(cid) => buildBlobUrl(pdsUrl, did, cid)}
     * ```
     */
    resolveImageUrl: (cid: string) => string;
    /** Additional CSS class added to the wrapper `<div>`. */
    className?: string;
}
/**
 * LeafletRenderer renders a `LeafletLinearDocument` as readonly HTML.
 *
 * It handles all supported block types and byte-indexed facets for inline
 * formatting (bold, italic, links, code, strikethrough, underline, highlight).
 */
declare const LeafletRenderer: React__default.FC<LeafletRendererProps>;

/**
 * Renders a string of plaintext with ATProto facets as React nodes.
 *
 * Facets use UTF-8 byte offsets (not character offsets), so all slicing is
 * performed on a Uint8Array rather than on the raw JS string.
 */

/**
 * Render `plaintext` with inline formatting described by `facets`.
 *
 * Returns an array of React nodes suitable for use inside any block element.
 */
declare function renderFacetedText(plaintext: string, facets?: LeafletFacet[]): React__default.ReactNode[];

export { LeafletRenderer, type LeafletRendererProps, renderFacetedText };
