// @gainforest/atproto-mutations-core
// Framework-agnostic primitives for ATProto mutations.
//
// This package is the foundation that @gainforest/atproto-mutations-next
// builds on. It can also be used directly in any non-Next.js environment
// (plain Node, Bun scripts, other frameworks, workers).
//
// Usage:
//
//   import { mutations } from "@gainforest/atproto-mutations-core";
//   mutations.organization.info.create(input);
//   mutations.claim.activity.upsert(input);
//
// All operations return Effect<Result, Error, AtprotoAgent>.

// ---------------------------------------------------------------------------
// Nested mutations namespace
// ---------------------------------------------------------------------------
export { mutations } from "./namespace";
export type { Mutations } from "./namespace";

// ---------------------------------------------------------------------------
// Core primitives
// ---------------------------------------------------------------------------
export type { MutationResult, ValidationIssue } from "./result";
export { ok, err } from "./result";
export { MutationError } from "./error";

// ---------------------------------------------------------------------------
// Error formatting utilities
// ---------------------------------------------------------------------------
export { formatMutationError, formatMutationErrorMessage } from "./utils/formatError";
export type { FormattedError, FieldLabels } from "./utils/formatError";
export { adapt } from "./adapt";

// Effect-based agent abstraction
export { AtprotoAgent } from "./services/AtprotoAgent";

// Credential (username/password) auth layer — for scripts, workers, service accounts
export { makeCredentialAgentLayer, CredentialLoginError } from "./layers/credential";
export type { CredentialConfig } from "./layers/credential";

// ---------------------------------------------------------------------------
// Blob / file utilities
// ---------------------------------------------------------------------------
export type { UploadBlobInput, UploadBlobResult } from "./blob/upload";
export { FileConstraintError, BlobUploadError } from "./blob/errors";
export type { SerializableFile, FileOrBlobRef, WithFileInputs } from "./blob/types";
export { toSerializableFile, fromSerializableFile, isAnyBlobRef, normalizeBlobRef } from "./blob/types";
export { extractBlobConstraints, mimeMatches } from "./blob/introspect";
export type { BlobConstraint } from "./blob/introspect";

// ---------------------------------------------------------------------------
// Shared generic types
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
// GeoJSON utilities
// ---------------------------------------------------------------------------
export { validateGeojsonOrThrow } from "./geojson/validate";
export {
  computePolygonMetrics,
  extractPolygonFeatures,
  extractLineStringFeatures,
  extractPointFeatures,
  toFeatureCollection,
  HECTARES_PER_SQUARE_METER,
} from "./geojson/computations";
export type { Coordinates, PolygonMetrics } from "./geojson/computations";
export { GeoJsonValidationError, GeoJsonProcessingError } from "./geojson/errors";

// ---------------------------------------------------------------------------
// Entity errors
// ---------------------------------------------------------------------------

// certified.location
export {
  CertifiedLocationValidationError,
  CertifiedLocationNotFoundError,
  CertifiedLocationPdsError,
  CertifiedLocationIsDefaultError,
} from "./mutations/certified.location/utils/errors";

// organization.defaultSite
export {
  DefaultSiteValidationError,
  DefaultSiteLocationNotFoundError,
  DefaultSitePdsError,
} from "./mutations/organization.defaultSite/utils/errors";

// organization.layer
export {
  LayerValidationError,
  LayerNotFoundError,
  LayerPdsError,
} from "./mutations/organization.layer/utils/errors";

// organization.recordings.audio
export {
  AudioRecordingValidationError,
  AudioRecordingNotFoundError,
  AudioRecordingPdsError,
} from "./mutations/organization.recordings.audio/utils/errors";

// claim.activity
export {
  ClaimActivityValidationError,
  ClaimActivityNotFoundError,
  ClaimActivityPdsError,
} from "./mutations/claim.activity/utils/errors";

