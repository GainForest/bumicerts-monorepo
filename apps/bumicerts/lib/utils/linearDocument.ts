import type { LeafletLinearDocument } from "@gainforest/leaflet-react";

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
    blocks: paragraphs.map((paragraph) => ({
      block: {
        $type: "pub.leaflet.blocks.text" as const,
        plaintext: paragraph.trim(),
      },
    })),
  };
}

/**
 * @deprecated Use `textToLinearDocument` instead.
 */
export const plainTextToLinearDocument = textToLinearDocument;
