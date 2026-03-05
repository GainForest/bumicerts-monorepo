"use server";

// @gainforest/atproto-mutations-next/actions
//
// Raw server actions — every function here returns MutationResult<TData, TCode>
// and never throws domain errors.
//
// USE THIS when:
//   - Calling one server action from another (server-to-server composition)
//   - You need access to the full Result shape (e.g. mapping errors upward)
//
// DO NOT use this in client components directly — import from ./client instead,
// which ships the adapt()-wrapped mutations namespace.
//
// Example — server-to-server (e.g. post-signup org setup):
//
//   import { actions } from "@gainforest/atproto-mutations-next/actions";
//
//   export async function signup(input: SignupInput, agentLayer: Layer) {
//     const userResult = await createUserAction(input);
//     if (!userResult.success) return userResult;
//
//     const orgResult = await actions.organization.info.upsert(orgInput, agentLayer);
//     if (!orgResult.success) return orgResult;
//
//     return ok(userResult.data);
//   }

import { Effect } from "effect";
import type { Layer } from "effect";
import type { ValidationIssue } from "@gainforest/atproto-mutations-core";
import {
  mutations,
  ok,
  err,
  AtprotoAgent,
  OrganizationInfoAlreadyExistsError,
  OrganizationInfoNotFoundError,
  OrganizationInfoPdsError,
  OrganizationInfoValidationError,
  ClaimActivityValidationError,
  ClaimActivityNotFoundError,
  ClaimActivityPdsError,
  FileConstraintError,
  BlobUploadError,
  GeoJsonValidationError,
  GeoJsonProcessingError,
  CertifiedLocationValidationError,
  CertifiedLocationNotFoundError,
  CertifiedLocationPdsError,
  CertifiedLocationIsDefaultError,
  DefaultSiteValidationError,
  DefaultSiteLocationNotFoundError,
  DefaultSitePdsError,
  LayerValidationError,
  LayerNotFoundError,
  LayerPdsError,
  AudioRecordingValidationError,
  AudioRecordingNotFoundError,
  AudioRecordingPdsError,
} from "@gainforest/atproto-mutations-core";
import type {
  MutationResult,
  CreateOrganizationInfoInput,
  UpdateOrganizationInfoInput,
  OrganizationInfoMutationResult,
  CreateClaimActivityInput,
  UpdateClaimActivityInput,
  UpsertClaimActivityInput,
  ClaimActivityMutationResult,
  DeleteRecordInput,
  DeleteRecordResult,
  UploadBlobInput,
  UploadBlobResult,
  CertifiedLocationRecord,
  CertifiedLocationMutationResult,
  CreateCertifiedLocationInput,
  UpdateCertifiedLocationInput,
  UpsertCertifiedLocationInput,
  DefaultSiteRecord,
  DefaultSiteMutationResult,
  SetDefaultSiteInput,
  LayerRecord,
  LayerMutationResult,
  LayerType,
  CreateLayerInput,
  UpdateLayerInput,
  UpsertLayerInput,
  AudioRecordingRecord,
  AudioRecordingMutationResult,
  AudioTechnicalMetadata,
  CreateAudioRecordingInput,
  UpdateAudioRecordingInput,
  UpsertAudioRecordingInput,
} from "@gainforest/atproto-mutations-core";
import { UnauthorizedError, SessionExpiredError } from "../server";

// ---------------------------------------------------------------------------
// Error code literals
// ---------------------------------------------------------------------------

type OrgInfoErrorCode =
  | "UNAUTHORIZED"
  | "SESSION_EXPIRED"
  | "ALREADY_EXISTS"
  | "NOT_FOUND"
  | "INVALID_RECORD"
  | "FILE_CONSTRAINT"
  | "BLOB_UPLOAD_ERROR"
  | "PDS_ERROR";

type ClaimActivityErrorCode =
  | "UNAUTHORIZED"
  | "SESSION_EXPIRED"
  | "NOT_FOUND"
  | "INVALID_RECORD"
  | "FILE_CONSTRAINT"
  | "BLOB_UPLOAD_ERROR"
  | "PDS_ERROR";

type BlobErrorCode =
  | "UNAUTHORIZED"
  | "SESSION_EXPIRED"
  | "FILE_CONSTRAINT"
  | "BLOB_UPLOAD_ERROR"
  | "PDS_ERROR";

