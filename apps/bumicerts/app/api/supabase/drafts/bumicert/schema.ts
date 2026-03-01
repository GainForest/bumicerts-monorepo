import z from "zod";

export const getDraftBumicertRequestSchema = z.object({
  draftIds: z
    .array(
      z.number("Draft ID must be a number"),
      "Draft IDs must be an array of numbers"
    )
    .min(1, "Draft IDs must be an array of numbers")
    .optional(),
  orderBy: z
    .enum(
      ["created_at", "updated_at"],
      "Order by must be either 'created_at' or 'updated_at'"
    )
    .optional()
    .default("updated_at"),
  orderDirection: z
    .enum(["asc", "desc"], "Order direction must be either 'asc' or 'desc'")
    .optional()
    .default("desc"),
});

export const draftBumicertDataSchemaV0 = z.object({
  title: z.string("Title must be a string").optional(),
  startDate: z.string("Start date must be a string").optional(),
  endDate: z.string("End date must be a string").optional(),
  workScopes: z
    .array(z.string("Work scopes must be an array of strings"))
    .optional(),
  coverImage: z.string("Cover image must be a string").optional(),
  description: z.string("Impact story must be a string").optional(),
  shortDescription: z.string("Short description must be a string").optional(),
  contributors: z
    .array(z.string("Contributors must be an array of strings"))
    .optional(),
  siteBoundaries: z
    .array(
      z.object({
        uri: z.string("URI must be a string"),
        cid: z.string("CID must be a string"),
      })
    )
    .optional(),
});

export const createDraftBumicertRequestSchema = z.object({
  id: z.number("Draft ID must be a number").optional(),
  data: draftBumicertDataSchemaV0,
  version: z.number("Version must be a number").optional().default(0),
});

export const updateDraftBumicertRequestSchema = z.object({
  id: z.number("Draft ID must be a number"),
  data: draftBumicertDataSchemaV0,
});

export const deleteDraftBumicertRequestSchema = z.object({
  draftIds: z
    .array(
      z.number("Draft ID must be a number"),
      "Draft IDs must be an array of numbers"
    )
    .min(1, "At least one draft ID is required"),
});
