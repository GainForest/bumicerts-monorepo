import { z } from "zod";
import type {
  ColumnMapping,
  FloraMeasurementBundle,
  OccurrenceInput,
  PhotoEntry,
  RowError,
  ValidatedRow,
  ValidationResult,
} from "./types";
import { inferSubjectPartFromColumnName } from "./column-mapper";
import {
  resolveKoboMediaZipEntry,
  type KoboMediaZipIndex,
} from "./kobo-media-zip";

const DATE_PATTERNS = [
  /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
  /^\d{2}\/\d{2}\/\d{4}$/, // MM/DD/YYYY
  /^\d{2}\/\d{2}\/\d{4}$/, // DD/MM/YYYY (same regex, both accepted)
  /^\d{4}$/, // YYYY
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/, // ISO 8601 datetime
];

function isValidDate(value: string): boolean {
  return DATE_PATTERNS.some((pattern) => pattern.test(value));
}

export const OccurrenceRowSchema = z.object({
  scientificName: z.string().min(1, "Scientific name is required"),
  eventDate: z
    .string()
    .min(1, "Event date is required")
    .refine(isValidDate, {
      message:
        "Date must be in ISO 8601 or common format (YYYY-MM-DD, MM/DD/YYYY, DD/MM/YYYY, YYYY)",
    }),
  decimalLatitude: z.coerce.number().min(-90).max(90),
  decimalLongitude: z.coerce.number().min(-180).max(180),
  basisOfRecord: z.string().optional().default("HumanObservation"),
  vernacularName: z.string().optional(),
  recordedBy: z.string().optional(),
  locality: z.string().optional(),
  country: z.string().optional(),
  countryCode: z.string().optional(),
  occurrenceRemarks: z.string().optional(),
  habitat: z.string().optional(),
  samplingProtocol: z.string().optional(),
  kingdom: z.string().optional(),
});

const MeasurementFields = {
  height: z.coerce.number().positive().optional(),
  totalHeight: z.coerce.number().positive().optional(),
  dbh: z.coerce.number().positive().optional(),
  diameter: z.coerce.number().positive().optional(),
  canopyCoverPercent: z.coerce.number().min(0).max(100).optional(),
  canopyCover: z.coerce.number().min(0).max(100).optional(),
};

export const TreeRowSchema = OccurrenceRowSchema.merge(
  z.object(MeasurementFields)
);

type TreeRowOutput = z.output<typeof TreeRowSchema>;

function extractFloraMeasurement(row: TreeRowOutput): FloraMeasurementBundle | null {
  const bundle: FloraMeasurementBundle = {};

  const totalHeight = row.height ?? row.totalHeight;
  const canopyCoverPercent = row.canopyCoverPercent ?? row.canopyCover;

  if (totalHeight !== undefined) {
    bundle.totalHeight = String(totalHeight);
  }

  if (row.dbh !== undefined) {
    bundle.dbh = String(row.dbh);
  }

  if (row.diameter !== undefined) {
    bundle.diameter = String(row.diameter);
  }

  if (canopyCoverPercent !== undefined) {
    bundle.canopyCoverPercent = String(canopyCoverPercent);
  }

  const hasAnyField =
    bundle.totalHeight !== undefined ||
    bundle.dbh !== undefined ||
    bundle.diameter !== undefined ||
    bundle.canopyCoverPercent !== undefined;

  return hasAnyField ? bundle : null;
}