type CertifiedLocationErrorCode =
  | "UNAUTHORIZED"
  | "SESSION_EXPIRED"
  | "NOT_FOUND"
  | "IS_DEFAULT"
  | "INVALID_RECORD"
  | "INVALID_GEOJSON"
  | "GEOJSON_PROCESSING"
  | "BLOB_UPLOAD_ERROR"
  | "PDS_ERROR";

type DefaultSiteErrorCode =
  | "UNAUTHORIZED"
  | "SESSION_EXPIRED"
  | "NOT_FOUND"
  | "INVALID_RECORD"
  | "PDS_ERROR";

type LayerErrorCode =
  | "UNAUTHORIZED"
  | "SESSION_EXPIRED"
  | "NOT_FOUND"
  | "INVALID_RECORD"
  | "PDS_ERROR";

type AudioRecordingErrorCode =
  | "UNAUTHORIZED"
  | "SESSION_EXPIRED"
  | "NOT_FOUND"
  | "INVALID_RECORD"
  | "FILE_CONSTRAINT"
  | "BLOB_UPLOAD_ERROR"
  | "PDS_ERROR";

// ---------------------------------------------------------------------------
// Record serializer — strips non-JSON-safe class instances from mutation results
// ---------------------------------------------------------------------------

/**
 * Recursively walks a mutation result value and replaces any BlobRef whose
 * `.ref` is a CID class instance with a plain-object version that Next.js
 * can serialize across the server→client action boundary.
 *
 * ATProto BlobRefs returned after a PDS write have the shape:
 *   { $type: "blob", ref: <CID instance>, mimeType: string, size: number }
 *
 * The CID instance is a class from @atproto/lex-data — not JSON-safe.
 * We convert it to { $link: "<cid string>" } which is the standard AT Protocol
 * plain-object CID representation and is fully JSON-serializable.
 */
function serializeForClient(value: unknown): unknown {
  if (value === null || value === undefined) return value;

  // Detect a BlobRef: plain-object with $type:"blob" and a ref that has a toString
  if (
    typeof value === "object" &&
    !Array.isArray(value) &&
    (value as Record<string, unknown>)["$type"] === "blob"
  ) {
    const blob = value as Record<string, unknown>;
    const ref = blob["ref"];
    // CID instances have a toString() — convert to { $link: "..." }
    const serializedRef =
      ref != null && typeof ref === "object" && typeof (ref as { toString?: unknown }).toString === "function"
        ? { $link: (ref as { toString(): string }).toString() }
        : ref;
    return {
      $type: "blob",
      ref: serializedRef,
      mimeType: blob["mimeType"],
      size: blob["size"],
    };
  }

  if (Array.isArray(value)) return value.map(serializeForClient);

  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as object)) {
      out[k] = serializeForClient(v);
    }
    return out;
  }

  return value;
}

// ---------------------------------------------------------------------------
// Validation issue extractor
// ---------------------------------------------------------------------------

/**
 * Pulls structured `ValidationIssue[]` out of the raw `cause` stored on a
 * TaggedError. The cause is a `ValidationError` from `@atproto/lex-schema`,
 * whose `.issues` array contains rich Issue subclass instances that each
 * expose a `.toJSON()` method with structured constraint data.
 *
 * We avoid importing `@atproto/lex-schema` directly to keep the dependency
 * surface clean — instead we duck-type the shape we expect.
 */
function extractValidationIssues(cause: unknown): ValidationIssue[] | undefined {
  if (!cause || typeof cause !== "object") return undefined;

  // ValidationError exposes `.issues: Issue[]`
  const issues = (cause as { issues?: unknown }).issues;
  if (!Array.isArray(issues) || issues.length === 0) return undefined;

  const result: ValidationIssue[] = [];
  for (const issue of issues) {
    if (!issue || typeof issue !== "object") continue;

    // Every Issue subclass has a .toJSON() that returns structured data
    const json: Record<string, unknown> =
      typeof (issue as { toJSON?: () => unknown }).toJSON === "function"
        ? ((issue as { toJSON: () => unknown }).toJSON() as Record<string, unknown>)
        : (issue as Record<string, unknown>);

    const code = (json.code as ValidationIssue["code"]) ?? "custom";
    const path = Array.isArray(json.path) ? (json.path as (string | number)[]) : [];
    const message = typeof json.message === "string" ? json.message : String(issue);

    result.push({
      code,
      path,
      message,
      minimum: typeof json.minimum === "number" ? json.minimum : undefined,
      maximum: typeof json.maximum === "number" ? json.maximum : undefined,
      type: typeof json.type === "string" ? json.type : undefined,
      actual:
        typeof json.actual === "number" || typeof json.actual === "string"
          ? json.actual
          : undefined,
      expected: Array.isArray(json.expected) ? (json.expected as string[]) : undefined,
      values: Array.isArray(json.values) ? json.values : undefined,
      format: typeof json.format === "string" ? json.format : undefined,
      key:
        typeof json.key === "string" || typeof json.key === "number"
          ? json.key
          : undefined,
    });
  }

  return result.length > 0 ? result : undefined;
}

