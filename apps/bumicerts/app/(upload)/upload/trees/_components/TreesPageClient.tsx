"use client";

import { TreeUploadWizard } from "./TreeUploadWizard";
import { useTreesMode } from "../_hooks/useTreesMode";
import { TreesManageClient } from "./TreesManageClient";

type TreesPageClientProps = {
  did: string;
};

export function TreesPageClient({ did }: TreesPageClientProps) {
  const [mode] = useTreesMode();

  return mode === "upload" ? (
    <TreeUploadWizard did={did} />
  ) : (
    <TreesManageClient did={did} />
  );
}
