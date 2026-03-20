"use client";

/**
 * LeafletRenderer wrapper for bumicerts.
 *
 * - Imports editor.css so consumers don't have to manage the stylesheet.
 * - Configures resolveImageUrl for both indexer-pre-resolved blobs (uri already
 *   present on the blob object) and raw CIDs (resolved via com.atproto.sync.getBlob).
 *   The underlying extractBlobImageUrl util handles the uri-first check, so the
 *   callback here is only invoked when a raw CID needs to be resolved.
 *
 * Usage:
 * ```tsx
 * <LeafletRenderer document={linearDoc} ownerDid={bumicert.organizationDid} />
 * ```
 */

// import "@gainforest/leaflet-react/editor.css";
import { LeafletRenderer as LeafletRendererBase } from "@gainforest/leaflet-react/renderer";
import type { LeafletRendererProps } from "@gainforest/leaflet-react/renderer";
import { buildBlobUrl } from "@gainforest/leaflet-react/utils";
import type { LeafletLinearDocument } from "@gainforest/leaflet-react";

// The PDS host is bsky.network for all gainforest-hosted users.
// For blobs that weren't pre-resolved by the indexer, we fall back to this.
const DEFAULT_PDS_HOST = "https://bsky.network";

interface BumicertsLeafletRendererProps extends Omit<
  LeafletRendererProps,
  "resolveImageUrl"
> {
  document: LeafletLinearDocument;
  /**
   * DID of the repo that owns this document.
   * Used as a fallback to build blob URLs when the indexer hasn't pre-resolved them.
   */
  ownerDid: string;
  /**
   * Override the PDS host for blob resolution fallback.
   * Defaults to "https://bsky.network".
   */
  pdsHost?: string;
  className?: string;
}

export function LeafletRenderer({
  document,
  ownerDid,
  pdsHost = DEFAULT_PDS_HOST,
  className,
}: BumicertsLeafletRendererProps) {
  function resolveImageUrl(cid: string): string {
    return buildBlobUrl(pdsHost, ownerDid, cid);
  }

  return (
    <LeafletRendererBase
      document={document}
      resolveImageUrl={resolveImageUrl}
      className={className}
    />
  );
}