// ---------------------------------------------------------------------------
// Error mappers — Effect errors → MutationResult error codes
// ---------------------------------------------------------------------------

type OrgInfoEffectError =
  | OrganizationInfoAlreadyExistsError
  | OrganizationInfoNotFoundError
  | OrganizationInfoPdsError
  | OrganizationInfoValidationError
  | FileConstraintError
  | BlobUploadError
  | UnauthorizedError
  | SessionExpiredError;

function mapOrgInfoError(
  e: OrgInfoEffectError
): MutationResult<never, OrgInfoErrorCode> {
  switch (e._tag) {
    case "UnauthorizedError":
      return err("UNAUTHORIZED", e.message ?? "Not logged in");
    case "SessionExpiredError":
      return err("SESSION_EXPIRED", e.message ?? "Session expired, please log in again");
    case "OrganizationInfoAlreadyExistsError":
      return err("ALREADY_EXISTS", `organization.info already exists: ${e.uri}`);
    case "OrganizationInfoNotFoundError":
      return err("NOT_FOUND", `organization.info not found for repo: ${e.repo}`);
    case "OrganizationInfoValidationError":
      return err("INVALID_RECORD", e.message, extractValidationIssues(e.cause));
    case "FileConstraintError":
      return err("FILE_CONSTRAINT", e.reason);
    case "BlobUploadError":
      return err("BLOB_UPLOAD_ERROR", e.message);
    case "OrganizationInfoPdsError":
      return err("PDS_ERROR", e.message);
  }
}

type ClaimActivityEffectError =
  | ClaimActivityValidationError
  | ClaimActivityNotFoundError
  | ClaimActivityPdsError
  | FileConstraintError
  | BlobUploadError
  | UnauthorizedError
  | SessionExpiredError;

function mapClaimActivityError(
  e: ClaimActivityEffectError
): MutationResult<never, ClaimActivityErrorCode> {
  switch (e._tag) {
    case "UnauthorizedError":
      return err("UNAUTHORIZED", e.message ?? "Not logged in");
    case "SessionExpiredError":
      return err("SESSION_EXPIRED", e.message ?? "Session expired, please log in again");
    case "ClaimActivityNotFoundError":
      return err("NOT_FOUND", `claim.activity not found at rkey: ${e.rkey}`);
    case "ClaimActivityValidationError":
      return err("INVALID_RECORD", e.message, extractValidationIssues(e.cause));
    case "FileConstraintError":
      return err("FILE_CONSTRAINT", e.reason);
    case "BlobUploadError":
      return err("BLOB_UPLOAD_ERROR", e.message);
    case "ClaimActivityPdsError":
      return err("PDS_ERROR", e.message);
  }
}

type BlobEffectError =
  | FileConstraintError
  | BlobUploadError
  | UnauthorizedError
  | SessionExpiredError;

function mapBlobError(
  e: BlobEffectError
): MutationResult<never, BlobErrorCode> {
  switch (e._tag) {
    case "UnauthorizedError":
      return err("UNAUTHORIZED", e.message ?? "Not logged in");
    case "SessionExpiredError":
      return err("SESSION_EXPIRED", e.message ?? "Session expired, please log in again");
    case "FileConstraintError":
      return err("FILE_CONSTRAINT", e.reason);
    case "BlobUploadError":
      return err("BLOB_UPLOAD_ERROR", e.message);
  }
}

type CertifiedLocationEffectError =
  | CertifiedLocationValidationError
  | CertifiedLocationNotFoundError
  | CertifiedLocationPdsError
  | CertifiedLocationIsDefaultError
  | GeoJsonValidationError
  | GeoJsonProcessingError
  | FileConstraintError
  | BlobUploadError
  | UnauthorizedError
  | SessionExpiredError;

