"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  BadgeCheckIcon,
  CrosshairIcon,
  Loader2Icon,
  MoreVerticalIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { trpc } from "@/lib/trpc/client";
import { indexerTrpc } from "@/lib/trpc/indexer/client";
import { useModal } from "@/components/ui/modal/context";
import {
  SiteEditorModal,
  SiteEditorModalId,
} from "@/components/global/modals/upload/site/editor";
import { getShapefilePreviewUrl } from "@/lib/shapefile";
import type { CertifiedLocation } from "@/lib/graphql-dev/queries/locations";
import { formatError } from "@/lib/utils/trpc-errors";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ── Type helpers ───────────────────────────────────────────────────────────────

/** Extract a URL from the location JSON field the indexer returns. */
function extractLocationUrl(location: unknown): string | null {
  if (!location || typeof location !== "object") return null;
  const loc = location as Record<string, unknown>;
  const $type = loc["$type"] as string | undefined;
  // String variant (coordinate-decimal) — no URL to fetch
  if ($type === "app.certified.location#string") return null;
  // URI variant
  if (typeof loc["uri"] === "string") return loc["uri"];
  // Blob variant — indexer injects uri into blob objects
  if (loc["blob"] && typeof loc["blob"] === "object") {
    const blob = loc["blob"] as Record<string, unknown>;
    if (typeof blob["uri"] === "string") return blob["uri"];
  }
  return null;
}

/** Extract inline coordinate from a string-variant location (e.g. "-15,30"). */
function extractInlineCoordinate(
  location: unknown,
  locationType: string | undefined,
): { lat: number; lon: number } | null {
  if (!location || typeof location !== "object") return null;
  const loc = location as Record<string, unknown>;
  const $type = loc["$type"] as string | undefined;
  if (
    $type !== "app.certified.location#string" &&
    locationType !== "coordinate-decimal"
  )
    return null;
  const raw = loc["string"] as string | undefined;
  if (!raw) return null;
  const parts = raw.split(",").map((s) => parseFloat(s.trim()));
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return { lat: parts[0], lon: parts[1] };
  }
  return null;
}

// ── SiteCard ──────────────────────────────────────────────────────────────────

interface SiteCardProps {
  site: CertifiedLocation;
  defaultSiteUri: string | null;
  onChange: () => void;
  isPreviewing: boolean;
}

