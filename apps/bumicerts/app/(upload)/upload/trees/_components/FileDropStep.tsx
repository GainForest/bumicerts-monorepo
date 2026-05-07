"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useRef, useState } from "react";
import { Archive, FileSpreadsheet, Upload, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCsvParser } from "@/lib/upload/use-csv-parser";
import { PARTNER_ESTABLISHMENT_MEANS_OPTIONS } from "@/lib/upload/establishment-means";
import { detectKoboFormat } from "@/lib/upload/kobo-mapper";
import { autoDetectMappings } from "@/lib/upload/column-mapper";
import {
  fetchUploadTreeDatasets,
  type UploadTreeDatasetItem,
  uploadTreeDatasetsQueryKey,
} from "@/lib/upload/tree-upload-datasets";
import { links } from "@/lib/links";
import { cn } from "@/lib/utils";
import type { ColumnMapping } from "@/lib/upload/types";
import {
  buildKoboMediaZipIndex,
  type KoboMediaZipIndex,
} from "@/lib/upload/kobo-media-zip";
import TreeDataGuide from "./TreeDataGuide";
import type {
  ExistingUploadDatasetSelection,
  UploadDatasetSelection,
} from "./upload-dataset-selection";

type FileDropStepProps = {
  did: string;
  initialEstablishmentMeans: string | null;
  initialDatasetSelection: UploadDatasetSelection;
  onFileAndMappings: (
    file: File,
    koboMediaZipFile: File | null,
    koboMediaZipIndex: KoboMediaZipIndex | null,
    parsedData: Record<string, string>[],
    headers: string[],
    mappings: ColumnMapping[],
    establishmentMeans: string | null,
    datasetSelection: UploadDatasetSelection,
  ) => void;
};

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_MEDIA_ZIP_SIZE_BYTES = 200 * 1024 * 1024; // 200 MB
const ACCEPTED_EXTENSIONS = [".csv", ".tsv"];
const ACCEPTED_MIME_TYPES = ["text/csv", "text/tab-separated-values", "application/csv"];
const ACCEPTED_MEDIA_ZIP_MIME_TYPES = [
  "application/zip",
  "application/x-zip-compressed",
  "multipart/x-zip",
];
const DATASET_MODE_OPTIONS: Array<{
  mode: UploadDatasetSelection["mode"];
  title: string;
  description: string;
}> = [
  {
    mode: "none",
    title: "No dataset",
    description: "Upload these trees without grouping them into a dataset.",
  },
  {
    mode: "new",
    title: "Create new dataset",
    description: "Start a new dataset for this upload so it is easy to find later.",
  },
  {
    mode: "existing",
    title: "Add to existing dataset",
    description: "Append these trees to a dataset that already exists in Tree Manager.",
  },
];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isAcceptedFile(file: File): boolean {
  const name = file.name.toLowerCase();
  const hasValidExtension = ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext));
  const hasValidMime = ACCEPTED_MIME_TYPES.includes(file.type);
  return hasValidExtension || (file.type !== "" && hasValidMime);
}

function isAcceptedMediaZipFile(file: File): boolean {
  const name = file.name.toLowerCase();
  const hasValidExtension = name.endsWith(".zip");
  const hasValidMime = ACCEPTED_MEDIA_ZIP_MIME_TYPES.includes(file.type);
  return hasValidExtension || (file.type !== "" && hasValidMime);
}

