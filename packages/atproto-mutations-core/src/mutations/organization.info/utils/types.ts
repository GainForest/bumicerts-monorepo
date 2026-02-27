// ---------------------------------------------------------------------------
// Re-export generated types — single source of truth, no manual duplication.
// ---------------------------------------------------------------------------

export type { Main as OrganizationInfoRecord } from "@gainforest/generated/app/gainforest/organization/info.defs";

export type { Richtext } from "@gainforest/generated/app/gainforest/common/defs.defs";
export type { Main as LinearDocument } from "@gainforest/generated/pub/leaflet/pages/linearDocument.defs";
export type { SmallImage } from "@gainforest/generated/org/hypercerts/defs.defs";

export type { SerializableFile, FileOrBlobRef } from "../../../blob/types";

// ---------------------------------------------------------------------------
// Entity-specific derived types
// ---------------------------------------------------------------------------

import type { Main as OrganizationInfoRecord } from "@gainforest/generated/app/gainforest/organization/info.defs";
import type {
  SingletonMutationResult,
  SingletonCreateInput,
  SingletonUpdateInput,
} from "../../../utils/shared/types";

/** Valid objective values — extracted from the record so they stay in sync with the lexicon. */
export type Objective = OrganizationInfoRecord["objectives"][number];

/** Input for createOrganizationInfo. */
export type CreateOrganizationInfoInput = SingletonCreateInput<OrganizationInfoRecord>;

/** Input for updateOrganizationInfo. */
export type UpdateOrganizationInfoInput = SingletonUpdateInput<OrganizationInfoRecord>;

/** Returned by create, update, and upsert on success. */
export type OrganizationInfoMutationResult = SingletonMutationResult<OrganizationInfoRecord>;
