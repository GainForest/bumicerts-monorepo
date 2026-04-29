export const EVIDENCE_CONTENT_TYPE_REGISTRY = [
  { value: "report", label: "Report", filePickerEligible: true },
  { value: "audit", label: "Audit", filePickerEligible: true },
  { value: "evidence", label: "Evidence", filePickerEligible: true },
  { value: "testimonial", label: "Testimonial", filePickerEligible: true },
  { value: "methodology", label: "Methodology", filePickerEligible: true },
  { value: "photo", label: "Photo", filePickerEligible: true },
  { value: "video", label: "Video", filePickerEligible: true },
  { value: "dataset", label: "Dataset", filePickerEligible: true },
  { value: "certificate", label: "Certificate", filePickerEligible: true },
  { value: "audio", label: "Audio", filePickerEligible: true },
  { value: "other", label: "Other", filePickerEligible: true },
  { value: "occurrence", label: "Tree", filePickerEligible: false },
  { value: "location", label: "Site", filePickerEligible: false },
] as const;

export type KnownEvidenceContentType =
  (typeof EVIDENCE_CONTENT_TYPE_REGISTRY)[number]["value"];

type EvidenceContentTypeEntry = (typeof EVIDENCE_CONTENT_TYPE_REGISTRY)[number];

function toUnknownContentTypeLabel(raw: string): string {
  const normalized = raw.trim();
  if (!normalized) return "Attachment";

  const words = normalized.replaceAll(/[_-]+/g, " ").split(/\s+/);
  return words
    .map((word) => {
      if (!word) return "";
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .filter((word) => word.length > 0)
    .join(" ");
}

function findKnownContentTypeEntry(
  normalizedContentType: string,
): EvidenceContentTypeEntry | undefined {
  return EVIDENCE_CONTENT_TYPE_REGISTRY.find(
    (entry) => entry.value === normalizedContentType,
  );
}

export function getEvidenceContentTypeLabel(
  rawContentType: string | null | undefined,
): string {
  if (!rawContentType) return "Attachment";

  const normalized = rawContentType.trim().toLowerCase();
  if (!normalized) return "Attachment";

  return (
    findKnownContentTypeEntry(normalized)?.label ??
    toUnknownContentTypeLabel(rawContentType)
  );
}

export function getFilePickerEvidenceContentTypeOptions(): Array<{
  value: KnownEvidenceContentType;
  label: string;
}> {
  return EVIDENCE_CONTENT_TYPE_REGISTRY.filter(
    (entry) => entry.filePickerEligible,
  ).map((entry) => ({
    value: entry.value,
    label: entry.label,
  }));
}
