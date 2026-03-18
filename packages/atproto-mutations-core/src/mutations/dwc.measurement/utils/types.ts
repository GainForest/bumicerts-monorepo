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

export type CreateDwcMeasurementInput = {
  /** AT-URI to the parent occurrence record (required). */
  occurrenceRef: string;
  /** The nature of the measurement (e.g. 'DBH', 'tree height', 'canopy cover'). */
  measurementType: string;
  /** The value of the measurement (e.g. '45.2', '12.5'). */
  measurementValue: string;
  /** The units for the measurementValue (e.g. 'cm', 'm', '%'). */
  measurementUnit?: string;
  /** An identifier for the measurement. Should be unique within the dataset. */
  measurementID?: string;
  /** The occurrenceID of the linked occurrence record (for cross-system interop). */
  occurrenceID?: string;
  /** The description of the potential error associated with the measurementValue. */
  measurementAccuracy?: string;
  /** The description of or reference to the method used to determine the measurement. */
  measurementMethod?: string;
  /** Person(s) who determined the measurement. Pipe-delimited for multiple. */
  measurementDeterminedBy?: string;
  /** The date the measurement was made. ISO 8601 format. */
  measurementDeterminedDate?: string;
  /** Comments or notes accompanying the measurement. */
  measurementRemarks?: string;
  /** Optional caller-supplied rkey. PDS assigns a TID if omitted. */
  rkey?: string;
};
