import { getTimelineTileRegistryEntry } from "./timelineTileRegistry";
import type { TimelineFeedTile } from "../../shared/timelineFeedViewModel";
import { cn } from "@/lib/utils";

interface TimelineTileRowProps {
  tiles: TimelineFeedTile[];
  activeTileId: string | null;
  onTileClick: (tile: TimelineFeedTile) => void;
}

function getFileTypeLabel(tile: TimelineFeedTile): string {
  const candidates = [tile.caption, tile.preview?.href ?? ""];

  for (const candidate of candidates) {
    const path = candidate.split("?")[0] ?? "";
    const extension = path.split(".").pop();
    if (extension && extension.length <= 5) {
      return extension.toUpperCase();
    }
  }

  return "FILE";
}

export function TimelineTileRow({
  tiles,
  activeTileId,
  onTileClick,
}: TimelineTileRowProps) {
  if (tiles.length === 0) {
    return null;
  }

  return (
    <div className="-mx-1 flex snap-x snap-mandatory gap-2 overflow-x-auto px-1 pb-1">
      {tiles.map((tile) => {
        const Icon = getTimelineTileRegistryEntry(tile.kind).icon;
        const fileTypeLabel =
          tile.kind === "file" ? getFileTypeLabel(tile) : null;

        return (
          <button
            key={tile.id}
            type="button"
            onClick={() => onTileClick(tile)}
            className={cn(
              "relative flex h-[7rem] w-[7rem] shrink-0 snap-start flex-col justify-end rounded-xl bg-muted/60 p-2 text-left transition-colors",
              "hover:bg-muted",
              activeTileId === tile.id
                ? "border-2 border-primary! bg-primary/5 p-[calc(0.5rem-1px)]"
                : "border-0",
            )}
          >
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <Icon className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <div className="relative z-10 rounded-md bg-background/80 px-1.5 py-1 backdrop-blur-[1px]">
              <p className="line-clamp-1 text-xs font-medium leading-4 text-foreground">
                {tile.caption}
              </p>
              {fileTypeLabel ? (
                <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
                  {fileTypeLabel}
                </p>
              ) : null}
            </div>
          </button>
        );
      })}
    </div>
  );
}
