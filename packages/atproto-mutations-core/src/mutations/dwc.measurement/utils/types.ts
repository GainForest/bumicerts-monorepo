import type {
  Main as DwcMeasurementRecord,
} from "@gainforest/generated/app/gainforest/dwc/measurement.defs";
import type {
  DeleteRecordInput,
  DeleteRecordResult,
  RecordMutationResult,
} from "../../../utils/shared/types";

export type { DwcMeasurementRecord };

/** Returned by createDwcMeasurement. */
export type DwcMeasurementMutationResult = RecordMutationResult<DwcMeasurementRecord>;

// ---------------------------------------------------------------------------
// Flora measurement fields
// ---------------------------------------------------------------------------

export type FloraMeasurementFields = {
  dbh?: string;
  totalHeight?: string;
  basalDiameter?: string;
  canopyCoverPercent?: string;
};

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

export type CreateDwcMeasurementInput = {
  /** AT-URI to the parent occurrence record (required). */
  occurrenceRef: string;
  /** Flora measurement fields (sessile organisms: trees, plants, etc.). */
  flora: FloraMeasurementFields;
  /** The occurrenceID of the linked occurrence record (for cross-system interop). */
  occurrenceID?: string;
  /** Person(s) who performed the measurements. Pipe-delimited for multiple. */
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

// ---------------------------------------------------------------------------
// Update / Delete
// ---------------------------------------------------------------------------

export type UpdateDwcMeasurementData = {
  occurrenceRef?: string;
  occurrenceID?: string;
  measuredBy?: string;
  measuredByID?: string;
  measurementDate?: string;
  measurementMethod?: string;
  measurementRemarks?: string;
  result?: DwcMeasurementRecord["result"];
  flora?: FloraMeasurementFields;
};

export type UpdateDwcMeasurementInput = {
  rkey: string;
  data: UpdateDwcMeasurementData;
  unset?: ReadonlyArray<
    | "occurrenceID"
    | "measuredBy"
    | "measuredByID"
    | "measurementDate"
    | "measurementMethod"
    | "measurementRemarks"
  >;
};

export type { DeleteRecordInput, DeleteRecordResult };
