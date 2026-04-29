import type { TimelinePreviewPayload } from "../../shared/timelineFeedViewModel";
import { TimelinePreviewRenderer } from "./TimelinePreviewRenderer";

interface TimelinePreviewPanelProps {
  preview: TimelinePreviewPayload | null;
}

export function TimelinePreviewPanel({ preview }: TimelinePreviewPanelProps) {
  if (!preview) {
    return null;
  }

  return (
    <div>
      <TimelinePreviewRenderer preview={preview} />
    </div>
  );
}
