import z from "zod";
import { Tables } from "../../types";
import {
  draftBumicertDataSchemaV0,
  draftBumicertDataSchemaV1,
  draftBumicertDataSchema,
  getDraftBumicertRequestSchema,
  createDraftBumicertRequestSchema,
  updateDraftBumicertRequestSchema,
  deleteDraftBumicertRequestSchema,
} from "./schema";

/** @deprecated Legacy draft data shape with plain-text description. */
export type DraftBumicertDataV0 = z.infer<typeof draftBumicertDataSchemaV0>;

/** Current draft data shape with LinearDocument description. */
export type DraftBumicertDataV1 = z.infer<typeof draftBumicertDataSchemaV1>;

/** Union of all known draft data shapes — used when reading from Supabase. */
export type DraftBumicertData = z.infer<typeof draftBumicertDataSchema>;

export type GetDraftBumicertRequest = z.infer<
  typeof getDraftBumicertRequestSchema
>;

export type CreateDraftBumicertRequest = z.infer<
  typeof createDraftBumicertRequestSchema
>;

export type UpdateDraftBumicertRequest = z.infer<
  typeof updateDraftBumicertRequestSchema
>;

export type DeleteDraftBumicertRequest = z.infer<
  typeof deleteDraftBumicertRequestSchema
>;

export type DraftBumicertResponse = Tables<"drafts_bumicert"> & {
  data: DraftBumicertData;
};

export type GetDraftBumicertResponse = {
  drafts: DraftBumicertResponse[];
  success: boolean;
};
