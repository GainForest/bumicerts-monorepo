"use client";

import Link from "next/link";
import { ExternalLink, Globe2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { links } from "@/lib/links";

const GREEN_GLOBE_PREVIEW_FOCUS_MESSAGE_TYPE =
  "gainforest.greenGlobePreview.focusTree";

type GreenGlobeTreePreviewCardProps = {
  did: string;
  datasetRef: string;
  datasetName?: string | null;
  datasetTreeCount?: number | null;
  treeUri?: string | null;
  treeName?: string | null;
};

export function GreenGlobeTreePreviewCard({
  did,
  datasetRef,
  datasetName,
  datasetTreeCount,
  treeUri,
  treeName,
}: GreenGlobeTreePreviewCardProps) {
  const datasetPreviewUrl = links.external.greenGlobeTreePreview(did, {
    datasetRef,
  });
  const focusedDatasetPreviewUrl = treeUri
    ? links.external.greenGlobeTreePreview(did, {
        treeUri,
        datasetRef,
      })
    : datasetPreviewUrl;
  const datasetLabel = datasetName?.trim() || "selected dataset";
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const targetOrigin = useMemo(() => {
    try {
      return new URL(datasetPreviewUrl).origin;
    } catch {
      return "*";
    }
  }, [datasetPreviewUrl]);
  const postPreviewFocusMessage = useCallback(() => {
    const targetWindow = iframeRef.current?.contentWindow;
    if (!targetWindow) {
      return;
    }

    targetWindow.postMessage(
      {
        type: GREEN_GLOBE_PREVIEW_FOCUS_MESSAGE_TYPE,
        datasetRef,
        treeUri: treeUri ?? null,
      },
      targetOrigin,
    );
  }, [datasetRef, targetOrigin, treeUri]);

  useEffect(() => {
    postPreviewFocusMessage();
  }, [postPreviewFocusMessage]);

  return (
    <section className="rounded-2xl border border-border bg-background p-4 md:p-5 space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <h3
            className="text-lg font-semibold flex items-center gap-2"
            style={{ fontFamily: "var(--font-garamond-var)" }}
          >
            <Globe2 />
            Green Globe dataset preview
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            View all trees in {datasetLabel} in Green Globe. Pink dots represent
            the trees in this dataset. Selecting a tree focuses the preview on
            that tree while keeping the full dataset visible.
          </p>
          {typeof datasetTreeCount === "number" ? (
            <p className="text-xs text-muted-foreground">
              {datasetTreeCount} tree{datasetTreeCount === 1 ? "" : "s"} loaded
              from this dataset.
            </p>
          ) : null}
          {treeName ? (
            <p className="text-xs text-muted-foreground">
              Focused tree on map:{" "}
              <span className="font-medium text-foreground">{treeName}</span>
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row md:flex-col lg:flex-row">
          <Button asChild variant="outline" className="shrink-0">
            <Link href={datasetPreviewUrl} target="_blank" rel="noreferrer">
              <ExternalLink />
              Open dataset
            </Link>
          </Button>
          {treeUri ? (
            <Button asChild variant="ghost" className="shrink-0">
              <Link href={focusedDatasetPreviewUrl} target="_blank" rel="noreferrer">
                <ExternalLink />
                Open selected tree
              </Link>
            </Button>
          ) : null}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-muted/20">
        <iframe
          ref={iframeRef}
          title="Green Globe dataset preview"
          src={datasetPreviewUrl}
          className="h-[320px] w-full border-0 md:h-[420px]"
          loading="lazy"
          onLoad={postPreviewFocusMessage}
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    </section>
  );
}

export default GreenGlobeTreePreviewCard;
