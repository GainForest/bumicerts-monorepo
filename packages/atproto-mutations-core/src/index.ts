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
// organization.info — app.gainforest.organization.info
// ---------------------------------------------------------------------------
export { createOrganizationInfo } from "./mutations/organization.info/create";
export { updateOrganizationInfo } from "./mutations/organization.info/update";
export {
  upsertOrganizationInfo,
} from "./mutations/organization.info/update-or-create";
export type {
  UpsertOrganizationInfoInput,
} from "./mutations/organization.info/update-or-create";

export {
  OrganizationInfoAlreadyExistsError,
  OrganizationInfoNotFoundError,
  OrganizationInfoPdsError,
  OrganizationInfoValidationError,
} from "./mutations/organization.info/utils/errors";

export type {
  CreateOrganizationInfoInput,
  LinearDocument,
  Objective,
  OrganizationInfoMutationResult,
  OrganizationInfoRecord,
  Richtext,
  SmallImage,
  UpdateOrganizationInfoInput,
} from "./mutations/organization.info/utils/types";
