import { ExternalLinkIcon } from "lucide-react";
import type { TimelinePreviewPayload } from "../../../shared/timelineFeedViewModel";

interface ExternalLinkPreviewRendererProps {
  preview: TimelinePreviewPayload;
}

export function ExternalLinkPreviewRenderer({
  preview,
}: ExternalLinkPreviewRendererProps) {
  if (preview.kind !== "link") {
    return null;
  }

  const safeHref = (() => {
    try {
      const parsed = new URL(preview.href);
      return parsed.protocol === "http:" || parsed.protocol === "https:"
        ? preview.href
        : null;
    } catch {
      return null;
    }
  })();

  if (!safeHref) {
    return null;
  }

  return (
    <a
      href={safeHref}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 rounded-lg border border-border/50 px-3 py-2 text-sm text-foreground hover:bg-muted/30"
    >
      Open linked file
      <ExternalLinkIcon className="h-4 w-4" />
    </a>
  );
}
