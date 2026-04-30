// ---------------------------------------------------------------------------
// Re-export generated types — single source of truth, no manual duplication.
// ---------------------------------------------------------------------------

export type { Main as LinkEvmRecord } from "@gainforest/generated/app/gainforest/link/evm.defs";
export type { Eip712Proof } from "@gainforest/generated/app/gainforest/link/evm.defs";
export type { Eip712Message } from "@gainforest/generated/app/gainforest/link/evm.defs";
export type { Eip712PlatformAttestation } from "@gainforest/generated/app/gainforest/link/evm.defs";

// ---------------------------------------------------------------------------
// Entity-specific derived types
// ---------------------------------------------------------------------------

import type { Main as LinkEvmRecord } from "@gainforest/generated/app/gainforest/link/evm.defs";
import type {
  RecordMutationResult,
  RecordCreateInput,
  RecordUpdateInput,
} from "../../../utils/shared/types";

/**
 * Input for createLinkEvm.
 * rkey is optional — PDS assigns a TID when absent.
 */
export type CreateLinkEvmInput = RecordCreateInput<LinkEvmRecord>;

/**
 * Input for updateLinkEvm.
 * Only `name` is updatable — crypto proof fields are immutable.
 */
export type UpdateLinkEvmInput = RecordUpdateInput<Pick<LinkEvmRecord, "name">>;

/** Returned by create/update on success. */
export type LinkEvmMutationResult = RecordMutationResult<LinkEvmRecord>;
