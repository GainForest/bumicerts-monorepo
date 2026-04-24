import {
  APPEND_EXISTING_DWC_DATASET_MAX_ROWS,
  type AppendExistingDwcDatasetInput,
  type AppendExistingDwcDatasetResult,
  type AppendExistingDwcDatasetRowInput,
  type AppendExistingDwcDatasetRowResult,
} from "@gainforest/atproto-mutations-next";
import { occurrenceInputToCreateInput } from "@/lib/upload/occurrence-adapter";
import type { ValidatedRow } from "@/lib/upload/types";

export { APPEND_EXISTING_DWC_DATASET_MAX_ROWS };
export const APPEND_EXISTING_DWC_DATASET_CLIENT_ROWS = 1;

export type AppendExistingDatasetRequest = AppendExistingDwcDatasetInput;
export type AppendExistingDatasetResponse = AppendExistingDwcDatasetResult;
export type AppendExistingDatasetRowInput = AppendExistingDwcDatasetRowInput;
export type AppendExistingDatasetRowResult = AppendExistingDwcDatasetRowResult;

export function toAppendExistingDatasetRows(
  validRows: ValidatedRow[],
): AppendExistingDatasetRowInput[] {
  return validRows.map((row) => ({
    occurrence: occurrenceInputToCreateInput(row.occurrence),
    floraMeasurement: row.floraMeasurement
      ? {
          dbh: row.floraMeasurement.dbh,
          totalHeight: row.floraMeasurement.totalHeight,
          diameter: row.floraMeasurement.diameter,
          canopyCoverPercent: row.floraMeasurement.canopyCoverPercent,
        }
      : null,
  }));
}
