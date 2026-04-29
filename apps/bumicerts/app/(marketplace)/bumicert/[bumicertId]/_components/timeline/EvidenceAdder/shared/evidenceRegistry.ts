import { FileIcon, MapPinIcon, MicIcon, TreesIcon } from "lucide-react";
import { links } from "@/lib/links";

export type EvidenceTabId = "audio" | "trees" | "sites" | "files";
export type ManagedEvidenceTabId = Exclude<EvidenceTabId, "files">;
export type EvidenceAttachmentContentType =
  | "audio"
  | "occurrence"
  | "location"
  | "evidence";

type AttachmentDefaults = {
  title: string;
  contentType: EvidenceAttachmentContentType;
};

type TabBaseConfig = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  attachment: AttachmentDefaults;
};

type ManagedTabConfig = TabBaseConfig & {
  manageHref: string;
  emptyLabel: string;
};

const MANAGED_TAB_CONFIG: Record<ManagedEvidenceTabId, ManagedTabConfig> = {
  audio: {
    label: "Audio",
    icon: MicIcon,
    manageHref: links.manage.audio,
    emptyLabel: "audio recordings",
    attachment: {
      title: "Audio Recordings",
      contentType: "audio",
    },
  },
  trees: {
    label: "Trees",
    icon: TreesIcon,
    manageHref: links.manage.trees,
    emptyLabel: "tree occurrences",
    attachment: {
      title: "Tree Occurrences",
      contentType: "occurrence",
    },
  },
  sites: {
    label: "Sites",
    icon: MapPinIcon,
    manageHref: links.manage.sites,
    emptyLabel: "sites",
    attachment: {
      title: "Sites",
      contentType: "location",
    },
  },
};

const FILE_TAB_CONFIG: TabBaseConfig = {
  label: "Files",
  icon: FileIcon,
  attachment: {
    title: "Files",
    contentType: "evidence",
  },
};

export const EVIDENCE_TABS: Array<
  {
    id: EvidenceTabId;
  } & TabBaseConfig
> = [
  {
    id: "audio",
    ...MANAGED_TAB_CONFIG.audio,
  },
  {
    id: "trees",
    ...MANAGED_TAB_CONFIG.trees,
  },
  {
    id: "sites",
    ...MANAGED_TAB_CONFIG.sites,
  },
  {
    id: "files",
    ...FILE_TAB_CONFIG,
  },
];

export function getManagedEvidenceTabConfig(
  tabId: ManagedEvidenceTabId,
): ManagedTabConfig {
  return MANAGED_TAB_CONFIG[tabId];
}

export function getEvidenceTabLabel(tabId: EvidenceTabId): string {
  if (tabId === "files") {
    return FILE_TAB_CONFIG.label;
  }
  return MANAGED_TAB_CONFIG[tabId].label;
}

export function getEvidenceAttachmentDefaults(tabId: EvidenceTabId): AttachmentDefaults {
  if (tabId === "files") {
    return FILE_TAB_CONFIG.attachment;
  }
  return MANAGED_TAB_CONFIG[tabId].attachment;
}
