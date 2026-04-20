"use client";

import { TreeUploadWizard } from "./TreeUploadWizard";
import { useTreesMode } from "../_hooks/useTreesMode";
import { TreesManageClient } from "../manage/_components/TreesManageClient";

type TreesPageClientProps = {
  did: string;
};

export function TreesPageClient({ did }: TreesPageClientProps) {
  const [mode] = useTreesMode();

  return mode === "upload" ? (
    <TreeUploadWizard />
  ) : (
    <TreesManageClient did={did} />
  );
}
