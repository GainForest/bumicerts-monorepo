"use client";

import { useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { MapPinIcon, ExternalLinkIcon, Loader2Icon } from "lucide-react";
import type { BumicertData } from "@/lib/types";
import { queries } from "@/lib/graphql/queries";
import { links } from "@/lib/links";

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

/**
 * Extract a resolved blob/http URL from the `record.location` JSON scalar.
 *
 * The indexer resolves blobs to { uri } objects. Possible shapes:
 *   - string                     → plain URI, use as-is
 *   - { uri: string }            → resolved blob / #uri variant
 *   - { image: { uri: string }}  → #smallBlob wrapper
 *   - { ref: { uri: string }}    → ATProto BlobRef with resolved uri
 *   - { string: string }         → #string inline GeoJSON — no URL to extract
 */
function extractLocationUrl(location: unknown): string | null {
  if (typeof location === "string") return location || null;
  if (location && typeof location === "object") {
    const loc = location as Record<string, unknown>;
    if (typeof loc["uri"] === "string" && loc["uri"]) return loc["uri"];
    if (loc["ref"] && typeof loc["ref"] === "object") {
      const ref = loc["ref"] as Record<string, unknown>;
      if (typeof ref["uri"] === "string" && ref["uri"]) return ref["uri"];
    }
    if (loc["image"] && typeof loc["image"] === "object") {
      const img = loc["image"] as Record<string, unknown>;
      if (typeof img["uri"] === "string" && img["uri"]) return img["uri"];
    }
  }
  return null;
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface SiteEntry {
  rkey: string;
  name: string | null;
  shapefileUrl: string | null;
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

      {site.shapefileUrl && (
        <a
          href={site.shapefileUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="shrink-0 flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
          aria-label={`View raw GeoJSON for ${label}`}
        >
          <ExternalLinkIcon className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Raw file</span>
        </a>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function SiteBoundariesTab({ bumicert }: { bumicert: BumicertData }) {
  const parsedRefs = bumicert.locationRefs
    .map((ref) => parseAtUri(ref.uri))
    .filter((parsed): parsed is { did: string; rkey: string } => parsed !== null);

  // One query per linked location — fetched by exact did + rkey
  const locationResults = useQueries({
    queries: parsedRefs.map((ref) => ({
      queryKey: ["locations", { did: ref.did, rkey: ref.rkey }],
      queryFn: () => queries.locations.fetch({ did: ref.did, rkey: ref.rkey }),
      staleTime: 30 * 1_000,
    })),
  });

  const isLoading = locationResults.some((r) => r.isLoading);

  const sites: SiteEntry[] = locationResults
    .flatMap((r) => r.data ?? [])
    .map((item) => ({
      rkey: item.metadata?.rkey ?? "",
      name: item.record?.name ?? null,
      shapefileUrl: extractLocationUrl(item.record?.location),
    }))
    .filter((s) => s.shapefileUrl !== null);

  const firstSite = sites[0] ?? null;
  const [activeSiteRkey, setActiveSiteRkey] = useState<string | null>(null);

  const activeRkey = activeSiteRkey ?? firstSite?.rkey ?? null;
  const activeSite = sites.find((s) => s.rkey === activeRkey) ?? firstSite;
  const iframeUrl = activeSite?.shapefileUrl
    ? links.external.gainforestMapViewer(activeSite.shapefileUrl)
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
