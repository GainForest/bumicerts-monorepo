type JsonRecord = Record<string, unknown>;

export type AttachmentUriKind = "at-uri" | "http-url" | "other-uri";

type ParsedAttachmentUriItem = {
  kind: "uri";
  sourceType: "uri-definition";
  uri: string;
  uriKind: AttachmentUriKind;
};

type ParsedAttachmentBlobItem = {
  kind: "blob";
  sourceType: "small-blob-definition" | "resolved-blob";
  uri: string | null;
  uriKind: AttachmentUriKind | null;
  name: string | null;
  mimeType: string | null;
  size: number | null;
  cid: string | null;
};

type ParsedAttachmentUnknownItem = {
  kind: "unknown";
  sourceType: "unknown";
};

export type ParsedAttachmentContentItem =
  | ParsedAttachmentUriItem
  | ParsedAttachmentBlobItem
  | ParsedAttachmentUnknownItem;

export type RenderableAttachmentLink = {
  href: string;
  sourceType: "uri" | "blob";
  mimeType: string | null;
  size: number | null;
  cid: string | null;
};

function isJsonRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === "object";
}

function getStringField(record: JsonRecord, key: string): string | null {
  const value = record[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function getNumberField(record: JsonRecord, key: string): number | null {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function getUriKind(uri: string): AttachmentUriKind {
  if (uri.startsWith("at://")) return "at-uri";
  if (
    uri.startsWith("https://") ||
    uri.startsWith("http://") ||
    uri.startsWith("blob:") ||
    uri.startsWith("data:")
  ) {
    return "http-url";
  }
  return "other-uri";
}

function parseBlobRecord(
  blobRecord: JsonRecord,
  sourceType: ParsedAttachmentBlobItem["sourceType"],
): ParsedAttachmentBlobItem {
  const uri = getStringField(blobRecord, "uri");
  return {
    kind: "blob",
    sourceType,
    uri,
    uriKind: uri ? getUriKind(uri) : null,
    name: getStringField(blobRecord, "name"),
    mimeType: getStringField(blobRecord, "mimeType"),
    size: getNumberField(blobRecord, "size"),
    cid: getStringField(blobRecord, "cid"),
  };
}

function parseContentItem(item: unknown): ParsedAttachmentContentItem {
  if (!isJsonRecord(item)) {
    return { kind: "unknown", sourceType: "unknown" };
  }

  const itemType = getStringField(item, "$type");

  if (itemType === "org.hypercerts.defs#uri") {
    const uri = getStringField(item, "uri");
    if (!uri) {
      return { kind: "unknown", sourceType: "unknown" };
    }
    return {
      kind: "uri",
      sourceType: "uri-definition",
      uri,
      uriKind: getUriKind(uri),
    };
  }

  if (itemType === "org.hypercerts.defs#smallBlob") {
    const blobValue = item.blob;
    if (!isJsonRecord(blobValue)) {
      return { kind: "unknown", sourceType: "unknown" };
    }
    return parseBlobRecord(blobValue, "small-blob-definition");
  }

  if (itemType === "blob") {
    return parseBlobRecord(item, "resolved-blob");
  }

  return { kind: "unknown", sourceType: "unknown" };
}

export function parseAttachmentContent(
  content: unknown,
): ParsedAttachmentContentItem[] {
  if (content === null || content === undefined) {
    return [];
  }

  const inputItems = Array.isArray(content) ? content : [content];
  return inputItems.map((item) => parseContentItem(item));
}

export function getRenderableAttachmentLinks(
  parsedItems: ParsedAttachmentContentItem[],
): RenderableAttachmentLink[] {
  const links: RenderableAttachmentLink[] = [];
  const dedupe = new Set<string>();

  for (const item of parsedItems) {
    if (item.kind === "uri") {
      if (item.uriKind !== "http-url") continue;
      if (dedupe.has(item.uri)) continue;

      dedupe.add(item.uri);
      links.push({
        href: item.uri,
        sourceType: "uri",
        mimeType: null,
        size: null,
        cid: null,
      });
      continue;
    }

    if (item.kind === "blob") {
      if (!item.uri || item.uriKind !== "http-url") continue;
      if (dedupe.has(item.uri)) continue;

      dedupe.add(item.uri);
      links.push({
        href: item.uri,
        sourceType: "blob",
        mimeType: item.mimeType,
        size: item.size,
        cid: item.cid,
      });
    }
  }

  return links;
}

export function getRenderableAttachmentLinksFromContent(
  content: unknown,
): RenderableAttachmentLink[] {
  return getRenderableAttachmentLinks(parseAttachmentContent(content));
}
