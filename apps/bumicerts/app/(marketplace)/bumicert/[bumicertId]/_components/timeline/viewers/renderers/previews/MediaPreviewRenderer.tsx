import Image from "next/image";
import type { TimelinePreviewPayload } from "../../../shared/timelineFeedViewModel";

interface MediaPreviewRendererProps {
  preview: TimelinePreviewPayload;
}

export function MediaPreviewRenderer({ preview }: MediaPreviewRendererProps) {
  if (preview.kind === "image") {
    return (
      <div className="relative h-[320px] w-full overflow-hidden rounded-xl border border-border/40 bg-muted/20 sm:h-[420px]">
        <Image src={preview.href} alt={preview.title} fill className="object-contain" unoptimized />
      </div>
    );
  }

  if (preview.kind === "audio") {
    return <audio src={preview.href} controls className="w-full" />;
  }

  if (preview.kind === "video") {
    return (
      <video
        src={preview.href}
        controls
        className="max-h-[420px] w-full rounded-xl border border-border/40 bg-black/70"
      />
    );
  }

  if (preview.kind === "pdf") {
    return (
      <iframe
        title={preview.title}
        src={preview.href}
        className="h-[420px] w-full rounded-xl border border-border/40 bg-muted/20"
        sandbox="allow-downloads allow-same-origin"
        referrerPolicy="no-referrer"
      />
    );
  }

  return null;
}
