import type { Main } from "@gainforest/generated/app/gainforest/dwc/dataset.defs";

export type DwcDatasetRecord = Main;

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
