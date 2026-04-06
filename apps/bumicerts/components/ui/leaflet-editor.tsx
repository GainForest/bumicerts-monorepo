"use client";

/**
 * LeafletEditor wrapper for bumicerts.
 *
 * - Imports editor.css so consumers don't have to manage the stylesheet.
 * - Configures resolveImageUrl using the owner's DID + PDS host.
 * - Wires up onImageUpload via the trpc.blob.upload mutation so images in
 *   the document body are uploaded to the ATProto PDS and stored as blob CIDs.
 *
 * Usage:
 * ```tsx
 * <LeafletEditor
 *   content={linearDoc}
 *   onChange={setLinearDoc}
 *   ownerDid={auth.user.did}
 *   placeholder="Describe your impact story..."
 *   onImageUploadError={(error) => setError(error)}
 * />
 * ```
 */

import "@gainforest/leaflet-react/editor.css";
import { LeafletEditor as LeafletEditorBase } from "@gainforest/leaflet-react/editor";
import type { LeafletEditorProps } from "@gainforest/leaflet-react/editor";
import { buildBlobUrl } from "@gainforest/leaflet-react/utils";
import type { LeafletLinearDocument, ImageUploadResult } from "@gainforest/leaflet-react";
import { trpc } from "@/lib/trpc/client";
import { toSerializableFile } from "@/lib/mutations-utils";
import { formatError } from "@/lib/utils/trpc-errors";
import { useCallback } from "react";

// The PDS host for gainforest-hosted users.
const DEFAULT_PDS_HOST = "https://bsky.network";

interface BumicertsLeafletEditorProps
  extends Omit<LeafletEditorProps, "resolveImageUrl" | "onImageUpload"> {
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
   * Called when an image upload fails.
   * Receives a user-friendly error message.
   */
  onImageUploadError?: (error: string) => void;
}

export function LeafletEditor({
  content,
  onChange,
  ownerDid,
  pdsHost = DEFAULT_PDS_HOST,
  placeholder,
  className,
  onImageUploadError,
}: BumicertsLeafletEditorProps) {
  const uploadBlobMutation = trpc.blob.upload.useMutation();

  const resolveImageUrl = useCallback(
    (cid: string): string => buildBlobUrl(pdsHost, ownerDid, cid),
    [pdsHost, ownerDid]
  );

  const handleImageUpload = useCallback(
    async (file: File): Promise<ImageUploadResult> => {
      try {
        const serializableFile = await toSerializableFile(file);
        const result = await uploadBlobMutation.mutateAsync({
          file: serializableFile,
        });
        // result.blobRef is typed as `object` in the mutation package.
        // We know its shape from the blob upload implementation.
        const blobRef = result.blobRef as {
          $type: "blob";
          ref: { $link: string };
          mimeType: string;
          size: number;
        };
        return {
          cid: blobRef.ref.$link,
          url: URL.createObjectURL(file),
        };
      } catch (err) {
        const message = formatError(err);
        onImageUploadError?.(message);
        throw err; // Re-throw so the editor can handle the failure
      }
    },
    [uploadBlobMutation, onImageUploadError]
  );

  return (
    <LeafletEditorBase
      content={content}
      onChange={onChange}
      resolveImageUrl={resolveImageUrl}
      onImageUpload={handleImageUpload}
      placeholder={placeholder}
      className={className}
    />
  );
}
