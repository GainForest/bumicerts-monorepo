import {
  CalendarIcon,
  ChevronRightIcon,
  DatabaseIcon,
  MapPin,
  TreesIcon,
} from "lucide-react";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { DatasetItem } from "@/lib/graphql-dev/queries";
import {
  formatTreeSubtitle,
  type TreeManagerItem,
} from "./tree-manager-utils";

export const UNGROUPED_DATASET_FILTER = "__ungrouped__";

export type DatasetLandingCard = {
  id: string;
  name: string;
  treeCount: number;
  uploadDateLabel: string;
  uploadTimestamp: number;
  locationLabel: string;
  statusLabel: string;
  statusVariant: BadgeProps["variant"];
  searchText: string;
  isUngrouped: boolean;
};

function formatUploadDate(value: string | null | undefined): string {
  if (!value) {
    return "Date unavailable";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getUploadTimestamp(value: string | null | undefined): number {
  if (!value) {
    return 0;
  }

  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function getLatestTimestampValue(
  values: Array<string | null | undefined>,
): string | null {
  let latestTimestamp = 0;
  let latestValue: string | null = null;

  for (const value of values) {
    const timestamp = getUploadTimestamp(value);

    if (timestamp > latestTimestamp) {
      latestTimestamp = timestamp;
      latestValue = value ?? null;
    }
  }

  return latestValue;
}

function getLatestTreeCreatedAt(trees: TreeManagerItem[]): string | null {
  return getLatestTimestampValue(
    trees.flatMap((tree) => [
      tree.occurrence.record?.createdAt,
      tree.occurrence.metadata?.createdAt,
    ]),
  );
}

function getDatasetLocationLabel(trees: TreeManagerItem[]): string {
  const uniqueLocations = Array.from(
    new Set(
      trees
        .map((tree) => formatTreeSubtitle(tree))
        .filter((value) => value !== "Location not set"),
    ),
  );

  if (uniqueLocations.length === 0) {
    return "Location not set";
  }

  if (uniqueLocations.length === 1) {
    return uniqueLocations[0] ?? "Location not set";
  }

  return `${uniqueLocations[0]} + ${uniqueLocations.length - 1} more`;
}

function getDatasetStatus(trees: TreeManagerItem[]): {
  label: string;
  variant: BadgeProps["variant"];
} {
  if (trees.length === 0) {
    return { label: "No trees yet", variant: "outline" };
  }

  if (trees.some((tree) => tree.hasDuplicateBundledMeasurements)) {
    return { label: "Needs cleanup", variant: "secondary" };
  }

  if (
    trees.some(
      (tree) => tree.hasLegacyMeasurements || tree.hasUnsupportedMeasurements,
    )
  ) {
    return { label: "Migration needed", variant: "secondary" };
  }

  const measuredCount = trees.filter((tree) => tree.floraMeasurement).length;

  if (measuredCount === trees.length) {
    return { label: "Measurements ready", variant: "success" };
  }

  if (measuredCount > 0) {
    return { label: "Partially measured", variant: "outline" };
  }

  return { label: "No measurements yet", variant: "outline" };
}

function createDatasetLandingCard(options: {
  id: string;
  dataset: DatasetItem | null;
  trees: TreeManagerItem[];
  isUngrouped: boolean;
}): DatasetLandingCard {
  const { id, dataset, trees, isUngrouped } = options;
  const datasetCreatedAt = dataset?.record?.createdAt ?? dataset?.metadata?.createdAt;
  const createdAt = datasetCreatedAt ?? getLatestTreeCreatedAt(trees);
  const treeCount = Math.max(trees.length, dataset?.record?.recordCount ?? 0);
  const { label: statusLabel, variant: statusVariant } = getDatasetStatus(trees);
  const name = isUngrouped
    ? "Ungrouped trees"
    : dataset?.record?.name ?? "Unnamed dataset";
  const locationLabel = getDatasetLocationLabel(trees);
  const searchText = [
    name,
    dataset?.record?.description,
    `${treeCount}`,
    locationLabel,
    statusLabel,
    formatUploadDate(createdAt),
  ]
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLowerCase();

  return {
    id,
    name,
    treeCount,
    uploadDateLabel: formatUploadDate(createdAt),
    uploadTimestamp: getUploadTimestamp(createdAt),
    locationLabel,
    statusLabel,
    statusVariant,
    searchText,
    isUngrouped,
  };
}

export function buildDatasetLandingCards(
  datasets: DatasetItem[],
  trees: TreeManagerItem[],
): DatasetLandingCard[] {
  const treesByDataset = new Map<string, TreeManagerItem[]>();

  for (const tree of trees) {
    const datasetRef = tree.occurrence.record?.datasetRef;
    const key =
      typeof datasetRef === "string" && datasetRef.length > 0
        ? datasetRef
        : UNGROUPED_DATASET_FILTER;
    const existing = treesByDataset.get(key) ?? [];
    existing.push(tree);
    treesByDataset.set(key, existing);
  }

  const cards = new Map<string, DatasetLandingCard>();

  for (const dataset of datasets) {
    const uri = dataset.metadata?.uri;
    if (!uri) {
      continue;
    }

    cards.set(
      uri,
      createDatasetLandingCard({
        id: uri,
        dataset,
        trees: treesByDataset.get(uri) ?? [],
        isUngrouped: false,
      }),
    );
  }

  for (const [id, groupedTrees] of treesByDataset) {
    if (cards.has(id)) {
      continue;
    }

    cards.set(
      id,
      createDatasetLandingCard({
        id,
        dataset: null,
        trees: groupedTrees,
        isUngrouped: id === UNGROUPED_DATASET_FILTER,
      }),
    );
  }

  return [...cards.values()].sort((left, right) => {
    if (right.uploadTimestamp !== left.uploadTimestamp) {
      return right.uploadTimestamp - left.uploadTimestamp;
    }

    if (right.treeCount !== left.treeCount) {
      return right.treeCount - left.treeCount;
    }

    return left.name.localeCompare(right.name);
  });
}

export function DatasetLandingSection({
  datasetCards,
  onOpen,
}: {
  datasetCards: DatasetLandingCard[];
  onOpen: (datasetId: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {datasetCards.map((card) => (
        <button
          key={card.id}
          type="button"
          onClick={() => onOpen(card.id)}
          className={cn(
            "group flex h-full flex-col rounded-2xl border border-border bg-background p-5 text-left transition-all",
            "hover:-translate-y-0.5 hover:border-foreground/15 hover:shadow-sm",
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                {card.isUngrouped ? "Review bucket" : "Dataset"}
              </p>
              <h2
                className="truncate text-2xl leading-none text-foreground"
                style={{ fontFamily: "var(--font-garamond-var)" }}
              >
                {card.name}
              </h2>
            </div>
            <Badge variant={card.statusVariant} className="shrink-0">
              {card.statusLabel}
            </Badge>
          </div>

          <div className="mt-5 space-y-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <TreesIcon className="size-4 shrink-0" />
              <span>
                {card.treeCount} tree{card.treeCount === 1 ? "" : "s"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CalendarIcon className="size-4 shrink-0" />
              <span>{card.uploadDateLabel}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="size-4 shrink-0" />
              <span className="truncate">{card.locationLabel}</span>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between border-t border-border/70 pt-4 text-sm font-medium text-foreground">
            <span className="inline-flex items-center gap-2">
              <DatabaseIcon className="size-4 text-muted-foreground" />
              Open dataset
            </span>
            <ChevronRightIcon className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </div>
        </button>
      ))}
    </div>
  );
}
