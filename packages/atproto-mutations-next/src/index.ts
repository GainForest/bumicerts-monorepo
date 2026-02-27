// @gainforest/atproto-mutations-next
//
// Root export — types and primitives that are safe to import from anywhere
// (server components, client components, route handlers, scripts).
//
// For context-specific imports use the subpath exports:
//   @gainforest/atproto-mutations-next/actions  — raw server actions (server-to-server)
//   @gainforest/atproto-mutations-next/server   — layer construction, server utils
//   @gainforest/atproto-mutations-next/client   — adapted mutations namespace for useMutation

// Core primitives — safe everywhere
export type { MutationResult } from "@gainforest/atproto-mutations-core";
export { ok, err, MutationError, adapt, AtprotoAgent } from "@gainforest/atproto-mutations-core";
export { makeCredentialAgentLayer, CredentialLoginError } from "@gainforest/atproto-mutations-core";
export type { CredentialConfig } from "@gainforest/atproto-mutations-core";

// Blob utilities — safe everywhere (types + client-side converters)
export type {
  SerializableFile,
  FileOrBlobRef,
  WithFileInputs,
  BlobConstraint,
} from "@gainforest/atproto-mutations-core";
export {
  toSerializableFile,
  FileConstraintError,
  BlobUploadError,
} from "@gainforest/atproto-mutations-core";

// organization.info types — safe everywhere
export type {
  CreateOrganizationInfoInput,
  UpdateOrganizationInfoInput,
  OrganizationInfoMutationResult,
  OrganizationInfoRecord,
  Richtext,
  LinearDocument,
  SmallImage,
  Objective,
} from "@gainforest/atproto-mutations-core";
export {
  OrganizationInfoAlreadyExistsError,
  OrganizationInfoNotFoundError,
  OrganizationInfoPdsError,
  OrganizationInfoValidationError,
} from "@gainforest/atproto-mutations-core";

// claim.activity types — safe everywhere
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
} from "@gainforest/atproto-mutations-core";

// Shared generic types — useful for consumers building custom mutations
export type {
  DeleteRecordInput,
  DeleteRecordResult,
  RecordFields,
  SingletonMutationResult,
  RecordMutationResult,
  SingletonCreateInput,
  RecordCreateInput,
  SingletonUpdateInput,
  RecordUpdateInput,
} from "@gainforest/atproto-mutations-core";
export {
  ClaimActivityValidationError,
  ClaimActivityNotFoundError,
  ClaimActivityPdsError,
} from "@gainforest/atproto-mutations-core";
