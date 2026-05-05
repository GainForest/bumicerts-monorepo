"use client";

import { useMemo, useState } from "react";
import { CheckIcon, DatabaseIcon, Loader2, SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalTitle,
} from "@/components/ui/modal/modal";
import { useModal } from "@/components/ui/modal/context";
import { debug } from "@/lib/logger";
import { cn } from "@/lib/utils";
import type { DatasetItem } from "@/graphql/indexer/queries";

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

function formatDatasetDate(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDatasetMeta(dataset: DatasetItem): string {
  const count = dataset.record?.recordCount ?? 0;
  const createdAt = formatDatasetDate(
    dataset.record?.createdAt ?? dataset.metadata?.createdAt,
  );

  return `${count} tree${count === 1 ? "" : "s"}${createdAt ? ` · Created ${createdAt}` : ""}`;
}

function getDatasetSearchText(dataset: DatasetItem): string {
  return [
    dataset.record?.name,
    dataset.record?.description,
    dataset.record?.recordCount?.toString(),
    dataset.record?.createdAt,
    dataset.metadata?.createdAt,
  ]
    .filter(
      (value): value is string => typeof value === "string" && value.length > 0,
    )
    .join(" ")
    .toLowerCase();
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
  const [selectedDatasetUri, setSelectedDatasetUri] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const filteredDatasets = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return selectableDatasets;
    }

    return selectableDatasets.filter((dataset) =>
      getDatasetSearchText(dataset).includes(query),
    );
  }, [searchQuery, selectableDatasets]);
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
            {treeCount === 1
              ? "Add 1 tree to a dataset"
              : `Add ${treeCount} trees to a dataset`}
          </ModalTitle>
          <ModalDescription>
            {treeCount === 1
              ? `Choose which dataset to add this ${treeLabel} to.`
              : `Choose which dataset to add these ${treeCount} ${treeLabel} to.`}
          </ModalDescription>
        </div>

        {selectableDatasets.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
            Create a dataset during tree upload before adding ungrouped trees to it.
          </div>
        ) : (
          <div className="space-y-3">
            <div className="relative">
              <label htmlFor="dataset-picker-search" className="sr-only">
                Search datasets
              </label>
              <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="dataset-picker-search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search datasets..."
                disabled={isPending}
                className="pl-9"
              />
            </div>

            <div className="max-h-72 overflow-y-auto rounded-xl border border-border">
              {filteredDatasets.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No datasets match your search.
                </div>
              ) : (
                <div
                  role="radiogroup"
                  aria-label="Datasets"
                  className="divide-y divide-border"
                >
                  {filteredDatasets.map((dataset) => {
                    const uri = getDatasetUri(dataset);
                    if (!uri) {
                      return null;
                    }

                    const isSelected = selectedDatasetUri === uri;

                    return (
                      <button
                        key={uri}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        onClick={() => {
                          setSelectedDatasetUri(uri);
                          setError(null);
                        }}
                        disabled={isPending}
                        className={cn(
                          "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/35 disabled:cursor-not-allowed disabled:opacity-60",
                          isSelected ? "bg-primary/5" : "bg-background",
                        )}
                      >
                        <span
                          className={cn(
                            "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border",
                            isSelected
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-muted-foreground/40",
                          )}
                          aria-hidden="true"
                        >
                          {isSelected ? <CheckIcon className="size-3" /> : null}
                        </span>
                        <span className="min-w-0 flex-1 space-y-1">
                          <span className="block truncate text-sm font-medium text-foreground">
                            {dataset.record?.name ?? "Unnamed dataset"}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <DatabaseIcon className="size-3" />
                            {formatDatasetMeta(dataset)}
                          </span>
                          {dataset.record?.description ? (
                            <span className="line-clamp-2 block text-xs text-muted-foreground">
                              {dataset.record.description}
                            </span>
                          ) : null}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {selectedDataset ? (
              <p className="text-xs text-muted-foreground">
                {treeCount} {treeLabel} will be added to{" "}
                <span className="font-medium text-foreground">
                  {selectedDataset.record?.name ?? "the selected dataset"}
                </span>
                .
              </p>
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
          disabled={
            isPending || selectableDatasets.length === 0 || !selectedDataset
          }
        >
          {isPending ? <Loader2 className="animate-spin" /> : null}
          Add to dataset
        </Button>
      </ModalFooter>
    </ModalContent>
  );
}

export default AddToDatasetModal;
