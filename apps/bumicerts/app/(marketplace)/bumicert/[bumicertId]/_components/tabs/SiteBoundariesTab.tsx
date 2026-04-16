"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { MapPinIcon, Loader2Icon } from "lucide-react";
import type { BumicertData } from "@/lib/types";
import { indexerTrpc } from "@/lib/trpc/indexer/client";

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Parse did and rkey out of an AT-Protocol URI.
 * Format: "at://<did>/<collection>/<rkey>"
 */
function parseAtUri(uri: string): { did: string; rkey: string } | null {
  const match = uri.match(/^at:\/\/([^/]+)\/[^/]+\/([^/]+)$/);
  if (!match) return null;
  return { did: match[1], rkey: match[2] };
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface SiteEntry {
  rkey: string;
  name: string | null;
  locationUri: string | null; // AT URI of the location record
}

// ── Constants ─────────────────────────────────────────────────────────────────

const POLYGONS_VIEWER_URL = "https://polygons-gainforest.vercel.app/view";

/**
 * Build the polygons viewer iframe URL from a location record AT URI.
 */
function buildPolygonsViewerUrl(locationUri: string): string {
  const params = new URLSearchParams({
    certifiedLocationRecordUri: locationUri,
  });
  return `${POLYGONS_VIEWER_URL}?${params.toString()}`;
}

// ── Site list item ─────────────────────────────────────────────────────────────

function SiteListItem({
  site,
  isActive,
  onSelect,
}: {
  site: SiteEntry;
  isActive: boolean;
  onSelect: () => void;
}) {
  const label = site.name ?? site.rkey;

  return (
    <div
      className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border transition-colors cursor-pointer ${
        isActive
          ? "border-primary/40 bg-primary/5"
          : "border-border/60 bg-muted/20 hover:bg-muted/40"
      }`}
      onClick={onSelect}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <MapPinIcon
          className={`h-4 w-4 shrink-0 ${isActive ? "text-primary" : "text-muted-foreground"}`}
        />
        <span
          className={`text-sm font-medium truncate ${isActive ? "text-primary" : "text-foreground/80"}`}
        >
          {label}
        </span>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function SiteBoundariesTab({ bumicert }: { bumicert: BumicertData }) {
  const parsedRefs = bumicert.locationRefs
    .map((ref) => parseAtUri(ref.uri))
    .filter((parsed): parsed is { did: string; rkey: string } => parsed !== null);

  // One query per linked location — fetched by exact did + rkey
  const locationResults = indexerTrpc.useQueries((t) =>
    parsedRefs.map((ref) => t.locations.list({ did: ref.did, rkey: ref.rkey }))
  );

  const isLoading = locationResults.some((r) => r.isLoading);

  const sites: SiteEntry[] = locationResults
    .flatMap((r) => r.data ?? [])
    .map((item) => ({
      rkey: item.metadata?.rkey ?? "",
      name: item.record?.name ?? null,
      locationUri: item.metadata?.uri ?? null, // AT URI of the location record
    }))
    .filter((s) => s.locationUri !== null);

  const firstSite = sites[0] ?? null;
  const [activeSiteRkey, setActiveSiteRkey] = useState<string | null>(null);

  const activeRkey = activeSiteRkey ?? firstSite?.rkey ?? null;
  const activeSite = sites.find((s) => s.rkey === activeRkey) ?? firstSite;
  const iframeUrl = activeSite?.locationUri
    ? buildPolygonsViewerUrl(activeSite.locationUri)
    : null;

  return (
    <motion.div
      key="site-boundaries"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
      className="py-1 flex flex-col gap-4"
    >
      <div className="flex items-center gap-2">
        <MapPinIcon className="h-4 w-4 text-primary" />
        <span className="text-xs uppercase tracking-[0.15em] text-muted-foreground font-medium">
          Site Boundaries
        </span>
      </div>

      {/* Map iframe */}
      <div className="rounded-xl border border-border overflow-hidden bg-muted/20">
        {isLoading ? (
          <div className="h-80 flex items-center justify-center">
            <Loader2Icon className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : iframeUrl ? (
          <iframe
            src={iframeUrl}
            className="w-full h-80 border-0"
            title={activeSite?.name ?? "Site boundaries map"}
            loading="lazy"
          />
        ) : (
          <div className="h-80 flex flex-col items-center justify-center gap-2 text-muted-foreground/50">
            <MapPinIcon className="h-10 w-10" />
            <span className="text-sm">
              {parsedRefs.length === 0
                ? "No sites linked to this bumicert"
                : "No site boundaries available"}
            </span>
          </div>
        )}
      </div>

      {/* Site list — only shown when there are multiple sites */}
      {sites.length > 1 && (
        <div className="flex flex-col gap-2">
          {sites.map((site) => (
            <SiteListItem
              key={site.rkey}
              site={site}
              isActive={site.rkey === activeRkey}
              onSelect={() => setActiveSiteRkey(site.rkey)}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}
