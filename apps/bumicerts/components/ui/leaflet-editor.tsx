"use client";

/**
 * LeafletEditor wrapper for bumicerts.
 *
 * - Imports editor.css so consumers don't have to manage the stylesheet.
 * - Configures resolveImageUrl using the owner's DID + PDS host.
 * - Temporarily disables image upload for app integrations while keeping
 *   rendering support for existing image blocks.
 *
 * Usage:
 * ```tsx
 * <LeafletEditor
 *   content={linearDoc}
 *   onChange={setLinearDoc}
 *   ownerDid={auth.user.did}
 *   placeholder="Describe your impact story..."
 *   initialHeight={240}
 *   minHeight={160}
 * />
 * ```
 */

import "@gainforest/leaflet-react/editor.css";
import { LeafletEditor as LeafletEditorBase } from "@gainforest/leaflet-react/editor";
import type { LeafletEditorProps } from "@gainforest/leaflet-react/editor";
import { buildBlobUrl } from "@gainforest/leaflet-react/utils";
import type { LeafletLinearDocument } from "@gainforest/leaflet-react";
import { useCallback } from "react";

// The PDS host for gainforest-hosted users.
const DEFAULT_PDS_HOST = "https://bsky.network";

export interface BumicertsLeafletEditorProps extends Omit<
  LeafletEditorProps,
  "resolveImageUrl" | "onImageUpload" | "enableImageUpload"
> {
  content?: LeafletLinearDocument;
  onChange: (content: LeafletLinearDocument) => void;
  /**
   * DID of the repo that owns this document.
   * Used to build blob URLs for image resolution.
   */
  ownerDid: string;
  /**
   * Override the PDS host for blob URL building.
   * Defaults to "https://bsky.network".
   */
  pdsHost?: string;
  placeholder?: string;
  className?: string;
  /**
   * Convenience alias used by bumicerts forms.
   * When true, maps to `editable={false}` on the underlying editor.
   */
  disabled?: boolean;
}

export function LeafletEditor({
  content,
  onChange,
  ownerDid,
  pdsHost = DEFAULT_PDS_HOST,
  placeholder,
  className,
  editable,
  disabled,
  ...rest
}: BumicertsLeafletEditorProps) {
  const resolveImageUrl = useCallback(
    (cid: string): string => buildBlobUrl(pdsHost, ownerDid, cid),
    [pdsHost, ownerDid],
  );

  return (
    <LeafletEditorBase
      content={content}
      onChange={onChange}
      resolveImageUrl={resolveImageUrl}
      enableImageUpload={false}
      onImageUpload={async () => {
        throw new Error("Image upload is temporarily disabled.");
      }}
      editable={disabled ? false : editable}
      placeholder={placeholder}
      className={className}
      {...rest}
    />
  );
}
