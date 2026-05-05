import type { LeafletLinearDocument } from "@gainforest/leaflet-react";
import {
  $parse as parseLinearDocument,
  type Main as LinearDocumentRecord,
} from "@gainforest/generated/pub/leaflet/pages/linearDocument.defs";

const LINEAR_DOCUMENT_TYPE = "pub.leaflet.pages.linearDocument";
const LINEAR_DOCUMENT_BLOCK_TYPE = "pub.leaflet.pages.linearDocument#block";

/**
 * Converts a plain text string into a LeafletLinearDocument
 * (pub.leaflet.pages.linearDocument) format.
 *
 * Splits by double newlines into separate text blocks for paragraph separation.
 * Single newlines within a paragraph are preserved.
 *
 * Used for server-side mutations where the input is plain text (e.g. onboarding
 * form, AI-generated descriptions) and needs to be stored as a LinearDocument.
 *
 * @example
 * textToLinearDocument("Hello world.\n\nSecond paragraph.")
 * // → { blocks: [{ block: { $type: "pub.leaflet.blocks.text", plaintext: "Hello world." } }, ...] }
 */
export function textToLinearDocument(text: string): LeafletLinearDocument {
  const paragraphs = text.split(/\n\n+/).filter((p) => p.trim().length > 0);
  return {
    $type: LINEAR_DOCUMENT_TYPE,
    blocks: paragraphs.map((paragraph) => ({
      $type: LINEAR_DOCUMENT_BLOCK_TYPE,
      block: {
        $type: "pub.leaflet.blocks.text" as const,
        plaintext: paragraph.trim(),
      },
    })),
  };
}

export function normalizeLinearDocumentForRecord(
  document: LeafletLinearDocument,
): LinearDocumentRecord {
  return parseLinearDocument({
    $type: LINEAR_DOCUMENT_TYPE,
    ...(("id" in document && typeof document.id === "string")
      ? { id: document.id }
      : {}),
    blocks: document.blocks.map((wrapper) => ({
      $type: LINEAR_DOCUMENT_BLOCK_TYPE,
      ...(("alignment" in wrapper && typeof wrapper.alignment === "string")
        ? { alignment: wrapper.alignment }
        : {}),
      block: wrapper.block,
    })),
  });
}

/**
 * @deprecated Use `textToLinearDocument` instead.
 */
export const plainTextToLinearDocument = textToLinearDocument;
