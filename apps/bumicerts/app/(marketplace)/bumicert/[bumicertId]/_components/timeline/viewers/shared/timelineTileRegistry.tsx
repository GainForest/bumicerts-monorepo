import {
  AudioLinesIcon,
  ExternalLinkIcon,
  FileIcon,
  FileImageIcon,
  FileTextIcon,
  FileVideoIcon,
  MapPinIcon,
  SproutIcon,
} from "lucide-react";
import type { ComponentType } from "react";
import type { FeedTileKind } from "../../shared/timelineFeedViewModel";

type TileIcon = ComponentType<{ className?: string }>;

type TileRegistryEntry = {
  icon: TileIcon;
  label: string;
};

const TIMELINE_TILE_REGISTRY: Record<FeedTileKind, TileRegistryEntry> = {
  site: { icon: MapPinIcon, label: "Linked site" },
  tree: { icon: SproutIcon, label: "Linked tree record" },
  audio: { icon: AudioLinesIcon, label: "Linked audio" },
  image: { icon: FileImageIcon, label: "Image" },
  video: { icon: FileVideoIcon, label: "Video" },
  pdf: { icon: FileTextIcon, label: "PDF" },
  file: { icon: FileIcon, label: "File" },
  link: { icon: ExternalLinkIcon, label: "Link" },
  record: { icon: FileIcon, label: "Linked record" },
};

export function getTimelineTileRegistryEntry(kind: FeedTileKind): TileRegistryEntry {
  return TIMELINE_TILE_REGISTRY[kind];
}