function extractOccurrence(row: TreeRowOutput): OccurrenceInput {
  return {
    scientificName: row.scientificName,
    eventDate: row.eventDate,
    decimalLatitude: row.decimalLatitude,
    decimalLongitude: row.decimalLongitude,
    basisOfRecord: row.basisOfRecord,
    vernacularName: row.vernacularName,
    recordedBy: row.recordedBy,
    locality: row.locality,
    country: row.country,
    countryCode: row.countryCode,
    occurrenceRemarks: row.occurrenceRemarks,
    habitat: row.habitat,
    samplingProtocol: row.samplingProtocol,
    kingdom: row.kingdom,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Multi-photo extraction
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Split a cell value that may contain multiple URLs separated by commas or
 * semicolons. Trims whitespace and drops empty segments.
 */
function splitPhotoUrls(value: string): string[] {
  return value
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function isLikelyUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim());
}

function getPhotoUrlFallback(
  rawRow: Record<string, string>,
  sourceColumn: string,
): string | null {
  const companionColumn = `${sourceColumn}_url`.toLowerCase();

  for (const [columnName, value] of Object.entries(rawRow)) {
    if (columnName.toLowerCase() !== companionColumn) {
      continue;
    }

    const fallbackValue = value.trim();
    if (fallbackValue && isLikelyUrl(fallbackValue)) {
      return fallbackValue;
    }
  }

  return null;
}

/**
 * Extract photo entries from a raw CSV row using the column mappings.
 * Supports:
 *   - Multiple columns mapped to `photoUrl` (each with subject part inferred from column name)
 *   - Comma/semicolon-separated URLs in a single cell (each URL becomes a separate entry)
 */
function extractPhotos(
  rawRow: Record<string, string>,
  photoMappings: { sourceColumn: string; subjectPart: string }[],
  koboMediaZipIndex: KoboMediaZipIndex | null,
): PhotoEntry[] {
  const photos: PhotoEntry[] = [];

  for (const { sourceColumn, subjectPart } of photoMappings) {
    const cellValue = rawRow[sourceColumn];
    if (!cellValue || cellValue.trim() === "") {
      continue;
    }

    const urls = splitPhotoUrls(cellValue);
    const fallbackUrl = getPhotoUrlFallback(rawRow, sourceColumn);
    let usedFallbackUrl = false;

    for (const value of urls) {
      if (koboMediaZipIndex) {
        const zipEntry = resolveKoboMediaZipEntry(
          koboMediaZipIndex,
          rawRow,
          value,
        );
        if (zipEntry) {
          photos.push({
            source: "koboZip",
            entryPath: zipEntry.entryPath,
            fileName: zipEntry.fileName,
            mimeType: zipEntry.mimeType,
            subjectPart,
          });
          continue;
        }
      }

      if (isLikelyUrl(value)) {
        photos.push({ source: "url", url: value, subjectPart });
        continue;
      }

      if (fallbackUrl && !usedFallbackUrl) {
        photos.push({ source: "url", url: fallbackUrl, subjectPart });
        usedFallbackUrl = true;
      }
    }
  }

  return photos;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main validation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parse, validate, and extract structured data from mapped CSV rows.
 *
 * @param rows - Mapped rows (target field names as keys)
 * @param rawRows - Original CSV rows (source column names as keys) — used for multi-photo extraction
 * @param mappings - Column mappings (used to identify which source columns are photo URLs)
 */
export function parseAndValidateRows(
  rows: Record<string, string>[],
  rawRows?: Record<string, string>[],
  mappings?: ColumnMapping[],
  options?: { koboMediaZipIndex?: KoboMediaZipIndex | null },
): ValidationResult {
  const valid: ValidatedRow[] = [];
  const errors: RowError[] = [];

  // Pre-compute photo column → subject part mapping
  const photoMappings = (mappings ?? [])
    .filter((m) => m.targetField === "photoUrl")
    .map((m) => ({
      sourceColumn: m.sourceColumn,
      subjectPart: inferSubjectPartFromColumnName(m.sourceColumn),
    }));

  for (let index = 0; index < rows.length; index++) {
    const row = rows[index] as unknown;
    const result = TreeRowSchema.safeParse(row);

    if (result.success) {
      const occurrence = extractOccurrence(result.data);
      const floraMeasurement = extractFloraMeasurement(result.data);
      const validatedRow: ValidatedRow = { index, occurrence, floraMeasurement };

      // Extract photos from the original (unmapped) row using source column names
      if (rawRows && photoMappings.length > 0) {
        const rawRow = rawRows[index];
        if (rawRow) {
          const photos = extractPhotos(
            rawRow,
            photoMappings,
            options?.koboMediaZipIndex ?? null,
          );
          if (photos.length > 0) {
            validatedRow.photos = photos;
          }
        }
      }

      valid.push(validatedRow);
    } else {
      const issues = result.error.issues.map((issue) => ({
        path: issue.path.join(".") || "root",
        message: issue.message,
      }));
      errors.push({ index, issues });
    }
  }

  return { valid, errors };
}
