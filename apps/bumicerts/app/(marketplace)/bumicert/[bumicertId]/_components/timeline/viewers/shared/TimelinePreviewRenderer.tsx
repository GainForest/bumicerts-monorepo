import type { ComponentType } from "react";
import type { TimelinePreviewPayload } from "../../shared/timelineFeedViewModel";
import { ExternalLinkPreviewRenderer } from "../renderers/previews/ExternalLinkPreviewRenderer";
import { MediaPreviewRenderer } from "../renderers/previews/MediaPreviewRenderer";
import { SitePreviewRenderer } from "../renderers/previews/SitePreviewRenderer";
import { TextPreviewRenderer } from "../renderers/previews/TextPreviewRenderer";

interface PreviewRendererProps {
  preview: TimelinePreviewPayload;
}

const PREVIEW_RENDERER_REGISTRY = {
  site: SitePreviewRenderer,
  image: MediaPreviewRenderer,
  video: MediaPreviewRenderer,
  audio: MediaPreviewRenderer,
  pdf: MediaPreviewRenderer,
  link: ExternalLinkPreviewRenderer,
  text: TextPreviewRenderer,
} satisfies Record<
  TimelinePreviewPayload["kind"],
  ComponentType<PreviewRendererProps>
>;

export function TimelinePreviewRenderer({ preview }: PreviewRendererProps) {
  const Renderer = PREVIEW_RENDERER_REGISTRY[preview.kind];
  return <Renderer preview={preview} />;
}
