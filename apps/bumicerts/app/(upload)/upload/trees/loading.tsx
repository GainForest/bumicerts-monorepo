"use client";

import { useSearchParams } from "next/navigation";
import { TreeUploadSkeleton } from "./_components/TreeUploadSkeleton";
import { TreesManageSkeleton } from "./manage/_components/TreesManageSkeleton";

export default function TreesLoading() {
  const searchParams = useSearchParams();

  return searchParams.get("mode") === "upload" ? (
    <TreeUploadSkeleton />
  ) : (
    <TreesManageSkeleton />
  );
}
