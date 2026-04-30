// ---------------------------------------------------------------------------
// Re-export generated types — single source of truth, no manual duplication.
// ---------------------------------------------------------------------------

export type { Main as FundingConfigRecord } from "@gainforest/generated/app/gainforest/funding/config.defs";
export type { EvmLinkRef } from "@gainforest/generated/app/gainforest/funding/config.defs";

// ---------------------------------------------------------------------------
// Entity-specific derived types
// ---------------------------------------------------------------------------

import type { Main as FundingConfigRecord } from "@gainforest/generated/app/gainforest/funding/config.defs";
import type {
  RecordMutationResult,
  RecordCreateInput,
  RecordUpdateInput,
} from "../../../utils/shared/types";

/**
 * Input for createFundingConfig.
 * rkey should match the rkey of the associated org.hypercerts.claim.activity record
 * to enable the shared-rkey join lookup in the indexer.
 */
export type CreateFundingConfigInput = RecordCreateInput<FundingConfigRecord>;

/** Input for updateFundingConfig. */
export type UpdateFundingConfigInput = RecordUpdateInput<FundingConfigRecord>;

/** Input for upsertFundingConfig — same full-replacement semantics as create. */
export type UpsertFundingConfigInput = CreateFundingConfigInput;

/** Returned by create, update, and upsert on success. */
export type FundingConfigMutationResult = RecordMutationResult<FundingConfigRecord>;
