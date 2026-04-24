"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Loader2,
  Camera,
  ImageDown,
  DatabaseIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { links } from "@/lib/links";
import { trpc } from "@/lib/trpc/client";
import { indexerTrpc } from "@/lib/trpc/indexer/client";
import type { ValidatedRow } from "@/lib/upload/types";
import { occurrenceInputToCreateInput } from "@/lib/upload/occurrence-adapter";
import { fetchPhotoFromUrl } from "@/lib/upload/fetch-photo-from-url";
import { useModal } from "@/components/ui/modal/context";
import { MODAL_IDS } from "@/components/global/modals/ids";
import PhotoAttachModal from "@/components/global/modals/upload/photo-attachment";
import { formatError, isErrorCode } from "@/lib/utils/trpc-errors";
import { buildTreeDynamicProperties } from "@/lib/upload/tree-dynamic-properties";
import {
  APPEND_EXISTING_DWC_DATASET_CLIENT_ROWS,
  toAppendExistingDatasetRows,
} from "@/lib/upload/append-existing-dataset";
import { uploadTreeDatasetsQueryKey } from "@/lib/upload/tree-upload-datasets";
import {
  NO_UPLOAD_DATASET_SELECTION,
  isUploadDatasetSelection,
  type UploadDatasetSelection,
} from "./upload-dataset-selection";
import { TreeUploadCompleteModal } from "./TreeUploadCompleteModal";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type RowStatus =
  | { state: "pending" }
  | { state: "uploading" }
  | { state: "success"; occurrenceUri: string; photoCount: number }
  | {
      state: "partial";
      occurrenceUri: string;
      photoCount: number;
      error: string;
    }
  | { state: "error"; error: string };

type UploadProgress = {
  current: number;
  total: number;
  successes: number;
  partials: number;
  failures: number;
  currentRow: string;
};

type PhotoFetchStatus = {
  inProgressCount: number;
  successCount: number;
  failureCount: number;
  lastError: string | null;
};

type PhotoFetchProgress = {
  current: number;
  total: number;
  successes: number;
  failures: number;
};

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

export const STORAGE_KEY = "upload-trees-pending";
const SESSION_TTL_MS = 10 * 60 * 1000; // 10 minutes
const REFRESH_WARNING_MESSAGE =
  "The upload finished, but some views may take a moment to refresh.";
const EXISTING_DATASET_UNAVAILABLE_MESSAGE =
  "The selected dataset disappeared during upload. Remaining rows were not added.";
const UNCONFIRMED_EXISTING_DATASET_CHUNK_MESSAGE =
  "This chunk could not be confirmed. Some trees may already be saved; review Tree Manager before retrying.";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getInitialPhotoFetchStatus(): PhotoFetchStatus {
  return {
    inProgressCount: 0,
    successCount: 0,
    failureCount: 0,
    lastError: null,
  };
}

function getOccurrenceUriFromStatus(status: RowStatus | undefined): string | null {
  if (status?.state === "success" || status?.state === "partial") {
    return status.occurrenceUri;
  }

  return null;
}

function hasPersistedOccurrence(status: RowStatus | undefined): boolean {
  return getOccurrenceUriFromStatus(status) !== null;
}