// funding.receipt
export {
  FundingReceiptValidationError,
  FundingReceiptPdsError,
} from "./mutations/funding.receipt/utils/errors";

// link.evm
export {
  LinkEvmValidationError,
  LinkEvmNotFoundError,
  LinkEvmPdsError,
} from "./mutations/link.evm/utils/errors";

// funding.config
export {
  FundingConfigValidationError,
  FundingConfigNotFoundError,
  FundingConfigPdsError,
} from "./mutations/funding.config/utils/errors";

// organization.info
export {
  OrganizationInfoAlreadyExistsError,
  OrganizationInfoNotFoundError,
  OrganizationInfoPdsError,
  OrganizationInfoValidationError,
} from "./mutations/organization.info/utils/errors";

// dwc.occurrence
export {
  DwcOccurrenceValidationError,
  DwcOccurrencePdsError,
} from "./mutations/dwc.occurrence/utils/errors";

// dwc.measurement
export {
  DwcMeasurementValidationError,
  DwcMeasurementPdsError,
} from "./mutations/dwc.measurement/utils/errors";

// ---------------------------------------------------------------------------
// Entity types
// ---------------------------------------------------------------------------

// certified.location
export type {
  CertifiedLocationRecord,
  CertifiedLocationMutationResult,
  CreateCertifiedLocationInput,
  UpdateCertifiedLocationInput,
  UpsertCertifiedLocationInput,
} from "./mutations/certified.location/utils/types";

// organization.defaultSite
export type {
  DefaultSiteRecord,
  DefaultSiteMutationResult,
  SetDefaultSiteInput,
} from "./mutations/organization.defaultSite/utils/types";

// organization.layer
export type {
  LayerRecord,
  LayerMutationResult,
  LayerType,
  CreateLayerInput,
  UpdateLayerInput,
  UpsertLayerInput,
} from "./mutations/organization.layer/utils/types";

// organization.recordings.audio
export type {
  AudioRecordingRecord,
  AudioRecordingMutationResult,
  AudioMetadata,
  AudioTechnicalMetadata,
  CreateAudioRecordingInput,
  UpdateAudioRecordingInput,
  UpsertAudioRecordingInput,
} from "./mutations/organization.recordings.audio/utils/types";

// claim.activity
export type {
  CreateClaimActivityInput,
  UpdateClaimActivityInput,
  UpsertClaimActivityInput,
  ClaimActivityMutationResult,
  ClaimActivityRecord,
  WorkScopeString,
  WorkscopeCel,
  Contributor,
  ContributorIdentity,
  ContributorRole,
  StrongRef,
  RichtextFacet,
  LinearDocument as ClaimActivityLinearDocument,
} from "./mutations/claim.activity/utils/types";

// funding.receipt
export type {
  FundingReceiptRecord,
  FundingReceiptMutationResult,
  CreateFundingReceiptInput,
} from "./mutations/funding.receipt/utils/types";

// link.evm
export type {
  LinkEvmRecord,
  LinkEvmMutationResult,
  CreateLinkEvmInput,
  UpdateLinkEvmInput,
  Eip712Proof,
  Eip712Message as LinkEvmEip712Message,
  Eip712PlatformAttestation,
} from "./mutations/link.evm/utils/types";

// funding.config
export type {
  FundingConfigRecord,
  FundingConfigMutationResult,
  CreateFundingConfigInput,
  UpdateFundingConfigInput,
  UpsertFundingConfigInput,
  EvmLinkRef,
} from "./mutations/funding.config/utils/types";

// organization.info
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

// dwc.occurrence
export type {
  CreateDwcOccurrenceInput,
  DwcOccurrenceMutationResult,
  DwcOccurrenceRecord,
} from "./mutations/dwc.occurrence/utils/types";

// dwc.measurement
export type {
  CreateDwcMeasurementInput,
  DwcMeasurementMutationResult,
  DwcMeasurementRecord,
} from "./mutations/dwc.measurement/utils/types";
