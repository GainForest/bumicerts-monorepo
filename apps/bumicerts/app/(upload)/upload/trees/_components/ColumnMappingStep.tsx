"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TARGET_FIELDS } from "@/lib/upload/types";
import type { ColumnMapping } from "@/lib/upload/types";
import { inferSubjectPartFromColumnName } from "@/lib/upload/column-mapper";
import { CheckCircle2, AlertTriangle } from "lucide-react";

/** Target fields that allow multiple source columns (no duplicate warning). */
const MULTI_MAP_TARGETS = new Set(["photoUrl"]);

type ColumnMappingStepProps = {
  headers: string[];
  mappings: ColumnMapping[];
  sampleData?: Record<string, string>[];
  onMappingsChange: (mappings: ColumnMapping[]) => void;
  onBack: () => void;
  onNext: () => void;
};

const REQUIRED_FIELDS = [
  "scientificName",
  "eventDate",
  "decimalLatitude",
  "decimalLongitude",
] as const;

/** Sentinel value used for the "Skip this column" Select option.
 *  Radix UI @radix-ui/react-select throws a runtime error when a
 *  SelectItem has an empty-string value, so we use this non-empty
 *  sentinel and treat it as "no mapping" in handleSelectChange.
 */
const SKIP_SENTINEL = "__skip__";

// Group TARGET_FIELDS by category
const OCCURRENCE_REQUIRED = TARGET_FIELDS.filter(
  (f) => f.category === "occurrence" && f.required
);
const OCCURRENCE_OPTIONAL = TARGET_FIELDS.filter(
  (f) => f.category === "occurrence" && !f.required
);
const MEASUREMENTS = TARGET_FIELDS.filter((f) => f.category === "measurement");
const MEDIA = TARGET_FIELDS.filter((f) => f.category === "media");

/** Return the first non-empty value for a given column across all rows */
function getSampleValue(
  sampleData: Record<string, string>[] | undefined,
  column: string
): string {
  if (!sampleData) return "";
  for (const row of sampleData) {
    const val = row[column];
    if (val !== undefined && val.trim() !== "") return val.trim();
  }
  return "";
}

/** Get the current target field mapped to a source column.
 *  Returns SKIP_SENTINEL when no mapping exists so the Radix Select
 *  never receives an empty-string value (which would throw at runtime).
 */
function getMappedTarget(
  mappings: ColumnMapping[],
  sourceColumn: string
): string {
  return (
    mappings.find((m) => m.sourceColumn === sourceColumn)?.targetField ??
    SKIP_SENTINEL
  );
}

