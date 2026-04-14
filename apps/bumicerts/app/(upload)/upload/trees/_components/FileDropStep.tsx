"use client";

import { useRef, useState, useCallback } from "react";
import { Upload, FileSpreadsheet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCsvParser } from "@/lib/upload/use-csv-parser";
import { PARTNER_ESTABLISHMENT_MEANS_OPTIONS } from "@/lib/upload/establishment-means";
import { detectKoboFormat } from "@/lib/upload/kobo-mapper";
import { autoDetectMappings } from "@/lib/upload/column-mapper";
import { links } from "@/lib/links";
import { cn } from "@/lib/utils";
import type { ColumnMapping } from "@/lib/upload/types";
import TreeDataGuide from "./TreeDataGuide";

type FileDropStepProps = {
  onFileAndMappings: (
    file: File,
    parsedData: Record<string, string>[],
    headers: string[],
    mappings: ColumnMapping[],
    establishmentMeans: string | null,
    datasetName: string,
    datasetDescription: string,
  ) => void;
};

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const ACCEPTED_EXTENSIONS = [".csv", ".tsv"];
const ACCEPTED_MIME_TYPES = ["text/csv", "text/tab-separated-values", "application/csv"];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isAcceptedFile(file: File): boolean {
  const name = file.name.toLowerCase();
  const hasValidExtension = ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext));
  const hasValidMime = ACCEPTED_MIME_TYPES.includes(file.type) || file.type === "";
  return hasValidExtension || hasValidMime;
}

export default function FileDropStep({ onFileAndMappings }: FileDropStepProps) {
  const { parsedData, headers, rowCount, error, isParsing, parseFile, reset } =
    useCsvParser();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [establishmentMeans, setEstablishmentMeans] = useState<string | null>(null);
  const [datasetName, setDatasetName] = useState("");
  const [datasetDescription, setDatasetDescription] = useState("");

  const inputRef = useRef<HTMLInputElement>(null);

  const detectedFormat =
    headers.length > 0 ? detectKoboFormat(headers) : null;

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset input so the same file can be re-selected
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

    onFileAndMappings(
      selectedFile,
      parsedData,
      headers,
      mappings,
      establishmentMeans,
      datasetName.trim(),
      datasetDescription.trim(),
    );
  };

  const hasFile = selectedFile !== null;
  const isParsed = hasFile && !isParsing && parsedData.length > 0;
  const canContinue = isParsed && !error && !fileError;

  return (
    <div className="space-y-5">
      {/* Tree data guide accordion */}
      <TreeDataGuide />

      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold">Upload Your File</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Drop a CSV or TSV file to get started. Maximum file size: 10 MB.
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
                {detectedFormat?.isKobo ? "KoboToolbox" : "Generic CSV"}
              </span>
              <span>format</span>
            </div>
          </div>
        </div>
      )}

      {/* Dataset name + description (optional) */}
      <div className="space-y-3">
        <div className="space-y-1.5">
          <label htmlFor="dataset-name" className="text-sm font-medium">
            Dataset name{" "}
            <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <p className="text-xs text-muted-foreground">
            Give this upload a name so you can find and reference it later.
          </p>
          <Input
            id="dataset-name"
            value={datasetName}
            onChange={(e) => setDatasetName(e.target.value)}
            placeholder="e.g. March 2025 Danum Valley Survey"
          />
        </div>
        {datasetName.trim().length > 0 && (
          <div className="space-y-1.5">
            <label htmlFor="dataset-description" className="text-sm font-medium">
              Description{" "}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <Textarea
              id="dataset-description"
              value={datasetDescription}
              onChange={(e) => setDatasetDescription(e.target.value)}
              placeholder="Describe the dataset contents, methodology, or purpose..."
              rows={2}
            />
          </div>
        )}
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
