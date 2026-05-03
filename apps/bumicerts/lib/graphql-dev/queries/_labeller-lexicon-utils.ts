function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getStringProperty(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === "string" ? value : undefined;
}

function getArrayProperty(record: Record<string, unknown>, key: string): unknown[] | undefined {
  const value = record[key];
  return Array.isArray(value) ? value : undefined;
}

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
  if (!isRecord(description)) return "";

  const type = getStringProperty(description, "$type");
  const value = description.value;

  if (
    type === "org.hypercerts.defs#descriptionString" ||
    typeof value === "string"
  ) {
    return typeof value === "string" ? value : "";
  }

  if (type === "com.atproto.repo.strongRef") {
    return "";
  }

  const blocks = getArrayProperty(description, "blocks");
  if (type !== "pub.leaflet.pages.linearDocument" && !blocks) {
    return "";
  }

  const parts: string[] = [];

  for (const wrapper of blocks ?? []) {
    if (!isRecord(wrapper)) {
      continue;
    }

    const block = wrapper.block;
    if (!isRecord(block)) {
      continue;
    }

    collectBlockText(block, parts);
  }

  return parts.join("\n");
}

function collectBlockText(
  block: Record<string, unknown> | undefined,
  out: string[],
): void {
  if (!block) return;

  const type = getStringProperty(block, "$type");

  // All text-bearing leaf blocks share the `plaintext` field
  if (
    type === "pub.leaflet.blocks.text" ||
    type === "pub.leaflet.blocks.header" ||
    type === "pub.leaflet.blocks.blockquote" ||
    type === "pub.leaflet.blocks.code"
  ) {
    const plaintext = getStringProperty(block, "plaintext");
    if (plaintext && plaintext.length > 0) {
      out.push(plaintext);
    }
    return;
  }

  // Ordered/unordered lists: recurse into children → each child has a `content` block
  if (
    type === "pub.leaflet.blocks.unorderedList" ||
    type === "pub.leaflet.blocks.orderedList"
  ) {
    const children = getArrayProperty(block, "children");
    if (children) {
      for (const child of children) {
        if (!isRecord(child)) {
          continue;
        }

        const content = child.content;
        if (isRecord(content)) {
          collectBlockText(content, out);
        }

        const nestedUnordered = getArrayProperty(child, "children");
        if (nestedUnordered) {
          collectBlockText(
            {
              $type: "pub.leaflet.blocks.unorderedList",
              children: nestedUnordered,
            },
            out,
          );
        }

        const nestedOrdered = child.orderedListChildren;
        if (isRecord(nestedOrdered)) {
          collectBlockText(nestedOrdered, out);
        }
      }
    }
  }

  // All other block types (image, iframe, horizontalRule, bskyPost, math,
  // website, page, poll, button) carry no extractable plain text — skip.
}