function mapCertifiedLocationError(
  e: CertifiedLocationEffectError
): MutationResult<never, CertifiedLocationErrorCode> {
  switch (e._tag) {
    case "UnauthorizedError":
      return err("UNAUTHORIZED", e.message ?? "Not logged in");
    case "SessionExpiredError":
      return err("SESSION_EXPIRED", e.message ?? "Session expired, please log in again");
    case "CertifiedLocationNotFoundError":
      return err("NOT_FOUND", `certified.location not found at rkey: ${e.rkey}`);
    case "CertifiedLocationIsDefaultError":
      return err("IS_DEFAULT", `Cannot delete the default site: ${e.uri}. Set a different default first.`);
    case "CertifiedLocationValidationError":
      return err("INVALID_RECORD", e.message, extractValidationIssues(e.cause));
    case "GeoJsonValidationError":
      return err("INVALID_GEOJSON", e.message);
    case "GeoJsonProcessingError":
      return err("GEOJSON_PROCESSING", e.message);
    case "FileConstraintError":
      return err("INVALID_RECORD", e.reason);
    case "BlobUploadError":
      return err("BLOB_UPLOAD_ERROR", e.message);
    case "CertifiedLocationPdsError":
      return err("PDS_ERROR", e.message);
  }
}

type DefaultSiteEffectError =
  | DefaultSiteValidationError
  | DefaultSiteLocationNotFoundError
  | DefaultSitePdsError
  | UnauthorizedError
  | SessionExpiredError;

function mapDefaultSiteError(
  e: DefaultSiteEffectError
): MutationResult<never, DefaultSiteErrorCode> {
  switch (e._tag) {
    case "UnauthorizedError":
      return err("UNAUTHORIZED", e.message ?? "Not logged in");
    case "SessionExpiredError":
      return err("SESSION_EXPIRED", e.message ?? "Session expired, please log in again");
    case "DefaultSiteLocationNotFoundError":
      return err("NOT_FOUND", `certified.location not found: ${e.locationUri}`);
    case "DefaultSiteValidationError":
      return err("INVALID_RECORD", e.message, extractValidationIssues(e.cause));
    case "DefaultSitePdsError":
      return err("PDS_ERROR", e.message);
  }
}

type LayerEffectError =
  | LayerValidationError
  | LayerNotFoundError
  | LayerPdsError
  | UnauthorizedError
  | SessionExpiredError;

function mapLayerError(
  e: LayerEffectError
): MutationResult<never, LayerErrorCode> {
  switch (e._tag) {
    case "UnauthorizedError":
      return err("UNAUTHORIZED", e.message ?? "Not logged in");
    case "SessionExpiredError":
      return err("SESSION_EXPIRED", e.message ?? "Session expired, please log in again");
    case "LayerNotFoundError":
      return err("NOT_FOUND", `organization.layer not found at rkey: ${e.rkey}`);
    case "LayerValidationError":
      return err("INVALID_RECORD", e.message, extractValidationIssues(e.cause));
    case "LayerPdsError":
      return err("PDS_ERROR", e.message);
  }
}

type AudioRecordingEffectError =
  | AudioRecordingValidationError
  | AudioRecordingNotFoundError
  | AudioRecordingPdsError
  | FileConstraintError
  | BlobUploadError
  | UnauthorizedError
  | SessionExpiredError;

function mapAudioRecordingError(
  e: AudioRecordingEffectError
): MutationResult<never, AudioRecordingErrorCode> {
  switch (e._tag) {
    case "UnauthorizedError":
      return err("UNAUTHORIZED", e.message ?? "Not logged in");
    case "SessionExpiredError":
      return err("SESSION_EXPIRED", e.message ?? "Session expired, please log in again");
    case "AudioRecordingNotFoundError":
      return err("NOT_FOUND", `organization.recordings.audio not found at rkey: ${e.rkey}`);
    case "AudioRecordingValidationError":
      return err("INVALID_RECORD", e.message, extractValidationIssues(e.cause));
    case "FileConstraintError":
      return err("FILE_CONSTRAINT", e.reason);
    case "BlobUploadError":
      return err("BLOB_UPLOAD_ERROR", e.message);
    case "AudioRecordingPdsError":
      return err("PDS_ERROR", e.message);
  }
}

