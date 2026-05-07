import type { AudioRecordingItem, CertifiedLocation, OccurrenceItem } from "@/graphql/indexer/queries";
import { links } from "@/lib/links";
import { formatDate } from "@/lib/utils/date";
import { isCertifiedLocationRecordUri, type ParsedAtUri } from "./atUri";

type ReferenceKind = "audio" | "occurrence" | "location" | "unknown";

export interface ResolvedAttachmentReference {
  id: string;
  kind: ReferenceKind;
  title: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
}

function getRecordedAt(metadata: unknown): string | undefined {
  if (typeof metadata !== "object" || metadata === null) return undefined;
  if (!("recordedAt" in metadata)) return undefined;
  return typeof metadata.recordedAt === "string" ? metadata.recordedAt : undefined;
}

function getAudioBlobUri(item: AudioRecordingItem | undefined): string | undefined {
  const blob = item?.record?.blob;
  if (typeof blob !== "object" || blob === null || !("uri" in blob)) {
    return undefined;
  }
  const uri = blob.uri;
  return typeof uri === "string" && uri.length > 0 ? uri : undefined;
}

export function buildResolvedReference(args: {
  uri: string;
  parsed: ParsedAtUri | null;
  audio?: AudioRecordingItem;
  occurrence?: OccurrenceItem;
  location?: CertifiedLocation;
}): ResolvedAttachmentReference {
  const { uri, parsed, audio, occurrence, location } = args;

  if (!parsed) {
    return { id: uri, kind: "unknown", title: "Linked record" };
  }

  if (parsed.collection === "app.gainforest.ac.audio") {
    const date = formatDate(getRecordedAt(audio?.record?.metadata) ?? audio?.record?.createdAt);
    return {
      id: uri,
      kind: "audio",
      title: audio?.record?.name ?? "Linked audio record",
      description: date || "Audio evidence",
      actionHref: getAudioBlobUri(audio),
      actionLabel: "Play recording",
    };
  }

  if (parsed.collection === "app.gainforest.dwc.occurrence") {
    const count = occurrence?.record?.individualCount;
    const countText =
      count == null ? null : `${count} individual${count === 1 ? "" : "s"}`;
    const when = formatDate(
      occurrence?.record?.eventDate ?? occurrence?.record?.createdAt,
    );
    return {
      id: uri,
      kind: "occurrence",
      title:
        occurrence?.record?.scientificName ??
        occurrence?.record?.vernacularName ??
        "Linked tree record",
      description: [countText, when].filter(Boolean).join(" · ") || undefined,
    };
  }

  if (parsed.collection === "app.certified.location") {
    const locationUri = location?.metadata?.uri ?? uri;
    const canViewMap = isCertifiedLocationRecordUri(locationUri);
    return {
      id: uri,
      kind: "location",
      title: location?.record?.name ?? "Linked site record",
      description: location?.record?.locationType ?? "Site evidence",
      actionHref: canViewMap
        ? links.external.polygonsAppUrl({
            mode: "view",
            params: { certifiedLocationRecordUri: locationUri },
          })
        : undefined,
      actionLabel: "Open site map",
    };
  }

  return { id: uri, kind: "unknown", title: "Linked record" };
}
