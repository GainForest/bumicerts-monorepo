import Link from "next/link";
import { ExternalLink, Globe2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { links } from "@/lib/links";

type GreenGlobeTreePreviewCardProps = {
  did: string;
  treeUri: string;
  datasetRef?: string | null;
  treeName?: string | null;
};

export function GreenGlobeTreePreviewCard({
  did,
  treeUri,
  datasetRef,
  treeName,
}: GreenGlobeTreePreviewCardProps) {
  const previewUrl = links.external.greenGlobeTreePreview(did, {
    treeUri,
    datasetRef,
  });

  return (
    <section className="rounded-2xl border border-border bg-background p-4 md:p-5 space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <h3
            className="text-lg font-semibold flex items-center gap-2"
            style={{ fontFamily: "var(--font-garamond-var)" }}
          >
            <Globe2 />
            Green Globe preview
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            View this tree in Green Globe. Pink dots represent the uploaded trees,
            and the selected tree is highlighted.
            {datasetRef
              ? " This preview is filtered to the same upload dataset."
              : " This preview shows the surrounding organization tree context."}
          </p>
          {treeName ? (
            <p className="text-xs text-muted-foreground">
              Focused tree: <span className="font-medium text-foreground">{treeName}</span>
            </p>
          ) : null}
        </div>

        <Button asChild variant="outline" className="shrink-0">
          <Link href={previewUrl} target="_blank" rel="noreferrer">
            <ExternalLink />
            Open in Green Globe
          </Link>
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-muted/20">
        <iframe
          title="Green Globe tree preview"
          src={previewUrl}
          className="h-[420px] w-full border-0"
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    </section>
  );
}

export default GreenGlobeTreePreviewCard;
