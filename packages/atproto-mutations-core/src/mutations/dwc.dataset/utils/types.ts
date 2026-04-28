import type { Main } from "@gainforest/generated/app/gainforest/dwc/dataset.defs";
import type { CreateDwcOccurrenceInput } from "../../dwc.occurrence/utils/types";

export type DwcDatasetRecord = Main;

export const APPEND_EXISTING_DWC_DATASET_MAX_ROWS = 10;
export const ATTACH_EXISTING_DWC_DATASET_MAX_OCCURRENCES = 25;

export type CreateDwcDatasetInput = {
  name: string;
  description?: string;
  recordCount?: number;
  establishmentMeans?: string;
  rkey?: string;
};

export type UpdateDwcDatasetInput = {
  rkey: string;
  data: Partial<Omit<CreateDwcDatasetInput, "rkey">>;
  unset?: readonly string[];
};

export type DwcDatasetMutationResult = {
  uri: string;
  cid: string;
  rkey: string;
  record: DwcDatasetRecord;
};

export type AppendExistingDwcDatasetOccurrenceInput = Omit<
  CreateDwcOccurrenceInput,
  "datasetRef" | "dynamicProperties" | "rkey"
>;

export type AppendExistingDwcDatasetFloraMeasurementInput = {
  dbh?: string;
  totalHeight?: string;
  diameter?: string;
  canopyCoverPercent?: string;
};

export type AppendExistingDwcDatasetRowInput = {
  occurrence: AppendExistingDwcDatasetOccurrenceInput;
  floraMeasurement: AppendExistingDwcDatasetFloraMeasurementInput | null;
};

export type AppendExistingDwcDatasetInput = {
  datasetRkey: string;
  rows: AppendExistingDwcDatasetRowInput[];
  establishmentMeans?: string | null;
};

export type AppendExistingDwcDatasetRowResult =
  | {
      index: number;
      state: "success";
      occurrenceUri: string;
      photoCount: number;
    }
  | {
      index: number;
      state: "partial";
      occurrenceUri: string;
      photoCount: number;
      error: string;
    }
  | {
      index: number;
      state: "error";
      error: string;
    };

export type AppendExistingDwcDatasetResult = {
  datasetUri: string;
  datasetRkey: string;
  datasetBecameUnavailable: boolean;
  results: AppendExistingDwcDatasetRowResult[];
};

export type AttachExistingDwcDatasetOccurrencesInput = {
  datasetRkey: string;
  occurrenceRkeys: string[];
};

export type AttachExistingDwcDatasetOccurrenceResult =
  | {
      index: number;
      rkey: string;
      state: "success";
      occurrenceUri: string;
    }
  | {
      index: number;
      rkey: string;
      state: "skipped";
      occurrenceUri?: string;
      error: string;
    }
  | {
      index: number;
      rkey: string;
      state: "error";
      occurrenceUri?: string;
      error: string;
    };

export type AttachExistingDwcDatasetOccurrencesResult = {
  datasetUri: string;
  datasetRkey: string;
  attachedCount: number;
  skippedCount: number;
  errorCount: number;
  datasetCountUpdated: boolean;
  datasetBecameUnavailable: boolean;
  datasetCountError?: string;
  results: AttachExistingDwcDatasetOccurrenceResult[];
};
