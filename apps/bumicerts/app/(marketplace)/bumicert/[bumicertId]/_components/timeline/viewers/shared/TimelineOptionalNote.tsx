import type { LeafletLinearDocument } from "@gainforest/leaflet-react";
import { LeafletRenderer } from "@/components/ui/leaflet-renderer";

interface TimelineOptionalNoteProps {
  note: unknown;
  ownerDid?: string | null;
}

function isLeafletLinearDocument(value: unknown): value is LeafletLinearDocument {
  if (!value || typeof value !== "object") {
    return false;
  }
  const blocks = Reflect.get(value, "blocks");
  return Array.isArray(blocks);
}

export function hasTimelineOptionalNote(
  note: unknown,
  ownerDid?: string | null,
): note is LeafletLinearDocument {
  return Boolean(ownerDid && isLeafletLinearDocument(note) && note.blocks.length > 0);
}

export function TimelineOptionalNote({ note, ownerDid }: TimelineOptionalNoteProps) {
  if (!hasTimelineOptionalNote(note, ownerDid) || !ownerDid) {
    return null;
  }

  const resolvedOwnerDid = ownerDid;

  return (
    <div className="py-2 text-sm text-foreground/90">
      <LeafletRenderer document={note} ownerDid={resolvedOwnerDid} />
    </div>
  );
}
