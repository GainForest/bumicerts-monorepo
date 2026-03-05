/**
 * Converts a plain text string into a LinearDocument (pub.leaflet.pages.linearDocument) format.
 *
 * Splits by double newlines into separate text blocks for paragraph separation.
 * Single newlines within a paragraph are preserved.
 *
 * @example
 * plainTextToLinearDocument("Hello world.\n\nSecond paragraph.")
 * // → { blocks: [{ block: { $type: "pub.leaflet.blocks.text", plaintext: "Hello world." } }, ...] }
 */
export function plainTextToLinearDocument(text: string) {
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
