"use client";

import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  DatabaseIcon,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useModal } from "@/components/ui/modal/context";
import {
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/modal/modal";

type TreeUploadCompleteModalProps = {
  totalCount: number;
  savedCount: number;
  partialCount: number;
  failedCount: number;
  photoFailureCount: number;
  treeManagerHref: string;
  treeManagerLabel: string;
  onUploadMore: () => void;
};

function pluralize(
  count: number,
  singular: string,
  plural = `${singular}s`,
): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function TreeUploadCompleteModal({
  totalCount,
  savedCount,
  partialCount,
  failedCount,
  photoFailureCount,
  treeManagerHref,
  treeManagerLabel,
  onUploadMore,
}: TreeUploadCompleteModalProps) {
  const { hide, clear } = useModal();
  const router = useRouter();

  const hasRowAttention = partialCount > 0 || failedCount > 0;
  const hasPhotoAttention = photoFailureCount > 0;
  const hasAttention = hasRowAttention || hasPhotoAttention;

  const handleStayOnSummary = async () => {
    await hide();
    clear();
  };

  const handleUploadMore = async () => {
    await hide();
    clear();
    onUploadMore();
  };

  const handleViewTrees = async () => {
    await hide();
    clear();
    router.push(treeManagerHref);
  };

  return (
    <ModalContent dismissible={false} className="space-y-5">
      <ModalHeader>
        <ModalTitle>Tree upload complete</ModalTitle>
        <ModalDescription>
          Your upload has finished. Choose what you want to do next.
        </ModalDescription>
      </ModalHeader>

      <div className="space-y-4">
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-green-500/20 bg-green-500/5 px-4 py-5 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-green-500/10 text-green-600 dark:text-green-400">
            <CheckCircle2 className="size-7" />
          </div>
          <div className="space-y-1">
            <p className="text-base font-semibold">
              {pluralize(savedCount, "tree record")} saved
            </p>
            <p className="text-sm text-muted-foreground">
              Upload complete for {pluralize(totalCount, "row")}. Your saved
              trees are available in Tree Manager.
            </p>
          </div>
        </div>

        {hasAttention ? (
          <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-700 dark:text-yellow-300">
            <div className="flex gap-2">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <div className="space-y-1">
                <p className="font-medium">Some items need review</p>
                <ul className="list-disc space-y-0.5 pl-4 text-xs">
                  {partialCount > 0 ? (
                    <li>
                      {pluralize(partialCount, "saved row")} {" "}
                      {partialCount === 1 ? "needs" : "need"} follow-up.
                    </li>
                  ) : null}
                  {failedCount > 0 ? (
                    <li>{pluralize(failedCount, "row")} failed to upload.</li>
                  ) : null}
                  {photoFailureCount > 0 ? (
                    <li>
                      {pluralize(photoFailureCount, "photo")} could not be
                      fetched automatically.
                    </li>
                  ) : null}
                </ul>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <ModalFooter className="gap-2">
        <Button onClick={handleViewTrees}>
          <DatabaseIcon />
          {treeManagerLabel}
        </Button>
        <Button variant="outline" onClick={handleUploadMore}>
          <RotateCcw />
          Upload more trees
        </Button>
        <Button variant="ghost" onClick={handleStayOnSummary}>
          Stay on summary
        </Button>
      </ModalFooter>
    </ModalContent>
  );
}
