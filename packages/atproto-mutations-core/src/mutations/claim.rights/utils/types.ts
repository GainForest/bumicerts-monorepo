// ---------------------------------------------------------------------------
// Re-export generated types — single source of truth, no manual duplication.
// ---------------------------------------------------------------------------

export type { Main as ClaimRightsRecord } from "@gainforest/generated/org/hypercerts/claim/rights.defs";
export type { Uri, SmallBlob } from "@gainforest/generated/org/hypercerts/defs.defs";

// ---------------------------------------------------------------------------
// Entity-specific derived types
// ---------------------------------------------------------------------------

import type { Main as ClaimRightsRecord } from "@gainforest/generated/org/hypercerts/claim/rights.defs";
import type {
  RecordMutationResult,
  RecordCreateInput,
  RecordUpdateInput,
} from "../../../utils/shared/types";

/** Input for createClaimRights. rkey is optional — PDS assigns a TID when absent. */
export type CreateClaimRightsInput = RecordCreateInput<ClaimRightsRecord>;

/** Input for updateClaimRights. */
export type UpdateClaimRightsInput = RecordUpdateInput<ClaimRightsRecord>;

/** Input for upsertClaimRights — same full-replacement semantics as create. */
export type UpsertClaimRightsInput = CreateClaimRightsInput;

/** Returned by create, update, and upsert on success. */
export type ClaimRightsMutationResult = RecordMutationResult<ClaimRightsRecord>;