export function SiteCard({
  site,
  defaultSiteUri,
  onChange,
  isPreviewing,
}: SiteCardProps) {
  const indexerUtils = indexerTrpc.useUtils();
  const { pushModal, show } = useModal();
  const [mutationError, setMutationError] = useState<string | null>(null);

  const locationUrl = extractLocationUrl(site.record?.location);
  const inlineCoord = extractInlineCoordinate(
    site.record?.location,
    site.record?.locationType ?? undefined,
  );
  const previewUrl = locationUrl ? getShapefilePreviewUrl(locationUrl) : null;
  const isPreviewable = !!previewUrl;
  const isDefault = !!(
    site.metadata?.uri && site.metadata.uri === defaultSiteUri
  );

  // Fetch GeoJSON to compute metrics.
  // The blob may be a Feature, FeatureCollection, or bare Geometry — accept any.
  const { data: geoJson, isPending: isLoadingGeo } = useQuery({
    queryKey: ["geojson", locationUrl],
    queryFn: async () => {
      if (!locationUrl) throw new Error("No location URL");
      const res = await fetch(locationUrl);
      return res.json() as Promise<GeoJSON.GeoJSON>;
    },
    enabled: !!locationUrl && !inlineCoord,
  });

  // Simple area + centroid from GeoJSON or inline coordinate
  const metrics = inlineCoord
    ? { area: 0, lat: inlineCoord.lat, lon: inlineCoord.lon }
    : geoJson
      ? computeSimpleMetrics(geoJson)
      : null;

  // Mutations
  const { mutate: setDefault, isPending: isSettingDefault } =
    trpc.organization.defaultSite.set.useMutation({
      onSuccess: () => {
        setMutationError(null);
        void Promise.all([
          indexerUtils.locations.list.invalidate(),
          indexerUtils.organization.defaultSite.invalidate(),
        ]);
      },
      onError: (err) => {
        setMutationError(formatError(err));
      },
    });

  const { mutate: deleteSite, isPending: isDeleting } =
    trpc.certified.location.delete.useMutation({
      onSuccess: () => {
        setMutationError(null);
        void indexerUtils.locations.list.invalidate();
      },
      onError: (err) => {
        setMutationError(formatError(err));
      },
    });

  const disableActions = isSettingDefault || isDeleting;

  const handleEdit = () => {
    pushModal(
      {
        id: SiteEditorModalId,
        content: (
          <SiteEditorModal
            initialData={
              site.metadata?.uri && site.metadata?.cid
                ? {
                    uri: site.metadata.uri,
                    cid: site.metadata.cid,
                    value: {
                      name: site.record?.name ?? undefined,
                      description: site.record?.description ?? undefined,
                      location: site.record?.location as
                        | SiteEditorLocation
                        | undefined,
                    },
                  }
                : null
            }
          />
        ),
      },
      true,
    );
    show();
  };

  const handleSetDefault = () => {
    if (!site.metadata?.uri) return;
    setDefault({ locationUri: site.metadata.uri });
  };

  const handleDelete = () => {
    const rkey = site.metadata?.rkey;
    if (!rkey) return;
    deleteSite({ rkey });
  };

  const handleCardClick = () => {
    if (!isPreviewable || isPreviewing) return;
    onChange();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
      className={cn(
        "relative rounded-xl border overflow-hidden bg-background transition-all duration-300",
        isPreviewable &&
          "hover:border-primary/30 hover:shadow-md focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]",
        isPreviewing ? "border-primary!" : "border-border",
      )}
    >
      <button
        onClick={handleCardClick}
        className={cn(
          "flex flex-col w-full",
          isPreviewable &&
            "cursor-pointer focus-visible:outline-none rounded-xl",
        )}
      >
        {/* Header with default badge */}
        <div className="flex items-center justify-between gap-2 px-3 h-10 pr-11 border-b border-border">
          {isPreviewing ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-medium">
              Previewing
            </span>
          ) : isPreviewable ? (
            <span className="text-xs text-muted-foreground">
              Click to preview
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">No preview</span>
          )}

          {isDefault && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-medium">
              <BadgeCheckIcon className="h-3 w-3" />
              Default
            </span>
          )}
        </div>

        {/* Card body */}
        <div className="px-3 py-2.5 flex-1 flex flex-col w-full items-start justify-between text-left">
          <h3 className="font-medium text-base leading-snug line-clamp-3">
            {site.record?.name ?? "Unnamed site"}
          </h3>

          {isLoadingGeo && !inlineCoord ? (
            <Loader2Icon className="h-3.5 w-3.5 animate-spin text-muted-foreground mt-1" />
          ) : metrics ? (
            typeof metrics === "string" ? (
              <p className="text-xs text-destructive mt-1">{metrics}</p>
            ) : (
              <div className="flex w-full items-center justify-between mt-1.5">
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <CrosshairIcon className="h-3 w-3 shrink-0" />
                  {metrics.lat.toFixed(2)}°, {metrics.lon.toFixed(2)}°
                </span>
                {metrics.area > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {metrics.area.toFixed(1)} ha
                  </span>
                )}
              </div>
            )
          ) : null}

          {/* Mutation error display */}
          {mutationError && (
            <div className="mt-2 p-2 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-xs text-destructive">{mutationError}</p>
            </div>
          )}
        </div>
      </button>

      <div className="absolute top-1.5 right-1.5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              disabled={disableActions}
            >
              {disableActions ? (
                <Loader2Icon className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <MoreVerticalIcon className="h-3.5 w-3.5" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleEdit} disabled={disableActions}>
              <PencilIcon className="h-3.5 w-3.5 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleSetDefault}
              disabled={isDefault || disableActions}
            >
              <BadgeCheckIcon className="h-3.5 w-3.5 mr-2" />
              {isDefault ? "Already default" : "Make default"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={handleDelete}
              disabled={isDefault || disableActions}
            >
              <Trash2Icon className="h-3.5 w-3.5 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Simplified GeoJSON metrics — area in hectares + centroid.
 *
 * Accepts any GeoJSON object (Feature, FeatureCollection, or bare Geometry).
 * The PDS stores individual blobs as plain Feature objects, not FeatureCollections,
 * so we must handle both.
 */
function computeSimpleMetrics(
  geoJson: GeoJSON.GeoJSON,
): { area: number; lat: number; lon: number } | "Invalid" | null {
  try {
    // Normalise to a flat array of features for uniform processing.
    const features: GeoJSON.Feature[] = (() => {
      if (geoJson.type === "FeatureCollection") {
        return geoJson.features;
      }
      if (geoJson.type === "Feature") {
        return [geoJson];
      }
      // Bare geometry — wrap in a synthetic feature
      return [
        {
          type: "Feature" as const,
          geometry: geoJson as GeoJSON.Geometry,
          properties: {},
        },
      ];
    })();

    let totalArea = 0;
    let sumLat = 0;
    let sumLon = 0;
    let count = 0;

    const processRings = (coords: number[][][]) => {
      for (const ring of coords) {
        // Shoelace formula for polygon area (in deg² — approximate)
        let area = 0;
        for (let i = 0; i < ring.length - 1; i++) {
          const a = ring[i];
          const b = ring[i + 1];
          if (a && b) {
            area += (a[0] ?? 0) * (b[1] ?? 0) - (b[0] ?? 0) * (a[1] ?? 0);
          }
        }
        // Convert deg² to hectares (1 deg² ≈ 111320² m² at equator)
        totalArea += Math.abs(area / 2) * 111320 * 111320 * 0.0001;

        for (const pt of ring) {
          sumLon += pt[0] ?? 0;
          sumLat += pt[1] ?? 0;
          count++;
        }
      }
    };

    for (const feature of features) {
      const geom = feature.geometry;
      if (!geom) continue;

      if (geom.type === "Polygon") {
        processRings(geom.coordinates);
      } else if (geom.type === "MultiPolygon") {
        for (const poly of geom.coordinates) {
          processRings(poly);
        }
      } else if (geom.type === "Point") {
        // Points have no area — just accumulate centroid
        sumLon += geom.coordinates[0] ?? 0;
        sumLat += geom.coordinates[1] ?? 0;
        count++;
      } else if (geom.type === "MultiPoint") {
        for (const pt of geom.coordinates) {
          sumLon += pt[0] ?? 0;
          sumLat += pt[1] ?? 0;
          count++;
        }
      }
      // LineString / MultiLineString — ignore (no area, centroid not meaningful here)
    }

    if (count === 0) return "Invalid";
    return { area: totalArea, lat: sumLat / count, lon: sumLon / count };
  } catch {
    return "Invalid";
  }
}

// ── Narrow type for SiteEditorModal ──────────────────────────────────────────

type SiteEditorLocation = {
  $type?: string;
  uri?: string;
  blob?: { uri?: string; [key: string]: unknown };
};
