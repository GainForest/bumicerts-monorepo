// @gainforest/atproto-mutations-core
// Framework-agnostic primitives for ATProto mutations.
//
// This package is the foundation that @gainforest/atproto-mutations-next
// builds on. It can also be used directly in any non-Next.js environment
// (plain Node, Bun scripts, other frameworks, workers).

export type { MutationResult } from "./result";
export { ok, err } from "./result";
export { MutationError } from "./error";
export { adapt } from "./adapt";

// Effect-based agent abstraction
export { AtprotoAgent } from "./services/AtprotoAgent";

// Credential (username/password) auth layer — for scripts, workers, service accounts
export { makeCredentialAgentLayer, CredentialLoginError } from "./layers/credential";
export type { CredentialConfig } from "./layers/credential";

// ---------------------------------------------------------------------------
// Blob / file utilities
// Callers import these to prepare File/Blob inputs for server action boundaries
// and to perform standalone blob uploads.
// ---------------------------------------------------------------------------

// Standalone blob upload mutation
export { uploadBlob } from "./blob/upload";
export type { UploadBlobInput, UploadBlobResult } from "./blob/upload";

// Typed errors
export { FileConstraintError, BlobUploadError } from "./blob/errors";

// Public types + converter utilities
export type { SerializableFile, FileOrBlobRef, WithFileInputs } from "./blob/types";
export { toSerializableFile, fromSerializableFile, isAnyBlobRef, normalizeBlobRef } from "./blob/types";

// Schema introspection (advanced — most callers won't need this directly)
export { extractBlobConstraints, mimeMatches } from "./blob/introspect";
export type { BlobConstraint } from "./blob/introspect";

// ---------------------------------------------------------------------------
// Shared generic types
// Useful for consumers building their own mutations with consistent patterns.
// ---------------------------------------------------------------------------
export type {
  RecordFields,
  SingletonMutationResult,
  RecordMutationResult,
  DeleteRecordResult,
  DeleteRecordInput,
  SingletonCreateInput,
  RecordCreateInput,
  SingletonUpdateInput,
  RecordUpdateInput,
} from "./utils/shared/types";

// ---------------------------------------------------------------------------
// claim.activity — org.hypercerts.claim.activity
// ---------------------------------------------------------------------------
export { createClaimActivity } from "./mutations/claim.activity/create";
export { updateClaimActivity } from "./mutations/claim.activity/update";
export { upsertClaimActivity } from "./mutations/claim.activity/upsert";
export { deleteClaimActivity } from "./mutations/claim.activity/delete";

export {
  ClaimActivityValidationError,
  ClaimActivityNotFoundError,
  ClaimActivityPdsError,
} from "./mutations/claim.activity/utils/errors";

export type {
  CreateClaimActivityInput,
  UpdateClaimActivityInput,
  UpsertClaimActivityInput,
  ClaimActivityMutationResult,
  ClaimActivityRecord,
  Contributor,
  ContributorIdentity,
  ContributorRole,
  WorkScopeString,
  StrongRef,
  RichtextFacet,
} from "./mutations/claim.activity/utils/types";

// ---------------------------------------------------------------------------
// organization.info — app.gainforest.organization.info
// ---------------------------------------------------------------------------
export { createOrganizationInfo } from "./mutations/organization.info/create";
export { updateOrganizationInfo } from "./mutations/organization.info/update";
export { upsertOrganizationInfo } from "./mutations/organization.info/upsert";
// Note: upsertOrganizationInfo accepts CreateOrganizationInfoInput directly —
// there is no separate UpsertOrganizationInfoInput type.

export {
  OrganizationInfoAlreadyExistsError,
  OrganizationInfoNotFoundError,
  OrganizationInfoPdsError,
  OrganizationInfoValidationError,
} from "./mutations/organization.info/utils/errors";

export type {
  CreateOrganizationInfoInput,
  FileOrBlobRef as OrganizationInfoFileOrBlobRef,
  LinearDocument,
  Objective,
  OrganizationInfoMutationResult,
  OrganizationInfoRecord,
  Richtext,
  SerializableFile as OrganizationInfoSerializableFile,
  SmallImage,
  UpdateOrganizationInfoInput,
} from "./mutations/organization.info/utils/types";