function formatDatasetDate(value: string | null | undefined): string {
  if (!value) {
    return "Date unavailable";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Date unavailable";
  }

  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function toExistingUploadDatasetSelection(
  dataset: UploadTreeDatasetItem,
): ExistingUploadDatasetSelection {
  return {
    uri: dataset.uri,
    rkey: dataset.rkey,
    name: dataset.name,
    description: dataset.description,
    recordCount: dataset.recordCount,
  };
}

export default function FileDropStep({
  did,
  initialEstablishmentMeans,
  initialDatasetSelection,
  onFileAndMappings,
}: FileDropStepProps) {
  const { parsedData, headers, rowCount, error, isParsing, parseFile, reset } =
    useCsvParser();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedMediaZipFile, setSelectedMediaZipFile] = useState<File | null>(
    null,
  );
  const [mediaZipIndex, setMediaZipIndex] = useState<KoboMediaZipIndex | null>(
    null,
  );
  const [fileError, setFileError] = useState<string | null>(null);
  const [mediaZipError, setMediaZipError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isMediaZipParsing, setIsMediaZipParsing] = useState(false);
  const [establishmentMeans, setEstablishmentMeans] = useState<string | null>(
    initialEstablishmentMeans,
  );
  const [datasetMode, setDatasetMode] =
    useState<UploadDatasetSelection["mode"]>(initialDatasetSelection.mode);
  const [datasetName, setDatasetName] = useState(
    initialDatasetSelection.mode === "new"
      ? initialDatasetSelection.name
      : "",
  );
  const [datasetDescription, setDatasetDescription] = useState(
    initialDatasetSelection.mode === "new"
      ? initialDatasetSelection.description
      : "",
  );
  const [selectedExistingDatasetUri, setSelectedExistingDatasetUri] =
    useState<string>(
      initialDatasetSelection.mode === "existing"
        ? initialDatasetSelection.dataset.uri
        : "",
    );
  const existingDatasetsQuery = useQuery({
    queryKey: uploadTreeDatasetsQueryKey(did),
    queryFn: fetchUploadTreeDatasets,
    enabled: datasetMode === "existing",
    staleTime: 0,
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const mediaZipInputRef = useRef<HTMLInputElement>(null);
  const mediaZipParseRequestRef = useRef(0);

  const detectedFormat =
    headers.length > 0 ? detectKoboFormat(headers) : null;
  const existingDatasets = useMemo(
    () => existingDatasetsQuery.data ?? [],
    [existingDatasetsQuery.data],
  );
  const selectedExistingDataset = useMemo(() => {
    const match = existingDatasets.find(
      (dataset) => dataset.uri === selectedExistingDatasetUri,
    );

    return match ? toExistingUploadDatasetSelection(match) : null;
  }, [existingDatasets, selectedExistingDatasetUri]);

  const handleFile = useCallback(
    (file: File) => {
      setFileError(null);

      if (!isAcceptedFile(file)) {
        setFileError("Only .csv and .tsv files are supported.");
        return;
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        setFileError(`File is too large. Maximum size is 10 MB (got ${formatBytes(file.size)}).`);
        return;
      }

      reset();
      setSelectedFile(file);
      parseFile(file);
    },
    [parseFile, reset]
  );

  const handleMediaZipFile = useCallback(async (file: File) => {
    const requestId = mediaZipParseRequestRef.current + 1;
    mediaZipParseRequestRef.current = requestId;
    setMediaZipError(null);
    setMediaZipIndex(null);
    setSelectedMediaZipFile(null);
    setIsMediaZipParsing(false);

    if (!isAcceptedMediaZipFile(file)) {
      setMediaZipError("Only Kobo Media Attachments .zip files are supported.");
      return;
    }

    if (file.size > MAX_MEDIA_ZIP_SIZE_BYTES) {
      setMediaZipError(
        `ZIP file is too large. Maximum size is 200 MB (got ${formatBytes(file.size)}).`,
      );
      return;
    }

    setIsMediaZipParsing(true);
    try {
      const index = await buildKoboMediaZipIndex(file);
      if (mediaZipParseRequestRef.current !== requestId) {
        return;
      }

      if (index.entries.length === 0) {
        setMediaZipError(
          "No supported image attachments were found in this ZIP. Make sure you selected KoboToolbox's Media Attachments export.",
        );
        return;
      }

      setSelectedMediaZipFile(file);
      setMediaZipIndex(index);
    } catch {
      if (mediaZipParseRequestRef.current !== requestId) {
        return;
      }

      setMediaZipError(
        "Couldn't read this ZIP file. Please export Media Attachments (ZIP) from KoboToolbox and try again.",
      );
    } finally {
      if (mediaZipParseRequestRef.current === requestId) {
        setIsMediaZipParsing(false);
      }
    }
  }, []);

  const handleRemoveMediaZip = () => {
    mediaZipParseRequestRef.current += 1;
    setSelectedMediaZipFile(null);
    setMediaZipIndex(null);
    setMediaZipError(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset input so the same file can be re-selected
    e.target.value = "";
  };

  const handleMediaZipInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void handleMediaZipFile(file);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleContinue = () => {
    if (!selectedFile || parsedData.length === 0) return;

    const koboResult = detectKoboFormat(headers);
    const mappings = koboResult.isKobo
      ? koboResult.mappings
      : autoDetectMappings(headers);

    const trimmedDatasetName = datasetName.trim();
    const trimmedDatasetDescription = datasetDescription.trim();
    const datasetSelection: UploadDatasetSelection =
      datasetMode === "new"
        ? {
            mode: "new",
            name: trimmedDatasetName,
            description: trimmedDatasetDescription,
          }
        : datasetMode === "existing" && selectedExistingDataset
          ? {
              mode: "existing",
              dataset: selectedExistingDataset,
            }
          : { mode: "none" };

    onFileAndMappings(
      selectedFile,
      selectedMediaZipFile,
      mediaZipIndex,
      parsedData,
      headers,
      mappings,
      establishmentMeans,
      datasetSelection,
    );
  };

  const hasFile = selectedFile !== null;
  const isParsed = hasFile && !isParsing && parsedData.length > 0;
  const canContinue =
    isParsed &&
    !error &&
    !fileError &&
    !mediaZipError &&
    !isMediaZipParsing &&
    (datasetMode !== "new" || datasetName.trim().length > 0) &&
    (datasetMode !== "existing" || selectedExistingDataset !== null);
  const hasUnavailableExistingSelection =
    datasetMode === "existing" &&
    !existingDatasetsQuery.isLoading &&
    !existingDatasetsQuery.error &&
    selectedExistingDatasetUri.length > 0 &&
    selectedExistingDataset === null;

  return (
    <div className="space-y-5">
      {/* Tree data guide accordion */}
      <TreeDataGuide />

      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold">Upload Your File</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Drop a CSV or TSV file to get started. KoboToolbox photo attachments
          can be added with the optional Media Attachments ZIP below.
        </p>
      </div>

      {/* Drop zone */}
      <Card
        className={`cursor-pointer transition-colors ${
          isDragging
            ? "border-primary bg-primary/5"
            : "border-dashed hover:border-primary/60 hover:bg-muted/30"
        }`}
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <CardContent className="flex flex-col items-center justify-center gap-3 py-10">
          {isParsing ? (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span className="text-sm">Parsing file…</span>
            </div>
          ) : hasFile && isParsed ? (
            <div className="flex flex-col items-center gap-2">
              <FileSpreadsheet className="h-10 w-10 text-primary" />
              <span className="text-sm font-medium text-foreground">
                {selectedFile.name}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatBytes(selectedFile.size)}
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Upload className="h-10 w-10" />
              <span className="text-sm font-medium">
                Drag &amp; drop or click to select
              </span>
              <span className="text-xs">Accepts .csv and .tsv files</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.tsv,text/csv,text/tab-separated-values"
        className="hidden"
        onChange={handleInputChange}
      />

      {/* Optional Kobo media ZIP input */}
      <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-4">
        <div className="space-y-1">
          <h3 className="text-sm font-medium">KoboToolbox photos ZIP</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Optional, but recommended for Kobo exports with photo questions. Add
            the matching <span className="font-medium">Media Attachments (ZIP)</span>{" "}
            export so Whole Tree, Leaf, and Bark photos can be uploaded to your
            PDS even when Kobo photo URLs are private.
          </p>
        </div>

        <Card
          className="cursor-pointer border-dashed bg-background transition-colors hover:border-primary/60 hover:bg-muted/30"
          onClick={() => mediaZipInputRef.current?.click()}
        >
          <CardContent className="flex items-center justify-between gap-3 py-4">
            {isMediaZipParsing ? (
              <div className="flex items-center gap-3 text-muted-foreground">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <span className="text-sm">Reading media ZIP…</span>
              </div>
            ) : selectedMediaZipFile && mediaZipIndex ? (
              <div className="flex min-w-0 items-center gap-3">
                <Archive className="h-5 w-5 shrink-0 text-primary" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {selectedMediaZipFile.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {mediaZipIndex.entries.length.toLocaleString()} image
                    {mediaZipIndex.entries.length === 1 ? "" : "s"} across{" "}
                    {mediaZipIndex.submissionCount.toLocaleString()} submission
                    {mediaZipIndex.submissionCount === 1 ? "" : "s"}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 text-muted-foreground">
                <Archive className="h-5 w-5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">Click to select ZIP</p>
                  <p className="text-xs">Accepts .zip files up to 200 MB</p>
                </div>
              </div>
            )}

            {selectedMediaZipFile || mediaZipError ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={(event) => {
                  event.stopPropagation();
                  handleRemoveMediaZip();
                }}
              >
                <X />
                {selectedMediaZipFile ? "Remove" : "Clear"}
              </Button>
            ) : null}
          </CardContent>
        </Card>

        <input
          ref={mediaZipInputRef}
          type="file"
          accept=".zip,application/zip,application/x-zip-compressed"
          className="hidden"
          onChange={handleMediaZipInputChange}
        />

        {mediaZipError ? (
          <p className="text-sm text-destructive">{mediaZipError}</p>
        ) : null}
      </div>

      {/* File error */}
      {fileError && (
        <p className="text-sm text-destructive">{fileError}</p>
      )}

      {/* Parse error */}
      {error && (
        <p className="text-sm text-destructive">Parse error: {error}</p>
      )}

      {/* File info card */}
      {isParsed && !error && !fileError && (
        <div className="rounded-md border border-border bg-muted/30 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm font-medium truncate">{selectedFile?.name}</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
            <div>
              <span className="block font-medium text-foreground">{rowCount.toLocaleString()}</span>
              <span>rows</span>
            </div>
            <div>
              <span className="block font-medium text-foreground">{headers.length}</span>
              <span>columns</span>
            </div>
            <div>
              <span className="block font-medium text-foreground">
                {detectedFormat?.isKobo ? "Auto-mapped CSV" : "Generic CSV"}
              </span>
              <span>format</span>
            </div>
          </div>
        </div>
      )}

      {/* Dataset selection */}
      <div className="space-y-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Where should this upload go?</label>
          <p className="text-xs text-muted-foreground">
            Leave the trees ungrouped, create a brand-new dataset, or append this
            upload to one you already manage.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {DATASET_MODE_OPTIONS.map((option) => {
            const isSelected = datasetMode === option.mode;
            return (
              <button
                key={option.mode}
                type="button"
                onClick={() => setDatasetMode(option.mode)}
                className={cn(
                  "rounded-xl border p-4 text-left transition-colors",
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-border bg-background hover:bg-muted/30",
                )}
              >
                <p className="text-sm font-medium text-foreground">{option.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {option.description}
                </p>
              </button>
            );
          })}
        </div>

        {datasetMode === "new" ? (
          <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
            <div className="space-y-1.5">
              <label htmlFor="dataset-name" className="text-sm font-medium">
                Dataset name{" "}
                <span className="text-muted-foreground font-normal">(recommended)</span>
              </label>
              <Input
                id="dataset-name"
                value={datasetName}
                onChange={(e) => setDatasetName(e.target.value)}
                placeholder="e.g. March 2025 Danum Valley Survey"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="dataset-description" className="text-sm font-medium">
                Description <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <Textarea
                id="dataset-description"
                value={datasetDescription}
                onChange={(e) => setDatasetDescription(e.target.value)}
                placeholder="Describe the dataset contents, methodology, or purpose..."
                rows={2}
              />
            </div>
          </div>
        ) : null}

        {datasetMode === "existing" ? (
          <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Choose a dataset</label>
              <p className="text-xs text-muted-foreground">
                New trees will be added to the selected dataset and appear alongside
                its existing records in Tree Manager.
              </p>
            </div>

            {existingDatasetsQuery.isLoading ? (
              <div
                className="space-y-4 rounded-lg border border-border bg-background/80 p-4"
                role="status"
                aria-live="polite"
                aria-label="Loading your datasets"
              >
                <div className="flex items-center gap-3">
                  <div className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">
                      Loading your datasets…
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Finding datasets you can append this upload to.
                    </p>
                  </div>
                </div>
                <div className="space-y-2" aria-hidden="true">
                  <Skeleton className="h-10 w-full rounded-md" />
                  <Skeleton className="h-16 w-full rounded-lg" />
                </div>
              </div>
            ) : existingDatasetsQuery.error ? (
              <p className="text-sm text-destructive">
                Couldn&apos;t load your existing datasets right now. You can still
                create a new dataset or continue without one.
              </p>
            ) : existingDatasets.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                You do not have any datasets yet. Create a new one for this upload
                or continue without grouping.
              </p>
            ) : (
              <>
                <Select
                  value={selectedExistingDatasetUri}
                  onValueChange={setSelectedExistingDatasetUri}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a dataset" />
                  </SelectTrigger>
                  <SelectContent>
                    {existingDatasets.map((dataset) => {
                      const count = dataset.recordCount ?? 0;
                      const createdAt = formatDatasetDate(dataset.createdAt);

                      return (
                        <SelectItem key={dataset.uri} value={dataset.uri}>
                          {`${dataset.name} (${count} tree${count === 1 ? "" : "s"} - ${createdAt})`}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>

                {selectedExistingDataset ? (
                  <div className="rounded-lg border border-border bg-background p-4 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium text-foreground">
                        {selectedExistingDataset.name}
                      </p>
                      <span className="text-muted-foreground">
                        {selectedExistingDataset.recordCount ?? 0} tree
                        {(selectedExistingDataset.recordCount ?? 0) === 1 ? "" : "s"}
                      </span>
                    </div>
                    {selectedExistingDataset.description ? (
                      <p className="mt-2 text-muted-foreground">
                        {selectedExistingDataset.description}
                      </p>
                    ) : (
                      <p className="mt-2 text-muted-foreground">
                        No description added yet.
                      </p>
                    )}
                  </div>
                ) : null}

                {hasUnavailableExistingSelection ? (
                  <p className="text-sm text-destructive">
                    The previously selected dataset is no longer available. Pick a
                    different dataset before continuing.
                  </p>
                ) : null}
              </>
            )}
          </div>
        ) : null}
      </div>

      {/* Establishment means guidance */}
      <div className="space-y-3">
        <div className="space-y-1">
          <label className="text-sm font-medium">
            How were these trees established?{" "}
            <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Uses GBIF standards. Your data will be published on the GBIF
            platform.
          </p>
        </div>
        <div className="overflow-hidden rounded-xl border border-border">
          {PARTNER_ESTABLISHMENT_MEANS_OPTIONS.map((option) => {
            const isSelected = establishmentMeans === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() =>
                  setEstablishmentMeans(isSelected ? null : option.value)
                }
                className={cn(
                  "flex w-full items-start gap-3 border-b border-border px-4 py-3 text-left transition-colors last:border-b-0",
                  isSelected
                    ? "bg-green-500/10"
                    : "bg-background hover:bg-muted/30"
                )}
              >
                <span
                  className={cn(
                    "mt-1 flex size-4 shrink-0 rounded-full border transition-colors",
                    isSelected
                      ? "border-green-700 bg-green-700 dark:border-green-500 dark:bg-green-500"
                      : "border-muted-foreground/40 bg-background"
                  )}
                />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-base font-medium text-foreground">
                      {option.label}
                    </span>
                    <Badge
                      variant="success"
                      className="px-1.5 py-0.5 font-mono text-[10px] lowercase"
                    >
                      {option.gbifCodeLabel}
                    </Badge>
                  </span>
                  <span className="mt-1 block text-sm leading-relaxed text-foreground">
                    {option.description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* GBIF disclaimer */}
      <p className="text-xs text-muted-foreground leading-relaxed">
        By uploading, you agree that your tree data will be published publicly on{" "}
        <a
          href={links.external.gbifPublisher}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-foreground transition-colors"
        >
          GBIF
        </a>{" "}
        (Global Biodiversity Information Facility) and GainForest&apos;s Green
        Globe. You remain the data owner. GainForest is the{" "}
        <a
          href={links.external.gbifPublisher}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-foreground transition-colors"
        >
          publisher
        </a>
        .
      </p>

      {/* Footer */}
      <div className="flex items-center justify-end pt-2 border-t border-border">
        <Button onClick={handleContinue} disabled={!canContinue}>
          Continue to Column Mapping
        </Button>
      </div>
    </div>
  );
}
