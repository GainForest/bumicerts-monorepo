import type { LeafletLinearDocument } from "@gainforest/leaflet-react";

const MINIMUM_LONG_DESCRIPTION_TEXT_LENGTH = 50;

type CanonicalLeafletValue =
  | boolean
  | number
  | string
  | CanonicalLeafletValue[]
  | { [key: string]: CanonicalLeafletValue };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function collectListText(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  const text: string[] = [];

  for (const item of value) {
    if (!isRecord(item)) continue;

    text.push(collectBlockText(item["content"]));
    text.push(...collectListText(item["children"]));
  }

  return text.filter((entry) => entry.length > 0);
}

function collectBlockText(block: unknown): string {
  if (!isRecord(block)) return "";

  const type = getTrimmedString(block["$type"]);
  if (
    type === "pub.leaflet.blocks.text" ||
    type === "pub.leaflet.blocks.header" ||
    type === "pub.leaflet.blocks.blockquote" ||
    type === "pub.leaflet.blocks.code"
  ) {
    return getTrimmedString(block["plaintext"]);
  }

  if (
    type === "pub.leaflet.blocks.unorderedList" ||
    type === "pub.leaflet.blocks.orderedList"
  ) {
    return collectListText(block["children"]).join("\n");
  }

  return "";
}

function listHasMeaningfulNonTextContent(value: unknown): boolean {
  if (!Array.isArray(value)) return false;

  for (const item of value) {
    if (!isRecord(item)) continue;

    if (blockHasMeaningfulNonTextContent(item["content"])) {
      return true;
    }

    if (listHasMeaningfulNonTextContent(item["children"])) {
      return true;
    }
  }

  return false;
}

function blockHasMeaningfulNonTextContent(block: unknown): boolean {
  if (!isRecord(block)) return false;

  const type = getTrimmedString(block["$type"]);

  if (
    type === "pub.leaflet.blocks.unorderedList" ||
    type === "pub.leaflet.blocks.orderedList"
  ) {
    return listHasMeaningfulNonTextContent(block["children"]);
  }

  if (type === "pub.leaflet.blocks.image") {
    return isRecord(block["image"]);
  }

  if (type === "pub.leaflet.blocks.iframe") {
    return getTrimmedString(block["url"]).length > 0;
  }

  if (type === "pub.leaflet.blocks.website") {
    return getTrimmedString(block["src"]).length > 0;
  }

  if (type === "pub.leaflet.blocks.math") {
    return getTrimmedString(block["tex"]).length > 0;
  }

  if (type === "pub.leaflet.blocks.bskyPost") {
    return isRecord(block["postRef"]);
  }

  if (type === "pub.leaflet.blocks.page") {
    return getTrimmedString(block["id"]).length > 0;
  }

  if (type === "pub.leaflet.blocks.poll") {
    return isRecord(block["pollRef"]);
  }

  if (type === "pub.leaflet.blocks.button") {
    return getTrimmedString(block["text"]).length > 0 && getTrimmedString(block["url"]).length > 0;
  }

  return false;
}

function canonicalizeGenericValue(value: unknown): CanonicalLeafletValue | undefined {
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    const normalized = value
      .map((entry) => canonicalizeGenericValue(entry))
      .filter((entry): entry is CanonicalLeafletValue => entry !== undefined);

    return normalized.length > 0 ? normalized : undefined;
  }

  if (!isRecord(value)) return undefined;

  const normalizedEntries = Object.keys(value)
    .sort()
    .flatMap((key) => {
      if (key === "id") return [];

      const normalizedValue = canonicalizeGenericValue(value[key]);
      return normalizedValue === undefined ? [] : [[key, normalizedValue] as const];
    });

  return normalizedEntries.length > 0
    ? Object.fromEntries(normalizedEntries)
    : undefined;
}

function canonicalizeListItems(value: unknown): CanonicalLeafletValue[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!isRecord(item)) return [];

    const content = canonicalizeBlock(item["content"]);
    const children = canonicalizeListItems(item["children"]);

    if (content === undefined && children.length === 0) {
      return [];
    }

    return [
      {
        ...(content !== undefined ? { content } : {}),
        ...(children.length > 0 ? { children } : {}),
      },
    ];
  });
}

function canonicalizeBlock(block: unknown): CanonicalLeafletValue | undefined {
  if (!isRecord(block)) return undefined;

  const type = getTrimmedString(block["$type"]);

  if (
    type === "pub.leaflet.blocks.text" ||
    type === "pub.leaflet.blocks.header" ||
    type === "pub.leaflet.blocks.blockquote" ||
    type === "pub.leaflet.blocks.code"
  ) {
    return {
      $type: type,
      plaintext: getTrimmedString(block["plaintext"]),
    };
  }

  if (
    type === "pub.leaflet.blocks.unorderedList" ||
    type === "pub.leaflet.blocks.orderedList"
  ) {
    const children = canonicalizeListItems(block["children"]);

    return {
      $type: type,
      ...(children.length > 0 ? { children } : {}),
    };
  }

  return canonicalizeGenericValue(block);
}

function canonicalizeLongDescription(document: LeafletLinearDocument): CanonicalLeafletValue[] {
  return document.blocks.flatMap((wrapper) => {
    const normalizedBlock = canonicalizeBlock(wrapper.block);
    return normalizedBlock === undefined ? [] : [normalizedBlock];
  });
}

export function organizationLongDescriptionsMatch(
  actual: LeafletLinearDocument,
  expected: LeafletLinearDocument,
): boolean {
  return (
    JSON.stringify(canonicalizeLongDescription(actual)) ===
    JSON.stringify(canonicalizeLongDescription(expected))
  );
}

export function hasAnyOrganizationLongDescriptionContent(
  document: LeafletLinearDocument,
): boolean {
  const textLength = document.blocks
    .map((wrapper) => collectBlockText(wrapper.block))
    .join("\n\n")
    .trim().length;

  if (textLength > 0) {
    return true;
  }

  return document.blocks.some((wrapper) =>
    blockHasMeaningfulNonTextContent(wrapper.block),
  );
}

export function hasMeaningfulOrganizationLongDescription(
  document: LeafletLinearDocument,
): boolean {
  const textLength = document.blocks
    .map((wrapper) => collectBlockText(wrapper.block))
    .join("\n\n")
    .trim().length;

  if (textLength >= MINIMUM_LONG_DESCRIPTION_TEXT_LENGTH) {
    return true;
  }

  return document.blocks.some((wrapper) =>
    blockHasMeaningfulNonTextContent(wrapper.block),
  );
}
