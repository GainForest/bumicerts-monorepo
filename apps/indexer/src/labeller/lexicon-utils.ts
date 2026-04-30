import type { Main as LinearDocument } from "@/generated/pub/leaflet/pages/linearDocument.defs.ts";

/**
 * Extracts plain text from the current Hypercerts description union for use in
 * scoring and HuggingFace classification.
 *
 * Supported forms:
 *   - org.hypercerts.defs#descriptionString  → returns `.value`
 *   - pub.leaflet.pages.linearDocument       → walks blocks and extracts text
 *   - com.atproto.repo.strongRef             → returns empty string
 */
export function extractDescriptionText(
  description: unknown,
): string {
  if (!description || typeof description !== "object") return "";

  const typed = description as { $type?: string };

  const value = (description as { value?: unknown }).value;
  if (
    typed.$type === "org.hypercerts.defs#descriptionString" ||
    typeof value === "string"
  ) {
    return typeof value === "string" ? value : "";
  }

  if (typed.$type === "com.atproto.repo.strongRef") {
    return "";
  }

  const maybeBlocks = (description as { blocks?: unknown }).blocks;
  if (
    typed.$type !== "pub.leaflet.pages.linearDocument" &&
    !Array.isArray(maybeBlocks)
  ) {
    return "";
  }

  const doc = description as LinearDocument;

  const parts: string[] = [];

  for (const wrapper of doc.blocks) {
    collectBlockText(wrapper.block, parts);
  }

  return parts.join("\n");
}

function collectBlockText(
  block: { $type?: string; [key: string]: unknown } | undefined,
  out: string[],
): void {
  if (!block || typeof block !== "object") return;

  const type = block.$type;

  // All text-bearing leaf blocks share the `plaintext` field
  if (
    type === "pub.leaflet.blocks.text" ||
    type === "pub.leaflet.blocks.header" ||
    type === "pub.leaflet.blocks.blockquote" ||
    type === "pub.leaflet.blocks.code"
  ) {
    const pt = block.plaintext;
    if (typeof pt === "string" && pt.length > 0) {
      out.push(pt);
    }
    return;
  }

  // Ordered/unordered lists: recurse into children → each child has a `content` block
  if (
    type === "pub.leaflet.blocks.unorderedList" ||
    type === "pub.leaflet.blocks.orderedList"
  ) {
    const children = block.children;
    if (Array.isArray(children)) {
      for (const child of children) {
        if (child && typeof child === "object") {
          // Each list item has a `content` which is a typed union of block types
          collectBlockText(
            (child as { content?: unknown }).content as {
              $type?: string;
              [key: string]: unknown;
            },
            out,
          );

          const nestedUnordered = (child as { children?: unknown }).children;
          if (Array.isArray(nestedUnordered)) {
            collectBlockText(
              {
                $type: "pub.leaflet.blocks.unorderedList",
                children: nestedUnordered,
              },
              out,
            );
          }

          const nestedOrdered = (child as { orderedListChildren?: unknown })
            .orderedListChildren;
          if (nestedOrdered && typeof nestedOrdered === "object") {
            collectBlockText(
              nestedOrdered as { $type?: string; [key: string]: unknown },
              out,
            );
          }
        }
      }
    }
    return;
  }

  // All other block types (image, iframe, horizontalRule, bskyPost, math,
  // website, page, poll, button) carry no extractable plain text — skip.
}
