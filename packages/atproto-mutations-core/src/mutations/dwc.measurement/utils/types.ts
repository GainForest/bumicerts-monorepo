import type {
  Main as DwcMeasurementRecord,
} from "@gainforest/generated/app/gainforest/dwc/measurement.defs";
import type { RecordMutationResult } from "../../../utils/shared/types";

export type { DwcMeasurementRecord };

/** Returned by createDwcMeasurement. */
export type DwcMeasurementMutationResult = RecordMutationResult<DwcMeasurementRecord>;

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

/**
 * Flora-specific measurement fields.
 * All numeric values are stored as strings per the DwC lexicon.
 */
export type FloraMeasurementFields = {
  /** Diameter at breast height in centimeters. */
  dbh?: string;
  /** Total height from ground to highest living point in meters. */
  totalHeight?: string;
  /** Diameter at ground level in centimeters. */
  basalDiameter?: string;
  /** Percentage of ground covered by the canopy of this individual. */
  canopyCoverPercent?: string;
};

export type CreateDwcMeasurementInput = {
  /** AT-URI to the parent occurrence record (required). */
  occurrenceRef: string;
  /** The occurrenceID of the linked occurrence record (for cross-system interop). */
  occurrenceID?: string;
  /** Flora measurement fields. */
  flora: FloraMeasurementFields;
  /** Person(s) who performed the measurements. */
  measuredBy?: string;
  /** Date the measurements were taken. ISO 8601 format. */
  measurementDate?: string;
  /** General protocol or method used. */
  measurementMethod?: string;
  /** Comments or notes about the measurement session. */
  measurementRemarks?: string;
  /** Optional caller-supplied rkey. PDS assigns a TID if omitted. */
  rkey?: string;
};