// ---------------------------------------------------------------------------
// Agent layer type
// ---------------------------------------------------------------------------

type AgentLayer = Layer.Layer<AtprotoAgent, UnauthorizedError | SessionExpiredError>;

// ---------------------------------------------------------------------------
// organization.info actions
// ---------------------------------------------------------------------------

export async function createOrganizationInfoAction(
  input: CreateOrganizationInfoInput,
  agentLayer: AgentLayer
): Promise<MutationResult<OrganizationInfoMutationResult, OrgInfoErrorCode>> {
  return Effect.runPromise(
    mutations.organization.info.create(input).pipe(
      Effect.map((result) => ok(serializeForClient(result) as typeof result)),
      Effect.catchAll((e: OrgInfoEffectError) => Effect.succeed(mapOrgInfoError(e))),
      Effect.provide(agentLayer)
    )
  );
}

export async function updateOrganizationInfoAction(
  input: UpdateOrganizationInfoInput,
  agentLayer: AgentLayer
): Promise<MutationResult<OrganizationInfoMutationResult, OrgInfoErrorCode>> {
  return Effect.runPromise(
    mutations.organization.info.update(input).pipe(
      Effect.map((result) => ok(serializeForClient(result) as typeof result)),
      Effect.catchAll((e: OrgInfoEffectError) => Effect.succeed(mapOrgInfoError(e))),
      Effect.provide(agentLayer)
    )
  );
}

export async function upsertOrganizationInfoAction(
  input: CreateOrganizationInfoInput,
  agentLayer: AgentLayer
): Promise<
  MutationResult<OrganizationInfoMutationResult & { created: boolean }, OrgInfoErrorCode>
> {
  return Effect.runPromise(
    mutations.organization.info.upsert(input).pipe(
      Effect.map((result) => ok(serializeForClient(result) as typeof result)),
      Effect.catchAll((e: OrgInfoEffectError) => Effect.succeed(mapOrgInfoError(e))),
      Effect.provide(agentLayer)
    )
  );
}

// ---------------------------------------------------------------------------
// organization.defaultSite actions
// ---------------------------------------------------------------------------

export async function setDefaultSiteAction(
  input: SetDefaultSiteInput,
  agentLayer: AgentLayer
): Promise<MutationResult<DefaultSiteMutationResult, DefaultSiteErrorCode>> {
  return Effect.runPromise(
    mutations.organization.defaultSite.set(input).pipe(
      Effect.map((result) => ok(serializeForClient(result) as typeof result)),
      Effect.catchAll((e: DefaultSiteEffectError) => Effect.succeed(mapDefaultSiteError(e))),
      Effect.provide(agentLayer)
    )
  );
}

// ---------------------------------------------------------------------------
// organization.layer actions
// ---------------------------------------------------------------------------

export async function createLayerAction(
  input: CreateLayerInput,
  agentLayer: AgentLayer
): Promise<MutationResult<LayerMutationResult, LayerErrorCode>> {
  return Effect.runPromise(
    mutations.organization.layer.create(input).pipe(
      Effect.map((result) => ok(serializeForClient(result) as typeof result)),
      Effect.catchAll((e: LayerEffectError) => Effect.succeed(mapLayerError(e))),
      Effect.provide(agentLayer)
    )
  );
}

export async function updateLayerAction(
  input: UpdateLayerInput,
  agentLayer: AgentLayer
): Promise<MutationResult<LayerMutationResult, LayerErrorCode>> {
  return Effect.runPromise(
    mutations.organization.layer.update(input).pipe(
      Effect.map((result) => ok(serializeForClient(result) as typeof result)),
      Effect.catchAll((e: LayerEffectError) => Effect.succeed(mapLayerError(e))),
      Effect.provide(agentLayer)
    )
  );
}

export async function upsertLayerAction(
  input: UpsertLayerInput,
  agentLayer: AgentLayer
): Promise<MutationResult<LayerMutationResult & { created: boolean }, LayerErrorCode>> {
  return Effect.runPromise(
    mutations.organization.layer.upsert(input).pipe(
      Effect.map((result) => ok(serializeForClient(result) as typeof result)),
      Effect.catchAll((e: LayerEffectError) => Effect.succeed(mapLayerError(e))),
      Effect.provide(agentLayer)
    )
  );
}

