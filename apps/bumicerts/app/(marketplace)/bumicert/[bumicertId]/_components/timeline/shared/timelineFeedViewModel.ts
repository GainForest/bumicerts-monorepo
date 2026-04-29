import { links } from "@/lib/links";
import { parseAttachmentContent, type ParsedAttachmentContentItem } from "./attachmentContentParser";
import { isCertifiedLocationRecordUri, parseAtUri } from "../viewers/shared/referenceResolution/atUri";
import type { ResolvedAttachmentReference } from "../viewers/shared/referenceResolution/referenceViewModel";

type ParsedAttachmentBlobItem = Extract<ParsedAttachmentContentItem, { kind: "blob" }>;
export type FeedTileKind = "site" | "tree" | "audio" | "image" | "video" | "pdf" | "file" | "link" | "record";

export type TimelinePreviewPayload = {
  kind: "site" | "image" | "video" | "audio" | "pdf" | "link" | "text";
  href: string;
  title: string;
  body?: string;
};

export interface TimelineFeedTile {
  id: string;
  kind: FeedTileKind;
  title: string;
  caption: string;
  preview: TimelinePreviewPayload | null;
}

function cleanText(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function getFileNameFromHref(href: string): string {
  try {
    const parsed = new URL(href);
    const parts = parsed.pathname.split("/").filter(Boolean);
    return parts.at(-1) ?? "Linked file";
  } catch {
    return "Linked file";
  }
}

function getPreviewFromHref(href: string, mimeType: string | null): TimelinePreviewPayload {
  const normalizedMime = mimeType?.toLowerCase() ?? "";
  if (normalizedMime.startsWith("image/")) {
    return { kind: "image", href, title: "Image" };
  }
  if (normalizedMime.startsWith("video/")) {
    return { kind: "video", href, title: "Video" };
  }
  if (normalizedMime.startsWith("audio/")) {
    return { kind: "audio", href, title: "Audio" };
  }
  if (normalizedMime.includes("pdf")) {
    return { kind: "pdf", href, title: "PDF" };
  }
  return { kind: "link", href, title: getFileNameFromHref(href) };
}
function tileKindFromPreview(preview: TimelinePreviewPayload): FeedTileKind {
  if (preview.kind === "link") {
    return "file";
  }
  if (preview.kind === "text") {
    return "record";
  }
  return preview.kind;
}
function fallbackReferenceTitle(uri: string): { title: string; kind: FeedTileKind } {
  const parsed = parseAtUri(uri);
  if (!parsed) {
    return { title: "Linked record", kind: "record" };
  }
  if (parsed.collection === "app.certified.location") {
    return { title: "Linked site", kind: "site" };
  }
  if (parsed.collection === "app.gainforest.dwc.occurrence") {
    return { title: "Linked tree record", kind: "tree" };
  }
  if (parsed.collection === "app.gainforest.ac.audio") {
    return { title: "Linked audio", kind: "audio" };
  }
  return { title: "Linked record", kind: "record" };
}
function previewForReference(
  uri: string,
  reference: ResolvedAttachmentReference | undefined,
): TimelinePreviewPayload | null {
  if (reference?.kind === "location") {
    const href = reference.actionHref ??
      (isCertifiedLocationRecordUri(uri)
        ? links.external.polygonsAppUrl({
            mode: "view",
            params: { certifiedLocationRecordUri: uri },
          })
        : null);
    return href ? { kind: "site", href, title: reference.title } : null;
  }

  if (reference?.kind === "audio" && reference.actionHref) {
    return { kind: "audio", href: reference.actionHref, title: reference.title };
  }

  if (reference?.actionHref) {
    return { kind: "link", href: reference.actionHref, title: reference.title };
  }

  if (reference) {
    return {
      kind: "text",
      href: "",
      title: reference.title,
      body: reference.description ?? "Linked record",
    };
  }

  return null;
}
function fromBlob(item: ParsedAttachmentBlobItem, tileId: string): TimelineFeedTile | null {
  if (!item.uri || item.uriKind !== "http-url") {
    return null;
  }

  const preview = getPreviewFromHref(item.uri, item.mimeType);
  const caption = cleanText(item.name) ?? getFileNameFromHref(item.uri);

  return {
    id: tileId,
    kind: tileKindFromPreview(preview),
    title: preview.title,
    caption,
    preview,
  };
}

export function buildTimelineFeedTiles(args: {
  entryId: string;
  content: unknown;
  references: ResolvedAttachmentReference[];
}): TimelineFeedTile[] {
  const items = parseAttachmentContent(args.content);
  const refsByUri = new Map(args.references.map((reference) => [reference.id, reference]));

  return items.flatMap((item, index) => {
    const tileId = `${args.entryId}-${index}`;

    if (item.kind === "blob") {
      const tile = fromBlob(item, tileId);
      return tile ? [tile] : [];
    }

    if (item.kind === "uri" && item.uriKind === "http-url") {
      const preview = getPreviewFromHref(item.uri, null);
      return [
        {
          id: tileId,
          kind: preview.kind === "link" ? "link" : tileKindFromPreview(preview),
          title: preview.title,
          caption: getFileNameFromHref(item.uri),
          preview,
        },
      ];
    }

    if (item.kind === "uri" && item.uriKind === "at-uri") {
      const reference = refsByUri.get(item.uri);
      const fallback = fallbackReferenceTitle(item.uri);
      return [
        {
          id: tileId,
          kind:
            reference?.kind === "location"
              ? "site"
              : reference?.kind === "occurrence"
                ? "tree"
                : reference?.kind === "audio"
                  ? "audio"
                  : fallback.kind,
          title: cleanText(reference?.title) ?? fallback.title,
          caption:
            cleanText(reference?.title) ??
            cleanText(reference?.description) ??
            fallback.title,
          preview:
            previewForReference(item.uri, reference) ?? {
              kind: "text",
              href: "",
              title: cleanText(reference?.title) ?? fallback.title,
              body: cleanText(reference?.description) ?? "Linked record",
            },
        },
      ];
    }

    return [];
  });
}

export function getFeedNoun(contentTypeLabel: string, count: number): string {
  if (count === 1) {
    return contentTypeLabel;
  }
  return contentTypeLabel.endsWith("s") ? contentTypeLabel : `${contentTypeLabel}s`;
}
