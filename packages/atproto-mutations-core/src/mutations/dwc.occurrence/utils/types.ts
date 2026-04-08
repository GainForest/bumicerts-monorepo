import type { Main as DwcOccurrenceRecord } from "@gainforest/generated/app/gainforest/dwc/occurrence.defs";
import type {
  DeleteRecordInput,
  DeleteRecordResult,
  RecordMutationResult,
} from "../../../utils/shared/types";

export type { DwcOccurrenceRecord };

/** Returned by createDwcOccurrence. */
export type DwcOccurrenceMutationResult = RecordMutationResult<DwcOccurrenceRecord>;

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

export type CreateDwcOccurrenceInput = {
  scientificName: string;
  eventDate: string;
  decimalLatitude: string;
  decimalLongitude: string;
  basisOfRecord?: string;
  vernacularName?: string;
  recordedBy?: string;
  locality?: string;
  country?: string;
  countryCode?: string;
  occurrenceRemarks?: string;
  habitat?: string;
  samplingProtocol?: string;
  kingdom?: string;
  occurrenceID?: string;
  occurrenceStatus?: string;
  geodeticDatum?: string;
  license?: string;
  projectRef?: string;
  establishmentMeans?: string;
  datasetRef?: string;
  rkey?: string;
};

// ---------------------------------------------------------------------------
// Update / Delete
// ---------------------------------------------------------------------------

export type UpdateDwcOccurrenceData = Partial<Omit<CreateDwcOccurrenceInput, "rkey">>;

export type UpdateDwcOccurrenceInput = {
  rkey: string;
  data: UpdateDwcOccurrenceData;
  unset?: ReadonlyArray<keyof UpdateDwcOccurrenceData>;
};

export type { DeleteRecordInput, DeleteRecordResult };
