// Import from generated types — used both locally and re-exported for callers.
import type { Main as OrganizationInfoRecord } from "@gainforest/generated/app/gainforest/organization/info.defs";
import type { Richtext } from "@gainforest/generated/app/gainforest/common/defs.defs";
import type { Main as LinearDocument } from "@gainforest/generated/pub/leaflet/pages/linearDocument.defs";
import type { SmallImage } from "@gainforest/generated/org/hypercerts/defs.defs";

// Re-export the generated record type as the canonical shape for this entity.
export type { OrganizationInfoRecord, Richtext, LinearDocument, SmallImage };

// ---------------------------------------------------------------------------
// Objective enum — matches the lexicon's enum values exactly.
// ---------------------------------------------------------------------------

export type Objective =
  | "Conservation"
  | "Research"
  | "Education"
  | "Community"
  | "Other";

// ---------------------------------------------------------------------------
// Input types — what callers pass into each operation.
//
// Rules:
//   - $type is always omitted (set internally to "app.gainforest.organization.info")
//   - createdAt is always omitted from create/update inputs — operations set it
//   - update input makes every field optional (partial patch semantics)
// ---------------------------------------------------------------------------

export type CreateOrganizationInfoInput = {
  /** Min 8, max 255 characters */
  displayName: string;
  /** Short richtext description */
  shortDescription: Richtext;
  /** Long richtext document (pub.leaflet linearDocument) */
  longDescription: LinearDocument;
  /** At least one objective required */
  objectives: Objective[];
  /** ISO 3166-1 alpha-2 country code (e.g. "BR", "US") */
  country: string;
  visibility: "Public" | "Unlisted";
  coverImage?: SmallImage;
  logo?: SmallImage;
  /** ISO 8601 datetime string */
  startDate?: string;
  /** Full URI including scheme (https://...) */
  website?: string;
};

/**
 * Partial update — only the fields you want to change.
 * All fields are optional; omitted fields keep their existing values.
 * createdAt is not patchable — it is set once at creation time.
 */
export type UpdateOrganizationInfoInput = Partial<CreateOrganizationInfoInput>;

// ---------------------------------------------------------------------------
// Return type — what every operation yields on success.
// ---------------------------------------------------------------------------

export type OrganizationInfoMutationResult = {
  /** AT-URI of the record — at://<did>/app.gainforest.organization.info/self */
  uri: string;
  /** Content ID (CID) of the committed record */
  cid: string;
  /** The full committed record as stored on the PDS */
  record: OrganizationInfoRecord;
};
