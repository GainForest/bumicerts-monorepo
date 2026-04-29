import type { TimelinePreviewPayload } from "../../../shared/timelineFeedViewModel";

interface SitePreviewRendererProps {
  preview: TimelinePreviewPayload;
}

export function SitePreviewRenderer({ preview }: SitePreviewRendererProps) {
  if (preview.kind !== "site") {
    return null;
  }

  return (
    <iframe
      title={preview.title}
      src={preview.href}
      className="h-[320px] w-full rounded-xl border border-border/40 bg-muted/20"
      loading="lazy"
      sandbox="allow-scripts allow-forms allow-popups"
      referrerPolicy="no-referrer"
    />
  );
}
