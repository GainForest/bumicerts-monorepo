"use client";

import { useMemo, useState } from "react";
import { DatabaseIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalTitle,
} from "@/components/ui/modal/modal";
import { useModal } from "@/components/ui/modal/context";
import { debug } from "@/lib/logger";
import type { DatasetItem } from "@/lib/graphql-dev/queries";

type AddToDatasetModalProps = {
  datasets: DatasetItem[];
  treeCount: number;
  onConfirm: (dataset: DatasetItem) => Promise<(() => void) | void>;
};

const AFTER_CLOSE_UPDATE_DELAY_MS = 350;

function getDatasetUri(dataset: DatasetItem): string | null {
  const uri = dataset.metadata?.uri;
  return typeof uri === "string" && uri.length > 0 ? uri : null;
}

function formatDatasetDate(value: string | null | undefined): string {
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

function formatDatasetOptionLabel(dataset: DatasetItem): string {
  const count = dataset.record?.recordCount ?? 0;
  const createdAt = formatDatasetDate(
    dataset.record?.createdAt ?? dataset.metadata?.createdAt,
  );

  return `${dataset.record?.name ?? "Unnamed dataset"} (${count} tree${count === 1 ? "" : "s"} - ${createdAt})`;
}

export function AddToDatasetModal({
  datasets,
  treeCount,
  onConfirm,
}: AddToDatasetModalProps) {
  const { hide, popModal, stack } = useModal();
  const selectableDatasets = useMemo(
    () => datasets.filter((dataset) => getDatasetUri(dataset) !== null),
    [datasets],
  );
  const firstSelectableDataset = selectableDatasets[0] ?? null;
  const firstDatasetUri = firstSelectableDataset
    ? getDatasetUri(firstSelectableDataset)
    : null;
  const [selectedDatasetUri, setSelectedDatasetUri] = useState(
    firstDatasetUri ?? "",
  );
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selectedDataset =
    selectableDatasets.find(
      (dataset) => getDatasetUri(dataset) === selectedDatasetUri,
    ) ?? null;
  const treeLabel = treeCount === 1 ? "tree" : "trees";

  const handleClose = async () => {
    if (stack.length === 1) {
      await hide();
      popModal();
      return;
    }

    popModal();
  };

  const handleConfirm = async () => {
    if (!selectedDataset) {
      setError("Choose a dataset before continuing.");
      return;
    }

    setIsPending(true);
    setError(null);

    let afterClose: (() => void) | undefined;
    try {
      afterClose = (await onConfirm(selectedDataset)) ?? undefined;
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Trees could not be added.",
      );
      setIsPending(false);
      return;
    }

    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement) {
      activeElement.blur();
    }

    await handleClose();
    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, AFTER_CLOSE_UPDATE_DELAY_MS);
    });
    try {
      afterClose?.();
    } catch (caught) {
      // The tree updates already succeeded. Surface follow-up UI refresh issues
      // outside the dismissed modal instead of re-opening a stale dialog.
      debug.error(caught);
    }
  };

  return (
    <ModalContent dismissible={!isPending}>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <ModalTitle>
            {treeCount === 1 ? "Add tree to dataset" : "Add ungrouped trees"}
          </ModalTitle>
          <ModalDescription>
            {treeCount === 1
              ? `Choose an existing dataset for this ungrouped ${treeLabel}.`
              : `Choose an existing dataset for ${treeCount} ungrouped ${treeLabel} from the review bucket. Search filters do not limit this bulk action.`}
          </ModalDescription>
        </div>

        {selectableDatasets.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
            Create a dataset during tree upload before adding ungrouped trees to it.
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Dataset</label>
              <Select
                value={selectedDatasetUri}
                onValueChange={setSelectedDatasetUri}
                disabled={isPending}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a dataset" />
                </SelectTrigger>
                <SelectContent>
                  {selectableDatasets.map((dataset) => {
                    const uri = getDatasetUri(dataset);
                    if (!uri) {
                      return null;
                    }

                    return (
                      <SelectItem key={uri} value={uri}>
                        {formatDatasetOptionLabel(dataset)}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {selectedDataset ? (
              <div className="rounded-xl border border-border bg-muted/20 p-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-foreground">
                    {selectedDataset.record?.name ?? "Unnamed dataset"}
                  </p>
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <DatabaseIcon className="size-3.5" />
                    {selectedDataset.record?.recordCount ?? 0} tree
                    {(selectedDataset.record?.recordCount ?? 0) === 1 ? "" : "s"}
                  </span>
                </div>
                <p className="mt-2 text-muted-foreground">
                  {selectedDataset.record?.description ??
                    `This will add ${treeCount} ${treeLabel} from the review bucket.`}
                </p>
              </div>
            ) : null}
          </div>
        )}

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>

      <ModalFooter className="mt-5">
        <Button
          variant="outline"
          onClick={() => void handleClose()}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button
          onClick={() => void handleConfirm()}
          disabled={isPending || selectableDatasets.length === 0}
        >
          {isPending ? <Loader2 className="animate-spin" /> : null}
          Add to dataset
        </Button>
      </ModalFooter>
    </ModalContent>
  );
}

export default AddToDatasetModal;
