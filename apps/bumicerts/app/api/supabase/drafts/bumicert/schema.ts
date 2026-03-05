import z from "zod";

export const getDraftBumicertRequestSchema = z.object({
  draftIds: z
    .array(z.number({ invalid_type_error: "Draft ID must be a number" }))
    .min(1, "Draft IDs must be an array of numbers")
    .optional(),
  orderBy: z
    .enum(["created_at", "updated_at"])
    .optional()
    .default("updated_at"),
  orderDirection: z
    .enum(["asc", "desc"])
    .optional()
    .default("desc"),
});

export const draftBumicertDataSchemaV0 = z.object({
  title: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  workScopes: z.array(z.string()).optional(),
  coverImage: z.string().optional(),
  description: z.string().optional(),
  shortDescription: z.string().optional(),
  contributors: z.array(z.string()).optional(),
  siteBoundaries: z
    .array(
      z.object({
        uri: z.string(),
        cid: z.string(),
      })
    )
    .optional(),
});

export const createDraftBumicertRequestSchema = z.object({
  id: z.number({ invalid_type_error: "Draft ID must be a number" }).optional(),
  data: draftBumicertDataSchemaV0,
  version: z.number({ invalid_type_error: "Version must be a number" }).optional().default(0),
});

export const updateDraftBumicertRequestSchema = z.object({
  id: z.number({ invalid_type_error: "Draft ID must be a number" }),
  data: draftBumicertDataSchemaV0,
});

export const deleteDraftBumicertRequestSchema = z.object({
  draftIds: z
    .array(z.number({ invalid_type_error: "Draft ID must be a number" }))
    .min(1, "At least one draft ID is required"),
});