export async function deleteLayerAction(
  input: DeleteRecordInput,
  agentLayer: AgentLayer
): Promise<MutationResult<DeleteRecordResult, LayerErrorCode>> {
  return Effect.runPromise(
    mutations.organization.layer.delete(input).pipe(
      Effect.map((result) => ok(serializeForClient(result) as typeof result)),
      Effect.catchAll((e: LayerEffectError) => Effect.succeed(mapLayerError(e))),
      Effect.provide(agentLayer)
    )
  );
}

// ---------------------------------------------------------------------------
// organization.recordings.audio actions
// ---------------------------------------------------------------------------

export async function createAudioRecordingAction(
  input: CreateAudioRecordingInput,
  agentLayer: AgentLayer
): Promise<MutationResult<AudioRecordingMutationResult, AudioRecordingErrorCode>> {
  return Effect.runPromise(
    mutations.organization.recordings.audio.create(input).pipe(
      Effect.map((result) => ok(serializeForClient(result) as typeof result)),
      Effect.catchAll((e: AudioRecordingEffectError) => Effect.succeed(mapAudioRecordingError(e))),
      Effect.provide(agentLayer)
    )
  );
}

export async function updateAudioRecordingAction(
  input: UpdateAudioRecordingInput,
  agentLayer: AgentLayer
): Promise<MutationResult<AudioRecordingMutationResult, AudioRecordingErrorCode>> {
  return Effect.runPromise(
    mutations.organization.recordings.audio.update(input).pipe(
      Effect.map((result) => ok(serializeForClient(result) as typeof result)),
      Effect.catchAll((e: AudioRecordingEffectError) => Effect.succeed(mapAudioRecordingError(e))),
      Effect.provide(agentLayer)
    )
  );
}

export async function upsertAudioRecordingAction(
  input: UpsertAudioRecordingInput,
  agentLayer: AgentLayer
): Promise<MutationResult<AudioRecordingMutationResult & { created: boolean }, AudioRecordingErrorCode>> {
  return Effect.runPromise(
    mutations.organization.recordings.audio.upsert(input).pipe(
      Effect.map((result) => ok(serializeForClient(result) as typeof result)),
      Effect.catchAll((e: AudioRecordingEffectError) => Effect.succeed(mapAudioRecordingError(e))),
      Effect.provide(agentLayer)
    )
  );
}

export async function deleteAudioRecordingAction(
  input: DeleteRecordInput,
  agentLayer: AgentLayer
): Promise<MutationResult<DeleteRecordResult, AudioRecordingErrorCode>> {
  return Effect.runPromise(
    mutations.organization.recordings.audio.delete(input).pipe(
      Effect.map((result) => ok(serializeForClient(result) as typeof result)),
      Effect.catchAll((e: AudioRecordingEffectError) => Effect.succeed(mapAudioRecordingError(e))),
      Effect.provide(agentLayer)
    )
  );
}

// ---------------------------------------------------------------------------
// claim.activity actions
// ---------------------------------------------------------------------------

export async function createClaimActivityAction(
  input: CreateClaimActivityInput,
  agentLayer: AgentLayer
): Promise<MutationResult<ClaimActivityMutationResult, ClaimActivityErrorCode>> {
  return Effect.runPromise(
    mutations.claim.activity.create(input).pipe(
      Effect.map((result) => ok(serializeForClient(result) as typeof result)),
      Effect.catchAll((e: ClaimActivityEffectError) =>
        Effect.succeed(mapClaimActivityError(e))
      ),
      Effect.provide(agentLayer)
    )
  );
}

export async function updateClaimActivityAction(
  input: UpdateClaimActivityInput,
  agentLayer: AgentLayer
): Promise<MutationResult<ClaimActivityMutationResult, ClaimActivityErrorCode>> {
  return Effect.runPromise(
    mutations.claim.activity.update(input).pipe(
      Effect.map((result) => ok(serializeForClient(result) as typeof result)),
      Effect.catchAll((e: ClaimActivityEffectError) =>
        Effect.succeed(mapClaimActivityError(e))
      ),
      Effect.provide(agentLayer)
    )
  );
}

export async function upsertClaimActivityAction(
  input: UpsertClaimActivityInput,
  agentLayer: AgentLayer
): Promise<
  MutationResult<ClaimActivityMutationResult & { created: boolean }, ClaimActivityErrorCode>
