// ---------------------------------------------------------------------------
// Re-export generated types — single source of truth, no manual duplication.
// ---------------------------------------------------------------------------

export type { Main as ClaimActivityRecord } from "@gainforest/generated/org/hypercerts/claim/activity.defs";

export type {
  Contributor,
  ContributorIdentity,
  ContributorRole,
  WorkScopeString,
} from "@gainforest/generated/org/hypercerts/claim/activity.defs";
export type { SmallImage, Uri } from "@gainforest/generated/org/hypercerts/defs.defs";
export type { Main as StrongRef } from "@gainforest/generated/com/atproto/repo/strongRef.defs";
export type { Main as RichtextFacet } from "@gainforest/generated/app/bsky/richtext/facet.defs";

export type { SerializableFile, FileOrBlobRef } from "../../../blob/types";

// ---------------------------------------------------------------------------
// Entity-specific derived types
// ---------------------------------------------------------------------------

import type { Main as ClaimActivityRecord } from "@gainforest/generated/org/hypercerts/claim/activity.defs";
import type {
  RecordMutationResult,
  RecordCreateInput,
  RecordUpdateInput,
} from "../../../utils/shared/types";

/** Input for createClaimActivity. rkey is optional — PDS assigns a TID when absent. */
export type CreateClaimActivityInput = RecordCreateInput<ClaimActivityRecord>;

/** Input for updateClaimActivity. */
export type UpdateClaimActivityInput = RecordUpdateInput<ClaimActivityRecord>;

/** Input for upsertClaimActivity — same full-replacement semantics as create. */
export type UpsertClaimActivityInput = CreateClaimActivityInput;

/** Returned by create, update, and upsert on success. */
export type ClaimActivityMutationResult = RecordMutationResult<ClaimActivityRecord>;