function getOccurrenceRkey(status: RowStatus | undefined): string | null {
  const occurrenceUri = getOccurrenceUriFromStatus(status);
  if (!occurrenceUri) {
    return null;
  }

  const rkey = occurrenceUri.split("/").pop();
  return typeof rkey === "string" && rkey.length > 0 ? rkey : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

type UploadStepProps = {
  did: string;
  validRows: ValidatedRow[];
  establishmentMeans: string | null;
  datasetSelection: UploadDatasetSelection;
  backLabel: string;
  onBack: () => void;
  onComplete: () => void;
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function UploadStep({
  did,
  validRows,
  establishmentMeans,
  datasetSelection,
  backLabel,
  onBack,
  onComplete,
}: UploadStepProps) {
  const createDataset = trpc.dwc.dataset.create.useMutation();
  const deleteDataset = trpc.dwc.dataset.delete.useMutation();
  const updateDataset = trpc.dwc.dataset.update.useMutation();
  const appendExistingDataset = trpc.dwc.dataset.appendExisting.useMutation();
  const createOccurrence = trpc.dwc.occurrence.create.useMutation();
  const updateOccurrence = trpc.dwc.occurrence.update.useMutation();
  const deleteOccurrence = trpc.dwc.occurrence.delete.useMutation();
  const createMeasurement = trpc.dwc.measurement.create.useMutation();
  const indexerUtils = indexerTrpc.useUtils();
  const queryClient = useQueryClient();
  const { pushModal, show } = useModal();

  const [uploadStarted, setUploadStarted] = useState(false);
  const [uploadDone, setUploadDone] = useState(false);
  const [uploadFatalError, setUploadFatalError] = useState<string | null>(null);
  const [datasetUpdateWarning, setDatasetUpdateWarning] = useState<string | null>(null);
  const [uploadedDatasetUri, setUploadedDatasetUri] = useState<string | null>(
    null,
  );
  const [progress, setProgress] = useState<UploadProgress>({
    current: 0,
    total: validRows.length,
    successes: 0,
    partials: 0,
    failures: 0,
    currentRow: "",
  });
  const [rowStatuses, setRowStatuses] = useState<RowStatus[]>(
    validRows.map(() => ({ state: "pending" as const })),
  );
  const [failedRowsOpen, setFailedRowsOpen] = useState(false);

  // Photo attachment state (manual)
  const [photoUris, setPhotoUris] = useState<Map<number, string[]>>(new Map());

  // Phase 2: background photo fetch from URLs
  // Build a flat list of all photos to fetch: { rowIndex, photoIndex, url, subjectPart }
  const photoFetchQueue = useMemo(() => {
    const queue: { rowIndex: number; url: string; subjectPart: string }[] = [];
    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      if (!row?.photos) continue;
      for (const photo of row.photos) {
        queue.push({
          rowIndex: i,
          url: photo.url,
          subjectPart: photo.subjectPart,
        });
      }
    }
    return queue;
  }, [validRows]);
  const hasPhotoUrls = photoFetchQueue.length > 0;

  const [photoFetchStarted, setPhotoFetchStarted] = useState(false);
  const [photoFetchDone, setPhotoFetchDone] = useState(false);
  const [photoFetchStatuses, setPhotoFetchStatuses] = useState<
    Record<number, PhotoFetchStatus>
  >({});
  const [photoFetchProgress, setPhotoFetchProgress] =
    useState<PhotoFetchProgress>({
      current: 0,
      total: photoFetchQueue.length,
      successes: 0,
      failures: 0,
    });

  // Prevent double-run in StrictMode
  const uploadRef = useRef(false);
  const photoFetchRef = useRef(false);
  const completionModalShownRef = useRef(false);

  const resolvedExistingDataset =
    datasetSelection.mode === "existing"
      ? datasetSelection.dataset
      : null;
  const appendExistingDatasetRows = useMemo(
    () => toAppendExistingDatasetRows(validRows),
    [validRows],
  );

  // ── Photo attachment ──────────────────────────────────────────────────────
  const handleAddPhoto = (
    rowIndex: number,
    occurrenceUri: string,
    speciesName: string,
  ) => {
    pushModal(
      {
        id: MODAL_IDS.MANAGE_PHOTO_ATTACH,
        content: (
          <PhotoAttachModal
            occurrenceUri={occurrenceUri}
            speciesName={speciesName}
            onPhotoUploaded={(uploadedPhoto) => {
              if (uploadedPhoto.previewUrl) {
                URL.revokeObjectURL(uploadedPhoto.previewUrl);
              }
              setPhotoUris((prev) => {
                const next = new Map(prev);
                const existing = next.get(rowIndex) ?? [];
                next.set(rowIndex, [...existing, uploadedPhoto.uri]);
                return next;
              });
              setRowStatuses((prev) => {
                const next = [...prev];
                const s = next[rowIndex];
                if (s?.state === "success" || s?.state === "partial") {
                  next[rowIndex] = { ...s, photoCount: s.photoCount + 1 };
                }
                return next;
              });
            }}
          />
        ),
      },
      true,
    );
    show();
  };

  // ── sessionStorage: save pending state before OAuth redirect ──────────────
  useEffect(() => {
    if (validRows.length > 0 && !uploadStarted) {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          ownerDid: did,
          validRows,
          establishmentMeans,
          datasetSelection,
          timestamp: Date.now(),
        }),
      );
    }
  }, [datasetSelection, did, establishmentMeans, uploadStarted, validRows]);

  const setRefreshWarning = useCallback(() => {
    setDatasetUpdateWarning((prev) => prev ?? REFRESH_WARNING_MESSAGE);
  }, []);

  const invalidateTreeQueries = useCallback(async () => {
    const results = await Promise.allSettled([
      indexerUtils.datasets.list.invalidate({ did }),
      indexerUtils.dwc.occurrences.invalidate({ did }),
      indexerUtils.dwc.measurements.invalidate({ did }),
      queryClient.invalidateQueries({
        queryKey: uploadTreeDatasetsQueryKey(did),
      }),
    ]);

    if (results.some((result) => result.status === "rejected")) {
      setRefreshWarning();
    }
  }, [did, indexerUtils, queryClient, setRefreshWarning]);

  const detachUploadedRowsFromUnavailableDataset = useCallback(
    async (statuses: RowStatus[], endExclusive: number) => {
      let demotedSuccesses = 0;

      for (let index = 0; index < endExclusive; index += 1) {
        const status = statuses[index];
        if (!status || (status.state !== "success" && status.state !== "partial")) {
          continue;
        }

        const baseError =
          "The selected dataset disappeared during upload, so this tree was kept without dataset grouping. Review it in Tree Manager.";
        const fallbackError =
          "The selected dataset disappeared during upload and this tree could not be moved out of that dataset automatically. Review it in Tree Manager.";
        const nextBaseError =
          status.state === "partial" ? `${status.error} ${baseError}` : baseError;
        const nextFallbackError =
          status.state === "partial"
            ? `${status.error} ${fallbackError}`
            : fallbackError;
        const rkey = getOccurrenceRkey(status);

        if (!rkey) {
          if (status.state === "success") {
            demotedSuccesses += 1;
          }
          statuses[index] = {
            state: "partial",
            occurrenceUri: status.occurrenceUri,
            photoCount: status.photoCount,
            error: nextFallbackError,
          };
          continue;
        }

        try {
          await updateOccurrence.mutateAsync({
            rkey,
            data: {
              dynamicProperties: buildTreeDynamicProperties(),
            },
            unset: ["datasetRef"],
          });

          if (status.state === "success") {
            demotedSuccesses += 1;
          }
          statuses[index] = {
            state: "partial",
            occurrenceUri: status.occurrenceUri,
            photoCount: status.photoCount,
            error: nextBaseError,
          };
        } catch {
          if (status.state === "success") {
            demotedSuccesses += 1;
          }
          statuses[index] = {
            state: "partial",
            occurrenceUri: status.occurrenceUri,
            photoCount: status.photoCount,
            error: nextFallbackError,
          };
        }
      }

      return demotedSuccesses;
    },
    [updateOccurrence],
  );

  // ── Upload logic ──────────────────────────────────────────────────────────
  const runUpload = useCallback(async () => {
    if (uploadRef.current) return;
    uploadRef.current = true;
    setUploadStarted(true);
    setUploadFatalError(null);
    setDatasetUpdateWarning(null);
    setUploadedDatasetUri(null);

    // Clear sessionStorage once upload begins (state is no longer "pending")
    clearPendingUpload();

    // ── Phase 0: Resolve dataset target ───────────────────────────────────
    let datasetUri: string | undefined;
    let datasetRkey: string | undefined;
    if (datasetSelection.mode === "new" && datasetSelection.name.length > 0) {
      try {
        const dsResult = await createDataset.mutateAsync({
          name: datasetSelection.name,
          ...(datasetSelection.description.length > 0
            ? { description: datasetSelection.description }
            : {}),
          ...(establishmentMeans ? { establishmentMeans } : {}),
        });
        datasetUri = dsResult.uri;
        datasetRkey = dsResult.rkey;
        setUploadedDatasetUri(dsResult.uri);
      } catch {
        setUploadFatalError(
          "Couldn't create the new dataset for this upload. Please try again or continue without a dataset.",
        );
        setUploadDone(true);
        return;
      }
    } else if (datasetSelection.mode === "existing") {
      const nextStatuses = validRows.map<RowStatus>(() => ({ state: "pending" }));
      let successes = 0;
      let partials = 0;
      let failures = 0;
      let stopExistingDatasetUpload = false;

      for (
        let chunkStart = 0;
        chunkStart < appendExistingDatasetRows.length;
        chunkStart += APPEND_EXISTING_DWC_DATASET_CLIENT_ROWS
      ) {
        const chunkRows = appendExistingDatasetRows.slice(
          chunkStart,
          chunkStart + APPEND_EXISTING_DWC_DATASET_CLIENT_ROWS,
        );
        const chunkEnd = chunkStart + chunkRows.length;
        const chunkLabel =
          chunkRows.length === 1
            ? (validRows[chunkStart]?.occurrence.scientificName ||
              `Row ${chunkStart + 1}`)
            : `Rows ${chunkStart + 1}-${chunkEnd}`;

        for (const [chunkIndex] of chunkRows.entries()) {
          nextStatuses[chunkStart + chunkIndex] = { state: "uploading" };
        }
        setRowStatuses([...nextStatuses]);
        setProgress((prev) => ({
          ...prev,
          current: Math.min(chunkStart + 1, validRows.length),
          currentRow: chunkLabel,
        }));

        try {
          const response = await appendExistingDataset.mutateAsync({
            datasetRkey: datasetSelection.dataset.rkey,
            rows: chunkRows,
            establishmentMeans,
          });
          const handledIndexes = new Set<number>();

          setUploadedDatasetUri(
            response.datasetBecameUnavailable ? null : response.datasetUri,
          );

          for (const result of response.results) {
            const globalIndex = chunkStart + result.index;
            handledIndexes.add(globalIndex);

            if (result.state === "success") {
              successes += 1;
              nextStatuses[globalIndex] = {
                state: "success",
                occurrenceUri: result.occurrenceUri,
                photoCount: result.photoCount,
              };
              continue;
            }

            if (result.state === "partial") {
              partials += 1;
              nextStatuses[globalIndex] = {
                state: "partial",
                occurrenceUri: result.occurrenceUri,
                photoCount: result.photoCount,
                error: result.error,
              };
              continue;
            }

            failures += 1;
            nextStatuses[globalIndex] = {
              state: "error",
              error: result.error,
            };
          }

          for (const [chunkIndex] of chunkRows.entries()) {
            const globalIndex = chunkStart + chunkIndex;
            if (handledIndexes.has(globalIndex)) {
              continue;
            }

            failures += 1;
            nextStatuses[globalIndex] = {
              state: "error",
              error: "Unexpected append response for this row.",
            };
          }

          if (response.datasetBecameUnavailable) {
            const demotedSuccesses = await detachUploadedRowsFromUnavailableDataset(
              nextStatuses,
              chunkStart,
            );
            successes -= demotedSuccesses;
            partials += demotedSuccesses;
            setUploadedDatasetUri(null);

            for (
              let remainingIndex = chunkEnd;
              remainingIndex < nextStatuses.length;
              remainingIndex += 1
            ) {
              nextStatuses[remainingIndex] = {
                state: "error",
                error: EXISTING_DATASET_UNAVAILABLE_MESSAGE,
              };
              failures += 1;
            }
            stopExistingDatasetUpload = true;
          }
        } catch (error) {
          const baseMessage = formatError(error);
          const datasetUnavailable = isErrorCode(error, "PRECONDITION_FAILED");
          const chunkMessage =
            datasetUnavailable
              ? EXISTING_DATASET_UNAVAILABLE_MESSAGE
              : `${baseMessage} ${UNCONFIRMED_EXISTING_DATASET_CHUNK_MESSAGE}`;

          if (datasetUnavailable) {
            const demotedSuccesses = await detachUploadedRowsFromUnavailableDataset(
              nextStatuses,
              chunkStart,
            );
            successes -= demotedSuccesses;
            partials += demotedSuccesses;
            setUploadedDatasetUri(null);
          }

          for (
            let remainingIndex = chunkStart;
            remainingIndex < nextStatuses.length;
            remainingIndex += 1
          ) {
            nextStatuses[remainingIndex] = {
              state: "error",
              error: chunkMessage,
            };
            failures += 1;
          }

          stopExistingDatasetUpload = true;
        }

        setRowStatuses([...nextStatuses]);
        setProgress({
          current: successes + partials + failures,
          total: validRows.length,
          successes,
          partials,
          failures,
          currentRow: "",
        });

        if (stopExistingDatasetUpload) {
          break;
        }
      }

      if (successes + partials > 0) {
        await invalidateTreeQueries();
      }

      setUploadDone(true);
      return;
    }

    // ── Phase 1: Create occurrences + measurements ────────────────────────
    let successes = 0;
    let partials = 0;
    let failures = 0;

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      if (!row) continue;
      const speciesName = row.occurrence.scientificName || `Row ${i + 1}`;

      // Mark row as uploading
      setRowStatuses((prev) => {
        const next = [...prev];
        next[i] = { state: "uploading" };
        return next;
      });
      setProgress((prev) => ({
        ...prev,
        current: i + 1,
        currentRow: speciesName,
      }));

      try {
        // 1. Create occurrence — adapter converts number lat/lon → string for ATProto
        const occurrence: typeof row.occurrence = {
          ...row.occurrence,
          ...(establishmentMeans ? { establishmentMeans } : {}),
          ...(datasetUri ? { datasetRef: datasetUri } : {}),
          dynamicProperties: buildTreeDynamicProperties(datasetUri),
        };
        const occInput = occurrenceInputToCreateInput(occurrence);
        const occResult = await createOccurrence.mutateAsync(occInput);

        try {
          // 2. Create one bundled measurement record per occurrence
          if (row.floraMeasurement) {
            await createMeasurement.mutateAsync({
              occurrenceRef: occResult.uri,
              flora: {
                dbh: row.floraMeasurement.dbh,
                totalHeight: row.floraMeasurement.totalHeight,
                basalDiameter: row.floraMeasurement.diameter,
                canopyCoverPercent: row.floraMeasurement.canopyCoverPercent,
              },
            });
          }
        } catch (measurementError) {
          try {
            await deleteOccurrence.mutateAsync({ rkey: occResult.rkey });
          } catch {
            partials += 1;
            setRowStatuses((prev) => {
              const next = [...prev];
              next[i] = {
                state: "partial",
                occurrenceUri: occResult.uri,
                photoCount: 0,
                error:
                  "The tree was created, but its measurement failed and the automatic rollback did not complete. Review this tree in Tree Manager.",
              };
              return next;
            });
            setProgress((prev) => ({
              ...prev,
              current: i + 1,
              currentRow: speciesName,
              successes,
              partials,
              failures,
            }));
            continue;
          }

          throw measurementError;
        }

        successes += 1;
        setRowStatuses((prev) => {
          const next = [...prev];
          next[i] = {
            state: "success",
            occurrenceUri: occResult.uri,
            photoCount: 0,
          };
          return next;
        });
      } catch (err) {
        failures += 1;
        setRowStatuses((prev) => {
          const next = [...prev];
          next[i] = { state: "error", error: formatError(err) };
          return next;
        });
      }

      setProgress((prev) => ({
        ...prev,
        successes,
        partials,
        failures,
      }));
    }

    // ── Phase 1.5: Update dataset with final recordCount ──────────────────
    const persistedOccurrences = successes + partials;
    if (
      datasetSelection.mode === "new" &&
      datasetRkey &&
      persistedOccurrences === 0
    ) {
      try {
        await deleteDataset.mutateAsync({ rkey: datasetRkey });
        setUploadedDatasetUri(null);
      } catch {
        setDatasetUpdateWarning(
          "The empty dataset could not be removed automatically. You can delete it later from Tree Manager.",
        );
      }
    }

    if (
      datasetSelection.mode !== "none" &&
      datasetRkey &&
      persistedOccurrences > 0
    ) {
      try {
        await updateDataset.mutateAsync({
          rkey: datasetRkey,
          data: { recordCount: persistedOccurrences },
        });
      } catch {
        setDatasetUpdateWarning(
          "The dataset was created, but its tree count could not be updated yet.",
        );
      }
    }

    if (persistedOccurrences > 0) {
      await invalidateTreeQueries();
    }

    setUploadDone(true);
  }, [
    appendExistingDataset,
    appendExistingDatasetRows,
    createDataset,
    deleteDataset,
    deleteOccurrence,
    detachUploadedRowsFromUnavailableDataset,
    createOccurrence,
    createMeasurement,
    datasetSelection,
    establishmentMeans,
    invalidateTreeQueries,
    updateDataset,
    validRows,
  ]);

  // Auto-start upload on mount (layout already enforces auth)
  useEffect(() => {
    if (!uploadStarted) {
      void runUpload();
    }
  }, [runUpload, uploadStarted]);

  // ── Phase 2: Fetch photos from URLs (background, after Phase 1) ───────────
  const runPhotoFetch = useCallback(async () => {
    if (photoFetchRef.current) return;
    photoFetchRef.current = true;
    setPhotoFetchStarted(true);

    let successes = 0;
    let failures = 0;

    for (let pIdx = 0; pIdx < photoFetchQueue.length; pIdx++) {
      const entry = photoFetchQueue[pIdx];
      if (!entry) continue;
      const { rowIndex, url, subjectPart } = entry;

      // Find the occurrence URI from Phase 1
      const rowStatus = rowStatuses[rowIndex];
      const occurrenceUri = getOccurrenceUriFromStatus(rowStatus);
      if (!occurrenceUri) {
        // Occurrence failed — skip photo for this row
        failures += 1;
        setPhotoFetchStatuses((prev) => ({
          ...prev,
          [rowIndex]: {
            ...(prev[rowIndex] ?? getInitialPhotoFetchStatus()),
            failureCount: (prev[rowIndex]?.failureCount ?? 0) + 1,
            lastError: "Occurrence upload failed; photo skipped.",
          },
        }));
        setPhotoFetchProgress((prev) => ({
          ...prev,
          current: pIdx + 1,
          failures,
        }));
        continue;
      }

      // Mark as fetching
      setPhotoFetchStatuses((prev) => ({
        ...prev,
        [rowIndex]: {
          ...(prev[rowIndex] ?? getInitialPhotoFetchStatus()),
          inProgressCount: (prev[rowIndex]?.inProgressCount ?? 0) + 1,
        },
      }));
      setPhotoFetchProgress((prev) => ({
        ...prev,
        current: pIdx + 1,
      }));

      try {
        const result = await fetchPhotoFromUrl({
          url,
          occurrenceRef: occurrenceUri,
          subjectPart,
        });

        successes += 1;
        setPhotoFetchStatuses((prev) => ({
          ...prev,
          [rowIndex]: {
            ...(prev[rowIndex] ?? getInitialPhotoFetchStatus()),
            inProgressCount: Math.max(
              0,
              (prev[rowIndex]?.inProgressCount ?? 0) - 1,
            ),
            successCount: (prev[rowIndex]?.successCount ?? 0) + 1,
          },
        }));

        // Also update the row's photo count + photo URIs
        setPhotoUris((prev) => {
          const next = new Map(prev);
          const existing = next.get(rowIndex) ?? [];
          next.set(rowIndex, [...existing, result.uri]);
          return next;
        });
        setRowStatuses((prev) => {
          const next = [...prev];
          const s = next[rowIndex];
          if (s?.state === "success" || s?.state === "partial") {
            next[rowIndex] = { ...s, photoCount: s.photoCount + 1 };
          }
          return next;
        });
      } catch (err) {
        failures += 1;
        setPhotoFetchStatuses((prev) => ({
          ...prev,
          [rowIndex]: {
            ...(prev[rowIndex] ?? getInitialPhotoFetchStatus()),
            inProgressCount: Math.max(
              0,
              (prev[rowIndex]?.inProgressCount ?? 0) - 1,
            ),
            failureCount: (prev[rowIndex]?.failureCount ?? 0) + 1,
            lastError: formatError(err),
          },
        }));
      }

      setPhotoFetchProgress((prev) => ({
        ...prev,
        successes,
        failures,
      }));
    }

    setPhotoFetchDone(true);

    if (successes > 0) {
      await indexerUtils.multimedia.list.invalidate({ did }).catch(() => {
        setRefreshWarning();
      });
    }
  }, [did, indexerUtils, photoFetchQueue, rowStatuses, setRefreshWarning]);

  // Auto-start photo fetch after Phase 1 completes
  useEffect(() => {
    if (
      uploadDone
      && hasPhotoUrls
      && progress.successes + progress.partials > 0
      && !photoFetchStarted
      && !uploadFatalError
    ) {
      void runPhotoFetch();
    }
  }, [
    hasPhotoUrls,
    photoFetchStarted,
    progress.partials,
    progress.successes,
    runPhotoFetch,
    uploadDone,
    uploadFatalError,
  ]);

  // ── Derived values ────────────────────────────────────────────────────────
  const { current, total, successes, partials, failures, currentRow } = progress;
  const progressPercent = total > 0 ? Math.round((current / total) * 100) : 0;
  const progressLabel = uploadStarted
    ? `Uploading row ${current} of ${total}${currentRow ? ` — ${currentRow}` : ""}...`
    : "Preparing upload...";
  const selectedDatasetName =
    datasetSelection.mode === "new"
      ? datasetSelection.name
      : resolvedExistingDataset?.name ?? null;
  const attentionCount = failures + partials;
  const persistedCount = successes + partials;
  const allSucceeded =
    uploadDone && failures === 0 && partials === 0 && !uploadFatalError;
  const someFailed = uploadDone && attentionCount > 0 && !uploadFatalError;

  // Phase 2 is complete when either there are no photo URLs, photo fetch is done,
  // or the upload stopped before any records were written.
  const allPhasesComplete = uploadFatalError
    ? uploadDone
    : uploadDone && (!hasPhotoUrls || photoFetchDone);
  const isUploadInProgress = uploadStarted && !allPhasesComplete;
  const photoFetchPercent =
    photoFetchProgress.total > 0
      ? Math.round(
          (photoFetchProgress.current / photoFetchProgress.total) * 100,
        )
      : 0;
  const hasUploadedTrees = persistedCount > 0;
  const treeManagerHref = links.manage.treesFiltered({
    dataset: uploadedDatasetUri,
  });
  const treeManagerLabel = uploadedDatasetUri
    ? "View Dataset in Tree Manager"
    : "View Trees in Tree Manager";

  useEffect(() => {
    if (
      !allPhasesComplete ||
      uploadFatalError ||
      !hasUploadedTrees ||
      completionModalShownRef.current
    ) {
      return;
    }

    completionModalShownRef.current = true;

    pushModal(
      {
        id: MODAL_IDS.UPLOAD_TREES_COMPLETE,
        content: (
          <TreeUploadCompleteModal
            totalCount={total}
            savedCount={persistedCount}
            partialCount={partials}
            failedCount={failures}
            photoFailureCount={photoFetchProgress.failures}
            treeManagerHref={treeManagerHref}
            treeManagerLabel={treeManagerLabel}
            onUploadMore={onComplete}
          />
        ),
        dialogWidth: "max-w-md",
      },
      true,
    );
    void show();
  }, [
    allPhasesComplete,
    failures,
    hasUploadedTrees,
    onComplete,
    partials,
    persistedCount,
    photoFetchProgress.failures,
    pushModal,
    show,
    total,
    treeManagerHref,
    treeManagerLabel,
    uploadFatalError,
  ]);

  useEffect(() => {
    if (!isUploadInProgress) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isUploadInProgress]);

  const attentionRows = rowStatuses
    .map((status, i) => ({ status, row: validRows[i], index: i }))
    .filter((r) => r.status.state === "error" || r.status.state === "partial");

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold">Saving your records</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Saving {total} tree record{total !== 1 ? "s" : ""} to the GainForest
          network.
        </p>
        {selectedDatasetName ? (
          <p className="text-xs text-muted-foreground mt-1">
            {datasetSelection.mode === "existing"
              ? `Adding this upload to ${selectedDatasetName}.`
              : `Creating dataset ${selectedDatasetName} for this upload.`}
          </p>
        ) : null}
      </div>

      {isUploadInProgress ? (
        <div className="flex items-start gap-3 rounded-md border border-yellow-500/40 bg-yellow-500/10 p-3 text-sm text-yellow-700 dark:text-yellow-300">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-medium">Do not refresh or close this page</p>
            <p>
              Keep this tab open until the upload completes. Refreshing now may
              interrupt saving records or photos.
            </p>
          </div>
        </div>
      ) : null}

      {/* Progress bar */}
      {!uploadDone && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {progressLabel}
            </span>
            <span className="text-muted-foreground font-mono">
              {progressPercent}%
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {successes} succeeded
            {partials > 0 ? `, ${partials} need follow-up` : ""}
            {`, ${failures} failed`}
          </p>
        </div>
      )}

      {/* Completion banner — all succeeded */}
      {uploadFatalError ? (
        <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{uploadFatalError}</span>
        </div>
      ) : null}

      {uploadDone && allSucceeded && (
        <div className="flex items-center gap-2 rounded-md border border-green-500/40 bg-green-500/10 p-3 text-sm text-green-600 dark:text-green-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>
            Successfully uploaded {successes} tree record
            {successes !== 1 ? "s" : ""}.
          </span>
        </div>
      )}

      {/* Completion banner — some failed */}
      {uploadDone && someFailed && (
        <div className="flex items-center gap-2 rounded-md border border-yellow-500/40 bg-yellow-500/10 p-3 text-sm text-yellow-600 dark:text-yellow-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            {persistedCount} record{persistedCount !== 1 ? "s" : ""} saved
            {partials > 0 ? `, ${partials} need follow-up` : ""}
            {failures > 0 ? `, ${failures} failed` : ""}.
          </span>
        </div>
      )}

      {datasetUpdateWarning ? (
        <div className="flex items-center gap-2 rounded-md border border-yellow-500/40 bg-yellow-500/10 p-3 text-sm text-yellow-600 dark:text-yellow-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{datasetUpdateWarning}</span>
        </div>
      ) : null}

      {/* Phase 2: Photo fetch progress */}
      {uploadDone && hasPhotoUrls && !uploadFatalError && (
        <div className="space-y-2 rounded-lg border border-border p-4">
          <div className="flex items-center gap-2">
            <ImageDown className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-medium">
              {photoFetchDone
                ? "Photo fetch complete"
                : "Fetching photos from URLs\u2026"}
            </h3>
          </div>

          {!photoFetchDone && (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Photo {photoFetchProgress.current} of{" "}
                  {photoFetchProgress.total}
                </span>
                <span className="text-muted-foreground font-mono">
                  {photoFetchPercent}%
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{ width: `${photoFetchPercent}%` }}
                />
              </div>
            </>
          )}

          <p className="text-xs text-muted-foreground">
            {photoFetchProgress.successes} fetched
            {photoFetchProgress.failures > 0
              ? `, ${photoFetchProgress.failures} failed`
              : ""}
            {" of "}
            {photoFetchProgress.total} photo URL
            {photoFetchProgress.total !== 1 ? "s" : ""}
          </p>

          {photoFetchDone && photoFetchProgress.failures > 0 && (
            <p className="text-xs text-yellow-600 dark:text-yellow-400">
              Some photos could not be fetched. You can add them manually using
              the Tree Manager.
            </p>
          )}
        </div>
      )}

      {/* Per-row status list */}
      {!uploadFatalError ? (
        <div className="rounded-lg border overflow-hidden">
          <div className="max-h-64 overflow-y-auto divide-y divide-border">
            {validRows.map((row, i) => {
              const status = rowStatuses[i];
              const species = row.occurrence.scientificName || `Row ${i + 1}`;
              const rowPhotos = photoUris.get(i) ?? [];
              const hasOccurrence = hasPersistedOccurrence(status);
              const occUri = getOccurrenceUriFromStatus(status);
              const truncatedUri = occUri
                ? occUri.length > 32
                  ? `…${occUri.slice(-28)}`
                  : occUri
                : null;
              return (
                <div
                  key={i}
                  className="flex items-center gap-3 px-3 py-2 text-sm"
                >
                  <span className="font-mono text-xs text-muted-foreground w-6 shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="block truncate">{species}</span>
                    {truncatedUri ? (
                      <span className="block text-xs text-muted-foreground font-mono truncate">
                        {truncatedUri}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {rowPhotos.length > 0 ? (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Camera className="h-3 w-3" />
                        {rowPhotos.length}
                      </span>
                    ) : null}
                    {(() => {
                      const pfs = photoFetchStatuses[i];
                      if ((pfs?.inProgressCount ?? 0) > 0) {
                        return (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <ImageDown className="h-3 w-3 animate-pulse" />
                          </span>
                        );
                      }
                      if ((pfs?.failureCount ?? 0) > 0) {
                        return (
                          <span
                            className="text-xs text-yellow-500"
                            title={
                              pfs?.lastError ??
                              `${pfs?.failureCount ?? 0} photo fetch${(pfs?.failureCount ?? 0) === 1 ? "" : "es"} failed.`
                            }
                          >
                            <AlertTriangle className="h-3 w-3" />
                          </span>
                        );
                      }
                      return null;
                    })()}
                    <span>
                      {status?.state === "pending" ? (
                        <span className="text-xs text-muted-foreground">
                          Pending
                        </span>
                      ) : null}
                      {status?.state === "uploading" ? (
                        <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
                      ) : null}
                      {status?.state === "success" ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : null}
                      {status?.state === "partial" ? (
                        <span title={status.error}>
                          <AlertTriangle className="h-4 w-4 text-yellow-500" />
                        </span>
                      ) : null}
                      {status?.state === "error" ? (
                        <XCircle className="h-4 w-4 text-destructive" />
                      ) : null}
                    </span>
                    {hasOccurrence && occUri && allPhasesComplete ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-xs gap-1"
                        onClick={() => handleAddPhoto(i, occUri, species)}
                      >
                        <Camera className="h-3 w-3" />
                        Add Photo
                      </Button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* Failed rows detail (collapsible) */}
      {attentionRows.length > 0 && !uploadFatalError && (
        <div className="rounded-lg border border-destructive/30 overflow-hidden">
          <button
            type="button"
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-left hover:bg-muted/30 transition-colors"
            onClick={() => setFailedRowsOpen((v) => !v)}
          >
            <span className="flex items-center gap-2 text-destructive">
              <XCircle className="h-4 w-4 shrink-0" />
              {attentionCount} row{attentionCount !== 1 ? "s" : ""} need attention
            </span>
            {failedRowsOpen ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
          {failedRowsOpen && (
            <div className="border-t border-destructive/20 px-4 py-3">
              <ul className="space-y-2 max-h-48 overflow-y-auto">
                {attentionRows.map(({ status, row, index }) => (
                  <li
                    key={index}
                    className="text-xs border border-destructive/20 rounded-md p-2 space-y-0.5"
                  >
                    <p className="font-medium text-foreground">
                      Row {index + 1} —{" "}
                      {row?.occurrence.scientificName ?? "(no species)"}
                    </p>
                    <p className="text-destructive">
                      {status.state === "error" || status.state === "partial"
                        ? status.error
                        : "Unknown error"}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <Button
          variant="outline"
          onClick={onBack}
          disabled={uploadStarted && !allPhasesComplete}
        >
          {backLabel}
        </Button>

        {allPhasesComplete && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={onComplete}>
              {uploadFatalError ? "Start Over" : "Upload More Data"}
            </Button>
            {!uploadFatalError && hasUploadedTrees ? (
              <Button asChild>
                <Link href={treeManagerHref}>
                  <DatabaseIcon />
                  {treeManagerLabel}
                </Link>
              </Button>
            ) : !uploadFatalError ? (
              <Button onClick={onComplete}>Done</Button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// sessionStorage helpers (exported for use by the wizard on mount)
// ─────────────────────────────────────────────────────────────────────────────

type PendingUploadData = {
  ownerDid: string;
  validRows: ValidatedRow[];
  establishmentMeans: string | null;
  datasetSelection: UploadDatasetSelection;
  timestamp: number;
};

type PendingUploadCandidate = {
  ownerDid: string;
  validRows: ValidatedRow[];
  establishmentMeans?: unknown;
  datasetSelection?: unknown;
  timestamp: number;
};

function isPendingUploadCandidate(
  value: unknown,
): value is PendingUploadCandidate {
  return (
    isRecord(value) &&
    typeof value.ownerDid === "string" &&
    Array.isArray(value.validRows) &&
    typeof value.timestamp === "number"
  );
}

/**
 * Reads pending upload data from sessionStorage.
 * Returns the data if it exists and is less than 10 minutes old, otherwise null.
 */
export function readPendingUpload(ownerDid: string): PendingUploadData | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isPendingUploadCandidate(parsed)) {
      clearPendingUpload();
      return null;
    }
    if (Date.now() - parsed.timestamp > SESSION_TTL_MS) {
      clearPendingUpload();
      return null;
    }
    if (parsed.ownerDid !== ownerDid) {
      return null;
    }
    return {
      ownerDid: parsed.ownerDid,
      validRows: parsed.validRows,
      establishmentMeans:
        typeof parsed.establishmentMeans === "string" ||
        parsed.establishmentMeans === null
          ? parsed.establishmentMeans
          : null,
      datasetSelection: isUploadDatasetSelection(parsed.datasetSelection)
        ? parsed.datasetSelection
        : NO_UPLOAD_DATASET_SELECTION,
      timestamp: parsed.timestamp,
    };
  } catch {
    return null;
  }
}

/**
 * Clears pending upload data from sessionStorage.
 */
export function clearPendingUpload(): void {
  sessionStorage.removeItem(STORAGE_KEY);
}