> {
  return Effect.runPromise(
    mutations.claim.activity.upsert(input).pipe(
      Effect.map((result) => ok(serializeForClient(result) as typeof result)),
      Effect.catchAll((e: ClaimActivityEffectError) =>
        Effect.succeed(mapClaimActivityError(e))
      ),
      Effect.provide(agentLayer)
    )
  );
}

export async function deleteClaimActivityAction(
  input: DeleteRecordInput,
  agentLayer: AgentLayer
): Promise<MutationResult<DeleteRecordResult, ClaimActivityErrorCode>> {
  return Effect.runPromise(
    mutations.claim.activity.delete(input).pipe(
      Effect.map((result) => ok(serializeForClient(result) as typeof result)),
      Effect.catchAll((e: ClaimActivityEffectError) =>
        Effect.succeed(mapClaimActivityError(e))
      ),
      Effect.provide(agentLayer)
    )
  );
}

// ---------------------------------------------------------------------------
// certified.location actions
// ---------------------------------------------------------------------------

export async function createCertifiedLocationAction(
  input: CreateCertifiedLocationInput,
  agentLayer: AgentLayer
): Promise<MutationResult<CertifiedLocationMutationResult, CertifiedLocationErrorCode>> {
  return Effect.runPromise(
    mutations.certified.location.create(input).pipe(
      Effect.map((result) => ok(serializeForClient(result) as typeof result)),
      Effect.catchAll((e: CertifiedLocationEffectError) => Effect.succeed(mapCertifiedLocationError(e))),
      Effect.provide(agentLayer)
    )
  );
}

export async function updateCertifiedLocationAction(
  input: UpdateCertifiedLocationInput,
  agentLayer: AgentLayer
): Promise<MutationResult<CertifiedLocationMutationResult, CertifiedLocationErrorCode>> {
  return Effect.runPromise(
    mutations.certified.location.update(input).pipe(
      Effect.map((result) => ok(serializeForClient(result) as typeof result)),
      Effect.catchAll((e: CertifiedLocationEffectError) => Effect.succeed(mapCertifiedLocationError(e))),
      Effect.provide(agentLayer)
    )
  );
}

export async function upsertCertifiedLocationAction(
  input: UpsertCertifiedLocationInput,
  agentLayer: AgentLayer
): Promise<MutationResult<CertifiedLocationMutationResult & { created: boolean }, CertifiedLocationErrorCode>> {
  return Effect.runPromise(
    mutations.certified.location.upsert(input).pipe(
      Effect.map((result) => ok(serializeForClient(result) as typeof result)),
      Effect.catchAll((e: CertifiedLocationEffectError) => Effect.succeed(mapCertifiedLocationError(e))),
      Effect.provide(agentLayer)
    )
  );
}

export async function deleteCertifiedLocationAction(
  input: DeleteRecordInput,
  agentLayer: AgentLayer
): Promise<MutationResult<DeleteRecordResult, CertifiedLocationErrorCode>> {
  return Effect.runPromise(
    mutations.certified.location.delete(input).pipe(
      Effect.map((result) => ok(serializeForClient(result) as typeof result)),
      Effect.catchAll((e: CertifiedLocationEffectError) => Effect.succeed(mapCertifiedLocationError(e))),
      Effect.provide(agentLayer)
    )
  );
}

// ---------------------------------------------------------------------------
// blob actions
// ---------------------------------------------------------------------------

export async function uploadBlobAction(
  input: UploadBlobInput,
  agentLayer: AgentLayer
): Promise<MutationResult<UploadBlobResult, BlobErrorCode>> {
  return Effect.runPromise(
    mutations.blob.upload(input).pipe(
      Effect.map((result) => ok(serializeForClient(result) as typeof result)),
      Effect.catchAll((e: BlobEffectError) => Effect.succeed(mapBlobError(e))),
      Effect.provide(agentLayer)
    )
  );
}

// ---------------------------------------------------------------------------
// Re-export error code types so callers don't need a separate import
// ---------------------------------------------------------------------------
export type {
  OrgInfoErrorCode,
  ClaimActivityErrorCode,
  BlobErrorCode,
  CertifiedLocationErrorCode,
  DefaultSiteErrorCode,
  LayerErrorCode,
  LayerType,
  AudioRecordingErrorCode,
  AudioTechnicalMetadata,
  CertifiedLocationRecord,
  DefaultSiteRecord,
  LayerRecord,
  AudioRecordingRecord,
};
