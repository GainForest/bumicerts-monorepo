import type { TimelinePreviewPayload } from "../../../shared/timelineFeedViewModel";

interface TextPreviewRendererProps {
  preview: TimelinePreviewPayload;
}

export function TextPreviewRenderer({ preview }: TextPreviewRendererProps) {
  if (preview.kind !== "text") {
    return null;
  }

  return (
    <div className="rounded-xl border border-border/40 bg-muted/20 px-4 py-3">
      <p className="text-sm font-medium text-foreground">{preview.title}</p>
      {preview.body && <p className="mt-1 text-sm text-muted-foreground">{preview.body}</p>}
    </div>
  );
}
