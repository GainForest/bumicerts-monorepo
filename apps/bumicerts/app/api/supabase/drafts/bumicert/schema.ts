import z from "zod";
import { LeafletLinearDocumentSchema } from "@gainforest/leaflet-react/schemas";
import type { app } from "@gainforest/generated";

// ── Shared facet schema ───────────────────────────────────────────────────────

const bskyFacetSchema = z.custom<app.bsky.richtext.facet.Main>(
  (val): val is app.bsky.richtext.facet.Main => {
    if (!val || typeof val !== "object") return false;
    const obj = val as Record<string, unknown>;
    return (
      typeof obj["index"] === "object" &&
      obj["index"] !== null &&
      Array.isArray(obj["features"])
    );
  }
);

// ── Request schemas ───────────────────────────────────────────────────────────

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

// ── V0: Legacy schema (plain text description, no shortDescriptionFacets) ────
// Kept for reading old drafts from Supabase that pre-date the Leaflet migration.

export const draftBumicertDataSchemaV0 = z.object({
  title: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  workScopes: z.array(z.string()).optional(),
  coverImage: z.string().optional(),
  /** @deprecated Plain text in V0. Use draftBumicertDataSchemaV1 for new drafts. */
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

// ── V1: Current schema (LinearDocument description, shortDescriptionFacets) ──

export const draftBumicertDataSchemaV1 = z.object({
  title: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  workScopes: z.array(z.string()).optional(),
  coverImage: z.string().optional(),
  /**
   * Full rich-text description as a Leaflet LinearDocument.
   * V1+ format — V0 drafts stored this as a plain string.
   */
  description: LeafletLinearDocumentSchema.optional(),
  shortDescription: z.string().optional(),
  /**
   * Bluesky richtext facets for shortDescription.
   * Not yet editable via the UI — reserved for future use.
   */
  shortDescriptionFacets: z.array(bskyFacetSchema).optional(),
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

// ── Union schema: accepts both V0 and V1 ─────────────────────────────────────
// Used when reading drafts from Supabase — handles legacy data gracefully.

export const draftBumicertDataSchema = z.union([
  draftBumicertDataSchemaV1,
  draftBumicertDataSchemaV0,
]);

// Current write schema is V1
export const createDraftBumicertRequestSchema = z.object({
  id: z.number({ invalid_type_error: "Draft ID must be a number" }).optional(),
  data: draftBumicertDataSchemaV1,
  version: z.number({ invalid_type_error: "Version must be a number" }).optional().default(1),
});

export const updateDraftBumicertRequestSchema = z.object({
  id: z.number({ invalid_type_error: "Draft ID must be a number" }),
  data: draftBumicertDataSchemaV1,
});

export const deleteDraftBumicertRequestSchema = z.object({
  draftIds: z
    .array(z.number({ invalid_type_error: "Draft ID must be a number" }))
    .min(1, "At least one draft ID is required"),
});