export default function ColumnMappingStep({
  headers,
  mappings,
  sampleData,
  onMappingsChange,
  onNext,
  onBack,
}: ColumnMappingStepProps) {
  // Detect duplicate target mappings: target -> list of source columns
  const targetToSources = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const m of mappings) {
      if (!m.targetField) continue;
      if (!map[m.targetField]) map[m.targetField] = [];
      map[m.targetField].push(m.sourceColumn);
    }
    return map;
  }, [mappings]);

  // Which required fields are still unmapped?
  const mappedTargets = useMemo(
    () =>
      new Set(mappings.filter((m) => m.targetField).map((m) => m.targetField)),
    [mappings]
  );
  const missingRequired = REQUIRED_FIELDS.filter((f) => !mappedTargets.has(f));
  const allRequiredMapped = missingRequired.length === 0;

  // Detect which source columns have duplicate targets (only the second+ occurrence is a dupe)
  // Multi-map targets (e.g. photoUrl) are excluded — multiple columns are expected.
  const duplicateSourceColumns = useMemo(() => {
    const dupes = new Set<string>();
    for (const [target, sources] of Object.entries(targetToSources)) {
      if (sources.length > 1 && !MULTI_MAP_TARGETS.has(target)) {
        // Mark all but the first as duplicates
        for (let i = 1; i < sources.length; i++) {
          const src = sources[i];
          if (src !== undefined) {
            dupes.add(`${src}::${sources[0]}`);
          }
        }
      }
    }
    return dupes;
  }, [targetToSources]);

  const handleSelectChange = (sourceColumn: string, newTarget: string) => {
    const updated = mappings.filter((m) => m.sourceColumn !== sourceColumn);
    // Treat SKIP_SENTINEL as "no mapping" — don't push an entry for it.
    // Also remove transform when user manually changes mapping.
    if (newTarget !== SKIP_SENTINEL) {
      updated.push({ sourceColumn, targetField: newTarget });
    }
    onMappingsChange(updated);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold">Map Your Columns</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          {headers.length} column{headers.length !== 1 ? "s" : ""} found.
          Match each source column to a Darwin Core field.
        </p>
      </div>

      {/* Missing required fields warning */}
      {!allRequiredMapped && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive space-y-1">
          <p className="font-medium">Required fields not yet mapped:</p>
          <ul className="list-disc list-inside space-y-0.5">
            {missingRequired.map((field) => {
              const meta = TARGET_FIELDS.find((f) => f.field === field);
              return <li key={field}>{meta?.label ?? field}</li>;
            })}
          </ul>
        </div>
      )}

      {/* Column mapping table */}
      <div className="rounded-lg border overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[1fr_1fr_1fr] gap-0 bg-muted/50 px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
          <span>Source Column</span>
          <span>Sample Value</span>
          <span>Map To</span>
        </div>

        {/* Rows */}
        <div className="divide-y divide-border">
          {headers.map((header) => {
            const currentTarget = getMappedTarget(mappings, header);
            const sample = getSampleValue(sampleData, header);
            const isDuplicate =
              currentTarget !== SKIP_SENTINEL &&
              duplicateSourceColumns.has(`${header}::${currentTarget}`);
            const isMapped = currentTarget !== SKIP_SENTINEL;
            const targetMeta = TARGET_FIELDS.find(
              (f) => f.field === currentTarget
            );
            const isRequiredField = targetMeta?.required ?? false;

            return (
              <div
                key={header}
                className={`grid grid-cols-[1fr_1fr_1fr] gap-0 items-center px-4 py-3 ${
                  isDuplicate ? "bg-yellow-500/5" : ""
                }`}
              >
                {/* Source column name */}
                <div className="flex items-center gap-2 pr-3">
                  <span className="text-sm font-mono text-foreground truncate">
                    {header}
                  </span>
                  {isRequiredField && (
                    <span className="shrink-0 text-xs text-destructive font-medium">
                      *
                    </span>
                  )}
                </div>

                {/* Sample value */}
                <div className="pr-3">
                  {sample ? (
                    <span className="text-xs text-muted-foreground font-mono truncate block max-w-[180px]">
                      {sample}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground/50 italic">
                      (empty)
                    </span>
                  )}
                </div>

                {/* Target field dropdown + status */}
                <div className="flex items-center gap-2">
                  <Select
                    value={currentTarget}
                    onValueChange={(val) => handleSelectChange(header, val)}
                  >
                    <SelectTrigger className="h-8 text-xs flex-1">
                      <SelectValue placeholder="Skip this column" />
                    </SelectTrigger>
                    <SelectContent>
                      {/* Skip option — must use a non-empty sentinel; Radix throws on value="" */}
                      <SelectItem value={SKIP_SENTINEL}>
                        <span className="text-muted-foreground">
                          Skip this column
                        </span>
                      </SelectItem>

                      {/* Required Occurrence */}
                      <SelectGroup>
                        <SelectLabel>Required Occurrence</SelectLabel>
                        {OCCURRENCE_REQUIRED.map((f) => (
                          <SelectItem key={f.field} value={f.field}>
                            {f.label}{" "}
                            <span className="text-destructive ml-1">*</span>
                          </SelectItem>
                        ))}
                      </SelectGroup>

                      {/* Optional Occurrence */}
                      <SelectGroup>
                        <SelectLabel>Optional Occurrence</SelectLabel>
                        {OCCURRENCE_OPTIONAL.map((f) => (
                          <SelectItem key={f.field} value={f.field}>
                            {f.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>

                      {/* Measurements */}
                      <SelectGroup>
                        <SelectLabel>Measurements</SelectLabel>
                        {MEASUREMENTS.map((f) => (
                          <SelectItem key={f.field} value={f.field}>
                            {f.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>

                      {/* Media */}
                      <SelectGroup>
                        <SelectLabel>Media</SelectLabel>
                        {MEDIA.map((f) => (
                          <SelectItem key={f.field} value={f.field}>
                            {f.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>

                  {/* Photo subject part chip */}
                  {isMapped && currentTarget === "photoUrl" && (
                    <span className="text-[10px] text-muted-foreground bg-muted rounded-full px-2 py-0.5 shrink-0">
                      {inferSubjectPartFromColumnName(header)}
                    </span>
                  )}

                  {/* Status icon */}
                  {isDuplicate ? (
                    <AlertTriangle
                      className="h-4 w-4 shrink-0 text-yellow-500"
                      aria-label="Duplicate mapping — only the first source column will be used"
                    />
                  ) : isMapped ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
                  ) : (
                    <span className="text-xs text-muted-foreground/60 shrink-0 w-4 text-center">
                      —
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Duplicate warning banner */}
      {duplicateSourceColumns.size > 0 && (
        <div className="flex items-start gap-2 rounded-md border border-yellow-500/40 bg-yellow-500/10 p-3 text-sm text-yellow-600 dark:text-yellow-400">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>
            Multiple source columns are mapped to the same target field. Only
            the first mapping will be used; duplicates are highlighted.
            (Photo URL columns are an exception — multiple columns can map to
            Photo URL for multi-photo trees.)
          </span>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
          Mapped
        </span>
        <span className="flex items-center gap-1">
          <span className="text-muted-foreground/60">—</span>
          Skipped
        </span>
        <span className="flex items-center gap-1">
          <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />
          Duplicate
        </span>
        <span className="flex items-center gap-1">
          <span className="text-destructive font-medium">*</span>
          Required field
        </span>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onNext} disabled={!allRequiredMapped}>
          Continue to Preview
        </Button>
      </div>
    </div>
  );
}
