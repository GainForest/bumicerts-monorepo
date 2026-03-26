// ---------------------------------------------------------------------------
// Re-export generated types — single source of truth, no manual duplication.
// ---------------------------------------------------------------------------

export type { Main as ContextAttachmentRecord } from "@gainforest/generated/org/hypercerts/context/attachment.defs";

export type { Main as StrongRef } from "@gainforest/generated/com/atproto/repo/strongRef.defs";
export type { Main as RichtextFacet } from "@gainforest/generated/app/bsky/richtext/facet.defs";
export type { Main as LinearDocument } from "@gainforest/generated/pub/leaflet/pages/linearDocument.defs";
export type { Uri, SmallBlob } from "@gainforest/generated/org/hypercerts/defs.defs";

export type { SerializableFile, FileOrBlobRef } from "../../../blob/types";

// ---------------------------------------------------------------------------
// Entity-specific derived types
// ---------------------------------------------------------------------------

import type { Main as ContextAttachmentRecord } from "@gainforest/generated/org/hypercerts/context/attachment.defs";
import type {
  RecordMutationResult,
  RecordCreateInput,
  RecordUpdateInput,
} from "../../../utils/shared/types";

/** Input for createContextAttachment. rkey is optional — PDS assigns a TID when absent. */
export type CreateContextAttachmentInput = RecordCreateInput<ContextAttachmentRecord>;

/** Input for updateContextAttachment. */
export type UpdateContextAttachmentInput = RecordUpdateInput<ContextAttachmentRecord>;

/** Input for upsertContextAttachment — same full-replacement semantics as create. */
export type UpsertContextAttachmentInput = CreateContextAttachmentInput;

/** Returned by create, update, and upsert on success. */
export type ContextAttachmentMutationResult = RecordMutationResult<ContextAttachmentRecord>;
