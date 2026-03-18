"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, XCircle, AlertTriangle, ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/client";
import type { ValidatedRow } from "@/lib/upload/types";
import { occurrenceInputToCreateInput } from "@/lib/upload/occurrence-adapter";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type RowStatus =
  | { state: "pending" }
  | { state: "uploading" }
  | { state: "success"; occurrenceUri: string }
  | { state: "error"; error: string };

type UploadProgress = {
  current: number;
  total: number;
  successes: number;
  failures: number;
  currentRow: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

export const STORAGE_KEY = "upload-trees-pending";
const SESSION_TTL_MS = 10 * 60 * 1000; // 10 minutes

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

type UploadStepProps = {
  validRows: ValidatedRow[];
  onBack: () => void;
  onComplete: () => void;
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function UploadStep({ validRows, onBack, onComplete }: UploadStepProps) {
  const createOccurrence = trpc.dwc.occurrence.create.useMutation();
  const createMeasurement = trpc.dwc.measurement.create.useMutation();

  const [uploadStarted, setUploadStarted] = useState(false);
  const [uploadDone, setUploadDone] = useState(false);
  const [progress, setProgress] = useState<UploadProgress>({
    current: 0,
    total: validRows.length,
    successes: 0,
    failures: 0,
    currentRow: "",
  });
  const [rowStatuses, setRowStatuses] = useState<RowStatus[]>(
    validRows.map(() => ({ state: "pending" as const }))
  );
  const [failedRowsOpen, setFailedRowsOpen] = useState(false);

  // Prevent double-run in StrictMode
  const uploadRef = useRef(false);

  // ── sessionStorage: save pending state before OAuth redirect ──────────────
  useEffect(() => {
    if (validRows.length > 0 && !uploadStarted) {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ validRows, timestamp: Date.now() })
      );
    }
  }, [validRows, uploadStarted]);

  // ── Upload logic ──────────────────────────────────────────────────────────
  const runUpload = useCallback(async () => {
    if (uploadRef.current) return;
    uploadRef.current = true;
    setUploadStarted(true);

    // Clear sessionStorage once upload begins (state is no longer "pending")
    sessionStorage.removeItem(STORAGE_KEY);

    let successes = 0;
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
        const occInput = occurrenceInputToCreateInput(row.occurrence);
        const occResult = await createOccurrence.mutateAsync(occInput);

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

        successes += 1;
        setRowStatuses((prev) => {
          const next = [...prev];
          next[i] = { state: "success", occurrenceUri: occResult.uri };
          return next;
        });
      } catch (err) {
        failures += 1;
        setRowStatuses((prev) => {
          const next = [...prev];
          next[i] = { state: "error", error: String(err) };
          return next;
        });
      }

      setProgress((prev) => ({
        ...prev,
        successes,
        failures,
      }));
    }

    setUploadDone(true);
  }, [validRows, createOccurrence, createMeasurement]);

  // Auto-start upload on mount (layout already enforces auth)
  useEffect(() => {
    if (!uploadStarted) {
      void runUpload();
    }
  }, [uploadStarted, runUpload]);

  // ── Derived values ────────────────────────────────────────────────────────
  const { current, total, successes, failures, currentRow } = progress;
  const progressPercent = total > 0 ? Math.round((current / total) * 100) : 0;
  const allSucceeded = uploadDone && failures === 0;
  const someFailed = uploadDone && failures > 0;

  const failedRows = rowStatuses
    .map((status, i) => ({ status, row: validRows[i], index: i }))
    .filter((r) => r.status.state === "error");

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold">Upload to PDS</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Uploading {total} tree record{total !== 1 ? "s" : ""} to the ATProto PDS.
        </p>
      </div>

      {/* Progress bar */}
      {!uploadDone && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {uploadStarted
                ? `Uploading row ${current} of ${total}${currentRow ? ` — ${currentRow}` : ""}…`
                : "Preparing upload…"}
            </span>
            <span className="text-muted-foreground font-mono">{progressPercent}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {successes} succeeded, {failures} failed
          </p>
        </div>
      )}

      {/* Completion banner — all succeeded */}
      {uploadDone && allSucceeded && (
        <div className="flex items-center gap-2 rounded-md border border-green-500/40 bg-green-500/10 p-3 text-sm text-green-600 dark:text-green-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>
            Successfully uploaded {successes} tree record{successes !== 1 ? "s" : ""}.
          </span>
        </div>
      )}

      {/* Completion banner — some failed */}
      {uploadDone && someFailed && (
        <div className="flex items-center gap-2 rounded-md border border-yellow-500/40 bg-yellow-500/10 p-3 text-sm text-yellow-600 dark:text-yellow-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            {successes} record{successes !== 1 ? "s" : ""} uploaded, {failures} failed.
          </span>
        </div>
      )}

      {/* Per-row status list */}
      <div className="rounded-lg border overflow-hidden">
        <div className="max-h-64 overflow-y-auto divide-y divide-border">
          {validRows.map((row, i) => {
            const status = rowStatuses[i];
            const species = row.occurrence.scientificName || `Row ${i + 1}`;
            return (
              <div
                key={i}
                className="flex items-center gap-3 px-3 py-2 text-sm"
              >
                <span className="font-mono text-xs text-muted-foreground w-6 shrink-0">
                  {i + 1}
                </span>
                <span className="flex-1 truncate">{species}</span>
                <span className="shrink-0">
                  {status?.state === "pending" && (
                    <span className="text-xs text-muted-foreground">Pending</span>
                  )}
                  {status?.state === "uploading" && (
                    <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
                  )}
                  {status?.state === "success" && (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  )}
                  {status?.state === "error" && (
                    <XCircle className="h-4 w-4 text-destructive" />
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Failed rows detail (collapsible) */}
      {failedRows.length > 0 && (
        <div className="rounded-lg border border-destructive/30 overflow-hidden">
          <button
            type="button"
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-left hover:bg-muted/30 transition-colors"
            onClick={() => setFailedRowsOpen((v) => !v)}
          >
            <span className="flex items-center gap-2 text-destructive">
              <XCircle className="h-4 w-4 shrink-0" />
              {failures} row{failures !== 1 ? "s" : ""} failed
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
                {failedRows.map(({ status, row, index }) => (
                  <li
                    key={index}
                    className="text-xs border border-destructive/20 rounded-md p-2 space-y-0.5"
                  >
                    <p className="font-medium text-foreground">
                      Row {index + 1} — {row?.occurrence.scientificName ?? "(no species)"}
                    </p>
                    <p className="text-destructive">
                      {status.state === "error" ? status.error : "Unknown error"}
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
          disabled={uploadStarted && !uploadDone}
        >
          Back to Preview
        </Button>

        {uploadDone && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={onComplete}>
              Upload More Data
            </Button>
            <Button onClick={onComplete}>
              Done
            </Button>
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
  validRows: ValidatedRow[];
  timestamp: number;
};

/**
 * Reads pending upload data from sessionStorage.
 * Returns the data if it exists and is less than 10 minutes old, otherwise null.
 */
export function readPendingUpload(): PendingUploadData | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingUploadData;
    if (Date.now() - parsed.timestamp > SESSION_TTL_MS) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
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
