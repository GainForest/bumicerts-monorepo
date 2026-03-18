import * as effect_Effect from 'effect/Effect';
import { Context, Layer } from 'effect';
import { Agent } from '@atproto/api';
import { BlobRef, Validator } from '@atproto/lex';
import * as effect_Cause from 'effect/Cause';
import * as effect_Types from 'effect/Types';
import { Main } from '@gainforest/generated/app/certified/location.defs';
export { Main as CertifiedLocationRecord } from '@gainforest/generated/app/certified/location.defs';
import { Main as Main$1 } from '@gainforest/generated/app/gainforest/organization/defaultSite.defs';
export { Main as DefaultSiteRecord } from '@gainforest/generated/app/gainforest/organization/defaultSite.defs';
import { Main as Main$2 } from '@gainforest/generated/app/gainforest/organization/layer.defs';
export { Main as LayerRecord } from '@gainforest/generated/app/gainforest/organization/layer.defs';
import { Main as Main$3 } from '@gainforest/generated/app/gainforest/organization/recordings/audio.defs';
export { Metadata as AudioMetadata, Main as AudioRecordingRecord } from '@gainforest/generated/app/gainforest/organization/recordings/audio.defs';
import { Main as Main$4 } from '@gainforest/generated/org/hypercerts/claim/activity.defs';
export { Main as ClaimActivityRecord, Contributor, ContributorIdentity, ContributorRole, WorkScopeString } from '@gainforest/generated/org/hypercerts/claim/activity.defs';
import { Main as Main$5 } from '@gainforest/generated/org/hypercerts/funding/receipt.defs';
export { Main as FundingReceiptRecord } from '@gainforest/generated/org/hypercerts/funding/receipt.defs';
import { Main as Main$6 } from '@gainforest/generated/app/bumicerts/link/evm.defs';
export { Eip712PlatformAttestation, Eip712Proof, Eip712Message as LinkEvmEip712Message, Main as LinkEvmRecord } from '@gainforest/generated/app/bumicerts/link/evm.defs';
import { Main as Main$7 } from '@gainforest/generated/app/bumicerts/funding/config.defs';
export { EvmLinkRef, Main as FundingConfigRecord } from '@gainforest/generated/app/bumicerts/funding/config.defs';
import { Main as Main$8 } from '@gainforest/generated/app/gainforest/organization/info.defs';
export { Main as OrganizationInfoRecord } from '@gainforest/generated/app/gainforest/organization/info.defs';
import { Main as Main$9 } from '@gainforest/generated/app/gainforest/dwc/occurrence.defs';
export { Main as DwcOccurrenceRecord } from '@gainforest/generated/app/gainforest/dwc/occurrence.defs';
import { Main as Main$a } from '@gainforest/generated/app/gainforest/dwc/measurement.defs';
export { Main as DwcMeasurementRecord } from '@gainforest/generated/app/gainforest/dwc/measurement.defs';
import { GeoJsonObject, Feature, LineString, MultiLineString, Point, MultiPoint, Polygon, MultiPolygon, FeatureCollection } from 'geojson';
export { Main as ClaimActivityLinearDocument, Main as LinearDocument } from '@gainforest/generated/pub/leaflet/pages/linearDocument.defs';
export { Richtext } from '@gainforest/generated/app/gainforest/common/defs.defs';
export { Main as RichtextFacet } from '@gainforest/generated/app/bsky/richtext/facet.defs';
export { SmallImage } from '@gainforest/generated/org/hypercerts/defs.defs';
export { Main as StrongRef } from '@gainforest/generated/com/atproto/repo/strongRef.defs';
export { Main as WorkscopeCel } from '@gainforest/generated/org/hypercerts/workscope/cel.defs';

declare const mutations: {
    readonly organization: {
        readonly info: {
            readonly create: (input: CreateOrganizationInfoInput) => effect_Effect.Effect<OrganizationInfoMutationResult, OrganizationInfoValidationError | OrganizationInfoAlreadyExistsError | OrganizationInfoPdsError | FileConstraintError | BlobUploadError, AtprotoAgent>;
            readonly update: (input: UpdateOrganizationInfoInput) => effect_Effect.Effect<OrganizationInfoMutationResult, OrganizationInfoValidationError | OrganizationInfoNotFoundError | OrganizationInfoPdsError | FileConstraintError | BlobUploadError, AtprotoAgent>;
            readonly upsert: (input: CreateOrganizationInfoInput) => effect_Effect.Effect<OrganizationInfoMutationResult & {
                created: boolean;
            }, OrganizationInfoValidationError | OrganizationInfoPdsError | FileConstraintError | BlobUploadError, AtprotoAgent>;
        };
        readonly defaultSite: {
            readonly set: (input: SetDefaultSiteInput) => effect_Effect.Effect<DefaultSiteMutationResult, DefaultSiteValidationError | DefaultSiteLocationNotFoundError | DefaultSitePdsError, AtprotoAgent>;
        };
        readonly layer: {
            readonly create: (input: CreateLayerInput) => effect_Effect.Effect<LayerMutationResult, LayerValidationError | LayerPdsError, AtprotoAgent>;
            readonly update: (input: UpdateLayerInput) => effect_Effect.Effect<LayerMutationResult, LayerValidationError | LayerNotFoundError | LayerPdsError, AtprotoAgent>;
            readonly upsert: (input: UpsertLayerInput) => effect_Effect.Effect<LayerMutationResult & {
                created: boolean;
            }, LayerValidationError | LayerPdsError, AtprotoAgent>;
            readonly delete: (input: DeleteRecordInput) => effect_Effect.Effect<DeleteRecordResult, LayerPdsError, AtprotoAgent>;
        };
        readonly recordings: {
            readonly audio: {
                readonly create: (input: CreateAudioRecordingInput) => effect_Effect.Effect<AudioRecordingMutationResult, AudioRecordingValidationError | AudioRecordingPdsError | FileConstraintError | BlobUploadError, AtprotoAgent>;
                readonly update: (input: UpdateAudioRecordingInput) => effect_Effect.Effect<AudioRecordingMutationResult, AudioRecordingValidationError | AudioRecordingNotFoundError | AudioRecordingPdsError | FileConstraintError | BlobUploadError, AtprotoAgent>;
                readonly upsert: (input: UpsertAudioRecordingInput) => effect_Effect.Effect<AudioRecordingMutationResult & {
                    created: boolean;
                }, AudioRecordingValidationError | AudioRecordingPdsError | FileConstraintError | BlobUploadError, AtprotoAgent>;
                readonly delete: (input: DeleteRecordInput) => effect_Effect.Effect<DeleteRecordResult, AudioRecordingPdsError, AtprotoAgent>;
            };
        };
    };
    readonly claim: {
        readonly activity: {
            readonly create: (input: CreateClaimActivityInput) => effect_Effect.Effect<ClaimActivityMutationResult, ClaimActivityValidationError | ClaimActivityPdsError | FileConstraintError | BlobUploadError, AtprotoAgent>;
            readonly update: (input: UpdateClaimActivityInput) => effect_Effect.Effect<ClaimActivityMutationResult, ClaimActivityValidationError | ClaimActivityNotFoundError | ClaimActivityPdsError | FileConstraintError | BlobUploadError, AtprotoAgent>;
            readonly upsert: (input: UpsertClaimActivityInput) => effect_Effect.Effect<ClaimActivityMutationResult & {
                created: boolean;
            }, ClaimActivityValidationError | ClaimActivityPdsError | FileConstraintError | BlobUploadError, AtprotoAgent>;
            readonly delete: (input: DeleteRecordInput) => effect_Effect.Effect<DeleteRecordResult, ClaimActivityNotFoundError | ClaimActivityPdsError, AtprotoAgent>;
        };
    };
    readonly certified: {
        readonly location: {
            readonly create: (input: CreateCertifiedLocationInput) => effect_Effect.Effect<CertifiedLocationMutationResult, CertifiedLocationValidationError | CertifiedLocationPdsError | GeoJsonValidationError | GeoJsonProcessingError | BlobUploadError, AtprotoAgent>;
            readonly update: (input: UpdateCertifiedLocationInput) => effect_Effect.Effect<CertifiedLocationMutationResult, CertifiedLocationValidationError | CertifiedLocationNotFoundError | CertifiedLocationPdsError | GeoJsonValidationError | GeoJsonProcessingError | BlobUploadError, AtprotoAgent>;
            readonly upsert: (input: UpsertCertifiedLocationInput) => effect_Effect.Effect<CertifiedLocationMutationResult & {
                created: boolean;
            }, CertifiedLocationValidationError | CertifiedLocationPdsError | GeoJsonValidationError | GeoJsonProcessingError | BlobUploadError, AtprotoAgent>;
            readonly delete: (input: DeleteRecordInput) => effect_Effect.Effect<DeleteRecordResult, CertifiedLocationPdsError | CertifiedLocationIsDefaultError, AtprotoAgent>;
        };
    };
    readonly funding: {
        readonly receipt: {
            readonly create: (input: CreateFundingReceiptInput) => effect_Effect.Effect<FundingReceiptMutationResult, FundingReceiptValidationError | FundingReceiptPdsError | BlobUploadError, AtprotoAgent>;
        };
        readonly config: {
            readonly create: (input: CreateFundingConfigInput) => effect_Effect.Effect<FundingConfigMutationResult, FundingConfigValidationError | FundingConfigPdsError | BlobUploadError, AtprotoAgent>;
            readonly update: (input: UpdateFundingConfigInput) => effect_Effect.Effect<FundingConfigMutationResult, FundingConfigValidationError | FundingConfigNotFoundError | FundingConfigPdsError | BlobUploadError, AtprotoAgent>;
            readonly upsert: (input: UpsertFundingConfigInput) => effect_Effect.Effect<FundingConfigMutationResult & {
                created: boolean;
            }, FundingConfigValidationError | FundingConfigPdsError | BlobUploadError, AtprotoAgent>;
            readonly delete: (input: DeleteRecordInput) => effect_Effect.Effect<DeleteRecordResult, FundingConfigNotFoundError | FundingConfigPdsError, AtprotoAgent>;
        };
    };
    readonly link: {
        readonly evm: {
            readonly create: (input: CreateLinkEvmInput) => effect_Effect.Effect<LinkEvmMutationResult, LinkEvmValidationError | LinkEvmPdsError | BlobUploadError, AtprotoAgent>;
            readonly update: (input: UpdateLinkEvmInput) => effect_Effect.Effect<LinkEvmMutationResult, LinkEvmValidationError | LinkEvmNotFoundError | LinkEvmPdsError | BlobUploadError, AtprotoAgent>;
            readonly delete: (input: DeleteRecordInput) => effect_Effect.Effect<DeleteRecordResult, LinkEvmNotFoundError | LinkEvmPdsError, AtprotoAgent>;
        };
    };
    readonly dwc: {
        readonly occurrence: {
            readonly create: (input: CreateDwcOccurrenceInput) => effect_Effect.Effect<DwcOccurrenceMutationResult, DwcOccurrenceValidationError | DwcOccurrencePdsError, AtprotoAgent>;
        };
        readonly measurement: {
            readonly create: (input: CreateDwcMeasurementInput) => effect_Effect.Effect<DwcMeasurementMutationResult, DwcMeasurementValidationError | DwcMeasurementPdsError, AtprotoAgent>;
        };
    };
    readonly blob: {
        readonly upload: (input: UploadBlobInput) => effect_Effect.Effect<UploadBlobResult, BlobUploadError, AtprotoAgent>;
    };
};
type Mutations = typeof mutations;

/**
 * A single structured validation issue extracted from a lexicon ValidationError.
 * Shape mirrors the `toJSON()` output of each `Issue` subclass in
 * @atproto/lex-schema so that consumers can pattern-match without
 * importing that package directly.
 */
type ValidationIssue = {
    /** The issue category code */
    code: "too_small" | "too_big" | "required_key" | "invalid_type" | "invalid_value" | "invalid_format" | "custom";
    /** JSONPath segments to the invalid value. e.g. ["displayName"] or ["blocks", 0] */
    path: (string | number)[];
    /** Human-readable message produced by the lex-schema Issue class */
    message: string;
    /** Minimum allowed length/value (too_small) */
    minimum?: number;
    /** Maximum allowed length/value (too_big) */
    maximum?: number;
    /** Value type that violated the constraint (too_small / too_big) */
    type?: string;
    /** Actual length/value that was received (too_small / too_big) */
    actual?: number | string;
    /** Expected type names (invalid_type) */
    expected?: string[];
    /** Allowed literal values (invalid_value) */
    values?: unknown[];
    /** Expected AT Protocol format name (invalid_format) */
    format?: string;
    /** The missing key name (required_key) */
    key?: string | number;
};
/**
 * The return type of every raw server action in @gainforest/atproto-mutations-next.
 *
 * - Raw server actions (./actions) return this — safe to use server-to-server.
 * - The client namespace (./client) wraps this via adapt(), converting the
 *   error branch into a thrown MutationError so React Query's onError fires.
 */
type MutationResult<TData, TCode extends string> = {
    success: true;
    data: TData;
} | {
    success: false;
    code: TCode;
    message: string;
    /**
     * Structured validation issues, populated when the failure is caused
     * by a lexicon ValidationError (code === "INVALID_RECORD").
     * Undefined for non-validation failures.
     */
    issues?: ValidationIssue[];
};
declare const ok: <TData>(data: TData) => MutationResult<TData, never>;
declare const err: <TCode extends string>(code: TCode, message: string, issues?: ValidationIssue[]) => MutationResult<never, TCode>;

/**
 * MutationError — thrown by adapt() when a server action returns a failure
 * result. Carries the typed error code so consumers can pattern-match in
 * React Query's onError without instanceof-checking a generic Error.
 *
 * Deliberately serializable: code and message are plain strings, making it
 * safe to log, display in UI, or forward to error tracking.
 *
 * When the failure is caused by a lexicon validation error
 * (code === "INVALID_RECORD"), `issues` is populated with structured
 * per-field details extracted from @atproto/lex-schema's ValidationError.
 * Pass these to `formatMutationError()` to produce user-friendly messages.
 */
declare class MutationError<TCode extends string = string> extends Error {
    readonly code: TCode;
    /**
     * Structured validation issues. Present when the failure originated from
     * a lexicon validation error (e.g. code === "INVALID_RECORD").
     * Undefined for auth, network, and PDS errors.
     */
    readonly issues?: ValidationIssue[];
    constructor(code: TCode, message: string, issues?: ValidationIssue[]);
    /**
     * Type guard — narrows an unknown catch value to MutationError.
     * Useful in onError callbacks where the type is unknown.
     *
     * @example
     * onError: (e) => {
     *   if (MutationError.is(e)) {
     *     console.log(e.code); // typed as string
     *   }
     * }
     */
    static is(value: unknown): value is MutationError;
    /**
     * Narrowed type guard — checks both instanceof and a specific code value.
     *
     * @example
     * if (MutationError.isCode(e, "UNAUTHORIZED")) {
     *   redirectToLogin();
     * }
     */
    static isCode<TCode extends string>(value: unknown, code: TCode): value is MutationError<TCode>;
}

/**
 * A human-readable representation of a single mutation error.
 */
type FormattedError = {
    /**
     * User-facing message suitable for display in UI.
     * Plain English, no JSONPath or technical jargon.
     * @example "Organization name must be at least 8 characters"
     */
    userMessage: string;
    /**
     * Developer-facing message with technical context.
     * Identical to the raw error message from the mutations package.
     * @example "string too small (minimum 8) at $.displayName (got 6)"
     */
    developerMessage: string;
    /**
     * Top-level field name that caused the error, if identifiable.
     * Extracted from the first path segment of the validation issue.
     * @example "displayName"
     */
    field?: string;
    /** Structured constraint that was violated, if applicable. */
    constraint?: {
        type: "minLength" | "maxLength" | "required" | "format" | "type" | "value" | "other";
        /** The threshold or expected value */
        expected?: number | string | string[];
        /** The actual value that was received */
        actual?: number | string;
    };
};
/**
 * Mapping from field names (as they appear in the ATProto lexicon) to
 * user-friendly display labels.
 *
 * @example
 * const labels: FieldLabels = {
 *   displayName: "Organization name",
 *   shortDescription: "Short description",
 * };
 */
type FieldLabels = Record<string, string>;
/**
 * Formats a `MutationError` into an array of structured, human-readable
 * error descriptors — one per validation issue.
 *
 * Requires the `error` to have been thrown by `adapt()` (the client
 * mutations namespace). When `error.issues` is present, each issue is
 * individually formatted. When absent (older actions / direct calls),
 * the function falls back to pattern-matching the raw message string.
 *
 * @param error - The `MutationError` to format.
 * @param fieldLabels - Optional map of lexicon field names to display labels.
 *   Unknown fields are auto-converted from camelCase (e.g. "displayName" →
 *   "Display name").
 * @returns One `FormattedError` per validation issue, or a single generic
 *   error object for non-validation failures.
 *
 * @example
 * ```ts
 * import { MutationError, formatMutationError } from "@gainforest/atproto-mutations-next";
 *
 * catch (err) {
 *   if (MutationError.is(err)) {
 *     const errors = formatMutationError(err, { displayName: "Organization name" });
 *     // errors[0].userMessage → "Organization name must be at least 8 characters"
 *     // errors[0].developerMessage → "string too small (minimum 8) at $.displayName (got 6)"
 *     console.error("Dev:", errors.map(e => e.developerMessage));
 *   }
 * }
 * ```
 */
declare function formatMutationError(error: MutationError, fieldLabels?: FieldLabels): FormattedError[];
/**
 * Convenience wrapper around `formatMutationError` that returns a single
 * joined string — suitable for setting a form error state directly.
 *
 * When there are multiple issues, messages are joined with ". ".
 *
 * @example
 * ```ts
 * setSubmitError(formatMutationErrorMessage(err, { displayName: "Organization name" }));
 * // → "Organization name must be at least 8 characters"
 * ```
 */
declare function formatMutationErrorMessage(error: MutationError, fieldLabels?: FieldLabels): string;

/**
 * adapt() — wraps a raw server action (returns MutationResult) into a
 * function that throws MutationError on failure.
 *
 * This makes the adapted function suitable as a React Query mutationFn:
 * onSuccess receives TData directly (not a Result wrapper), and onError
 * fires with a typed MutationError instead of a generic Error.
 *
 * When the action returns a failure with `issues` (validation errors),
 * those issues are forwarded to the MutationError so consumers can
 * call `formatMutationError()` to produce user-friendly messages.
 *
 * Raw server actions are NOT replaced — they remain available via
 * @gainforest/atproto-mutations-next/actions for server-to-server calls.
 *
 * @example
 * // SDK internals — wiring up the client namespace
 * export const mutations = {
 *   createClaim: adapt(createClaimAction),
 * };
 *
 * // Consumer — client component
 * const { mutate } = useMutation({
 *   mutationFn: mutations.createClaim,
 *   onSuccess: (claim) => toast.success("Created"),   // claim is TData, not Result
 *   onError: (e) => {
 *     if (MutationError.is(e)) toast.error(e.code);
 *   },
 * });
 */
declare const adapt: <TInput, TData, TCode extends string>(action: (input: TInput) => Promise<MutationResult<TData, TCode>>) => (input: TInput) => Promise<TData>;

declare const AtprotoAgent_base: Context.TagClass<AtprotoAgent, "AtprotoAgent", Agent>;
declare class AtprotoAgent extends AtprotoAgent_base {
}

type CredentialConfig = {
    service: string;
    identifier: string;
    password: string;
};
declare const CredentialLoginError_base: new <A extends Record<string, any> = {}>(args: effect_Types.Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => effect_Cause.YieldableError & {
    readonly _tag: "CredentialLoginError";
} & Readonly<A>;
declare class CredentialLoginError extends CredentialLoginError_base<{
    message: string;
    cause?: unknown;
}> {
}
declare function makeCredentialAgentLayer(config: CredentialConfig): Layer.Layer<AtprotoAgent, CredentialLoginError>;

/**
 * A JSON-safe representation of a browser File or Blob.
 * Use `toSerializableFile` to convert a File/Blob to this shape,
 * then pass it across the server action boundary and let the mutation
 * upload it via `resolveFileInputs`.
 */
type SerializableFile = {
    /** Discriminant — always true */
    $file: true;
    /** Original filename (or "blob" if the source was a plain Blob) */
    name: string;
    /** MIME type (e.g. "image/jpeg") */
    type: string;
    /** File size in bytes */
    size: number;
    /** Base64-encoded raw bytes */
    data: string;
};
/**
 * Anywhere a record type has a BlobRef, callers can pass any of:
 *   - File         — browser File object (client-side only)
 *   - Blob         — browser Blob object (client-side only)
 *   - SerializableFile — JSON-safe file descriptor (works across action boundaries)
 *   - BlobRef      — pre-uploaded blob reference (pass-through, no re-upload)
 */
type FileOrBlobRef = File | Blob | SerializableFile | BlobRef;
/**
 * Extended BlobRef guard that also recognises @atproto/lexicon BlobRef class instances.
 *
 * @atproto/api returns these class instances when you read back records from the PDS.
 * They have the shape `{ ref: CID, mimeType: string, size: number, original: {...} }`.
 * @atproto/lex's isBlobRef rejects them (they're not plain objects), but they carry
 * a real CID object in `.ref` and can be normalised to a plain BlobRef.
 */
declare function isAnyBlobRef(v: unknown): boolean;
/**
 * Convert any BlobRef (plain or @atproto/lexicon class instance) to a plain-object
 * BlobRef that @atproto/lex's isBlobRef and $parse accept.
 *
 * For @atproto/lexicon class BlobRefs, the CID instance is already in `.ref`.
 * For plain-object BlobRefs, they pass through unchanged.
 */
declare function normalizeBlobRef(v: unknown): unknown;
/**
 * Recursively replaces every BlobRef leaf in T with FileOrBlobRef.
 *
 * This allows operation inputs to accept File | Blob | SerializableFile | BlobRef
 * wherever the underlying ATProto record type has a BlobRef field.
 *
 * Example:
 *   type SmallImage = { image: BlobRef }
 *   type SmallImageInput = WithFileInputs<SmallImage>
 *   // => { image: FileOrBlobRef }
 */
type WithFileInputs<T> = T extends BlobRef ? FileOrBlobRef : T extends object ? {
    [K in keyof T]: WithFileInputs<T[K]>;
} : T;
/**
 * Convert a browser File or Blob into a SerializableFile that can be
 * safely transmitted across a Next.js server action boundary (JSON-safe).
 *
 * Call this on the client before invoking a server action that accepts
 * file inputs.
 */
declare function toSerializableFile(file: File | Blob): Promise<SerializableFile>;
/**
 * Decode a SerializableFile back to a Uint8Array for upload.
 * Called server-side inside resolveFileInputs / uploadSingle.
 */
declare function fromSerializableFile(sf: SerializableFile): Uint8Array;

declare const FileConstraintError_base: new <A extends Record<string, any> = {}>(args: effect_Types.Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => effect_Cause.YieldableError & {
    readonly _tag: "FileConstraintError";
} & Readonly<A>;
/**
 * Raised when a file violates size or MIME type constraints extracted
 * automatically from the @atproto/lex schema for the target record type.
 * This error is emitted before any blob upload is attempted.
 */
declare class FileConstraintError extends FileConstraintError_base<{
    /** Field path within the record where the violation occurred, e.g. ["logo", "image"] */
    path: string[];
    /** Human-readable description of the constraint that was violated */
    reason: string;
}> {
}
declare const BlobUploadError_base: new <A extends Record<string, any> = {}>(args: effect_Types.Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => effect_Cause.YieldableError & {
    readonly _tag: "BlobUploadError";
} & Readonly<A>;
/**
 * Raised when agent.uploadBlob() fails.
 * Wraps the raw error from the PDS or from reading the file's ArrayBuffer.
 */
declare class BlobUploadError extends BlobUploadError_base<{
    message: string;
    cause?: unknown;
}> {
}

type UploadBlobInput = {
    /** The file to upload. Can be a browser File, Blob, or a SerializableFile. */
    file: File | Blob | SerializableFile;
    /**
     * Optional MIME type override.
     * If omitted, the file's own `type` field (or "application/octet-stream") is used.
     */
    mimeType?: string;
};
type UploadBlobResult = {
    /**
     * The BlobRef returned by the PDS after a successful upload.
     * Typed as `object` to avoid leaking @atproto/lex internal types into callers;
     * cast to `BlobRef` from `@atproto/lex` when you need the exact type.
     */
    blobRef: object;
};

type BlobConstraint = {
    /** Field path from the record root, e.g. ["coverImage", "image"] */
    path: string[];
    /** Accepted MIME types, e.g. ["image/jpeg", "image/png"]. Absent = accept all. */
    accept?: string[];
    /** Maximum file size in bytes. Absent = no limit enforced. */
    maxSize?: number;
};
/**
 * Walk any @atproto/lex Validator tree and collect the constraints for every
 * blob field found anywhere in the schema.
 *
 * The results are used by `validateFileConstraints` to enforce size and MIME
 * rules before a blob is uploaded. Call this once at module load time and
 * cache the result — it is O(schema-size) and allocation-free after that.
 *
 * Supported schema node types:
 *   - blob / typedBlob       — leaf: emit a BlobConstraint
 *   - object / typedObject   — walk shape map
 *   - optional / nullable / withDefault — unwrap and recurse
 *   - ref / typedRef         — follow the lazy getter
 *   - array                  — recurse into elements, adding a "[]" path segment
 *   - record                 — unwrap the inner object schema
 *   - union / intersection / discriminatedUnion — walk all branches
 *
 * The `_ancestors` set tracks nodes currently on the call stack to prevent
 * infinite recursion from circular ref graphs. It is deliberately NOT a global
 * deduplication set — the same schema node (e.g. SmallImage) legitimately
 * appears in multiple positions (logo, coverImage) and must be visited once
 * per unique path.
 */
declare function extractBlobConstraints(validator: Validator, path?: string[], _ancestors?: Set<unknown>): BlobConstraint[];
/**
 * Returns true if `mime` satisfies the accept `pattern`.
 *
 * Patterns follow the standard media-type wildcard syntax:
 *   "*\/*"        — accept anything
 *   "image\/*"    — accept any image subtype
 *   "image/jpeg"  — accept exactly image/jpeg
 */
declare function mimeMatches(mime: string, pattern: string): boolean;

/**
 * Strips the system-managed fields that every ATProto record carries but
 * that callers never supply — the mutation layer always sets these internally.
 */
type RecordFields<TRecord> = Omit<TRecord, "$type" | "createdAt">;
/**
 * Returned by create / update / upsert for singleton records (key=literal:self).
 * The rkey is always known ("self") and therefore not included in the result —
 * the uri alone is sufficient to identify the record.
 */
type SingletonMutationResult<TRecord> = {
    uri: string;
    cid: string;
    record: TRecord;
};
/**
 * Returned by create / update / upsert for multi-record collections (key=any).
 * Includes the rkey because the caller needs it for subsequent operations
 * (update, delete, canonical links).
 */
type RecordMutationResult<TRecord> = {
    uri: string;
    cid: string;
    rkey: string;
    record: TRecord;
};
/**
 * Returned by delete operations.
 * The record is gone — only its identifiers are returned.
 */
type DeleteRecordResult = {
    uri: string;
    rkey: string;
};
/**
 * Input for deleting a record from a multi-record collection.
 * Singleton records (key=literal:self) do not have a delete operation.
 */
type DeleteRecordInput = {
    rkey: string;
};
/**
 * Create input for singleton records (key=literal:self).
 * No rkey field — the rkey is always a fixed constant ("self").
 */
type SingletonCreateInput<TRecord> = WithFileInputs<RecordFields<TRecord>>;
/**
 * Create input for multi-record collections (key=any).
 * `rkey` is optional — when absent the PDS assigns a TID automatically.
 */
type RecordCreateInput<TRecord> = WithFileInputs<RecordFields<TRecord>> & {
    rkey?: string;
};
/**
 * Update input for singleton records (key=literal:self).
 * No rkey field — there is exactly one record per repo.
 */
type SingletonUpdateInput<TRecord> = {
    data: Partial<WithFileInputs<RecordFields<TRecord>>>;
    unset?: ReadonlyArray<keyof RecordFields<TRecord>>;
};
/**
 * Update input for multi-record collections (key=any).
 * `rkey` is required — it identifies which record to update.
 */
type RecordUpdateInput<TRecord> = {
    rkey: string;
    data: Partial<WithFileInputs<RecordFields<TRecord>>>;
    unset?: ReadonlyArray<keyof RecordFields<TRecord>>;
};

/**
 * Validates if an unknown object is a valid GeoJSON object.
 * Throws a descriptive Error if validation fails.
 * Ported from climateai-sdk's _internal/lib/geojson/validate.ts.
 */
declare function validateGeojsonOrThrow(value: unknown): GeoJsonObject;

type Coordinates = {
    lat: number;
    lon: number;
};
type PolygonMetrics = {
    areaSqMeters: number | null;
    areaHectares: number | null;
    centroid: Coordinates | null;
    bbox: [number, number, number, number] | null;
    message: string;
};
declare const HECTARES_PER_SQUARE_METER = 0.0001;
declare const extractPolygonFeatures: (input: GeoJsonObject) => Feature<Polygon | MultiPolygon>[];
declare const extractLineStringFeatures: (input: GeoJsonObject) => Feature<LineString | MultiLineString>[];
declare const extractPointFeatures: (input: GeoJsonObject) => Feature<Point | MultiPoint>[];
declare const computePolygonMetrics: (geoJson: GeoJsonObject) => PolygonMetrics;
declare const toFeatureCollection: (geoJson: GeoJsonObject) => FeatureCollection;

declare const GeoJsonValidationError_base: new <A extends Record<string, any> = {}>(args: effect_Types.Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => effect_Cause.YieldableError & {
    readonly _tag: "GeoJsonValidationError";
} & Readonly<A>;
declare class GeoJsonValidationError extends GeoJsonValidationError_base<{
    message: string;
    cause?: unknown;
}> {
}
declare const GeoJsonProcessingError_base: new <A extends Record<string, any> = {}>(args: effect_Types.Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => effect_Cause.YieldableError & {
    readonly _tag: "GeoJsonProcessingError";
} & Readonly<A>;
declare class GeoJsonProcessingError extends GeoJsonProcessingError_base<{
    message: string;
    cause?: unknown;
}> {
}

declare const CertifiedLocationValidationError_base: new <A extends Record<string, any> = {}>(args: effect_Types.Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => effect_Cause.YieldableError & {
    readonly _tag: "CertifiedLocationValidationError";
} & Readonly<A>;
declare class CertifiedLocationValidationError extends CertifiedLocationValidationError_base<{
    message: string;
    cause?: unknown;
}> {
}
declare const CertifiedLocationNotFoundError_base: new <A extends Record<string, any> = {}>(args: effect_Types.Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => effect_Cause.YieldableError & {
    readonly _tag: "CertifiedLocationNotFoundError";
} & Readonly<A>;
declare class CertifiedLocationNotFoundError extends CertifiedLocationNotFoundError_base<{
    rkey: string;
}> {
}
declare const CertifiedLocationPdsError_base: new <A extends Record<string, any> = {}>(args: effect_Types.Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => effect_Cause.YieldableError & {
    readonly _tag: "CertifiedLocationPdsError";
} & Readonly<A>;
declare class CertifiedLocationPdsError extends CertifiedLocationPdsError_base<{
    message: string;
    cause?: unknown;
}> {
}
declare const CertifiedLocationIsDefaultError_base: new <A extends Record<string, any> = {}>(args: effect_Types.Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => effect_Cause.YieldableError & {
    readonly _tag: "CertifiedLocationIsDefaultError";
} & Readonly<A>;
/** Raised on delete when the location is set as the organization's default site. */
declare class CertifiedLocationIsDefaultError extends CertifiedLocationIsDefaultError_base<{
    uri: string;
}> {
}

declare const DefaultSiteValidationError_base: new <A extends Record<string, any> = {}>(args: effect_Types.Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => effect_Cause.YieldableError & {
    readonly _tag: "DefaultSiteValidationError";
} & Readonly<A>;
declare class DefaultSiteValidationError extends DefaultSiteValidationError_base<{
    message: string;
    cause?: unknown;
}> {
}
declare const DefaultSiteLocationNotFoundError_base: new <A extends Record<string, any> = {}>(args: effect_Types.Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => effect_Cause.YieldableError & {
    readonly _tag: "DefaultSiteLocationNotFoundError";
} & Readonly<A>;
declare class DefaultSiteLocationNotFoundError extends DefaultSiteLocationNotFoundError_base<{
    locationUri: string;
}> {
}
declare const DefaultSitePdsError_base: new <A extends Record<string, any> = {}>(args: effect_Types.Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => effect_Cause.YieldableError & {
    readonly _tag: "DefaultSitePdsError";
} & Readonly<A>;
declare class DefaultSitePdsError extends DefaultSitePdsError_base<{
    message: string;
    cause?: unknown;
}> {
}

declare const LayerValidationError_base: new <A extends Record<string, any> = {}>(args: effect_Types.Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => effect_Cause.YieldableError & {
    readonly _tag: "LayerValidationError";
} & Readonly<A>;
declare class LayerValidationError extends LayerValidationError_base<{
    message: string;
    cause?: unknown;
}> {
}
declare const LayerNotFoundError_base: new <A extends Record<string, any> = {}>(args: effect_Types.Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => effect_Cause.YieldableError & {
    readonly _tag: "LayerNotFoundError";
} & Readonly<A>;
declare class LayerNotFoundError extends LayerNotFoundError_base<{
    rkey: string;
}> {
}
declare const LayerPdsError_base: new <A extends Record<string, any> = {}>(args: effect_Types.Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => effect_Cause.YieldableError & {
    readonly _tag: "LayerPdsError";
} & Readonly<A>;
declare class LayerPdsError extends LayerPdsError_base<{
    message: string;
    cause?: unknown;
}> {
}

declare const AudioRecordingValidationError_base: new <A extends Record<string, any> = {}>(args: effect_Types.Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => effect_Cause.YieldableError & {
    readonly _tag: "AudioRecordingValidationError";
} & Readonly<A>;
declare class AudioRecordingValidationError extends AudioRecordingValidationError_base<{
    message: string;
    cause?: unknown;
}> {
}
declare const AudioRecordingNotFoundError_base: new <A extends Record<string, any> = {}>(args: effect_Types.Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => effect_Cause.YieldableError & {
    readonly _tag: "AudioRecordingNotFoundError";
} & Readonly<A>;
declare class AudioRecordingNotFoundError extends AudioRecordingNotFoundError_base<{
    rkey: string;
}> {
}
declare const AudioRecordingPdsError_base: new <A extends Record<string, any> = {}>(args: effect_Types.Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => effect_Cause.YieldableError & {
    readonly _tag: "AudioRecordingPdsError";
} & Readonly<A>;
declare class AudioRecordingPdsError extends AudioRecordingPdsError_base<{
    message: string;
    cause?: unknown;
}> {
}

declare const ClaimActivityValidationError_base: new <A extends Record<string, any> = {}>(args: effect_Types.Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => effect_Cause.YieldableError & {
    readonly _tag: "ClaimActivityValidationError";
} & Readonly<A>;
/**
 * Input failed validation against the org.hypercerts.claim.activity lexicon.
 * Raised by all operations (create, update, upsert) before any PDS call.
 */
declare class ClaimActivityValidationError extends ClaimActivityValidationError_base<{
    message: string;
    cause?: unknown;
}> {
}
declare const ClaimActivityNotFoundError_base: new <A extends Record<string, any> = {}>(args: effect_Types.Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => effect_Cause.YieldableError & {
    readonly _tag: "ClaimActivityNotFoundError";
} & Readonly<A>;
/**
 * An update, upsert (with rkey), or delete was attempted but no record with
 * that rkey exists in the repo.
 */
declare class ClaimActivityNotFoundError extends ClaimActivityNotFoundError_base<{
    /** The rkey that was looked up */
    rkey: string;
}> {
}
declare const ClaimActivityPdsError_base: new <A extends Record<string, any> = {}>(args: effect_Types.Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => effect_Cause.YieldableError & {
    readonly _tag: "ClaimActivityPdsError";
} & Readonly<A>;
/**
 * The PDS rejected or failed to process the record operation.
 * Wraps the raw error from agent.com.atproto.repo.* calls.
 */
declare class ClaimActivityPdsError extends ClaimActivityPdsError_base<{
    message: string;
    cause?: unknown;
}> {
}

declare const FundingReceiptValidationError_base: new <A extends Record<string, any> = {}>(args: effect_Types.Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => effect_Cause.YieldableError & {
    readonly _tag: "FundingReceiptValidationError";
} & Readonly<A>;
/**
 * Input failed validation against the org.hypercerts.funding.receipt lexicon.
 * Raised by create before any PDS call.
 */
declare class FundingReceiptValidationError extends FundingReceiptValidationError_base<{
    message: string;
    cause?: unknown;
}> {
}
declare const FundingReceiptPdsError_base: new <A extends Record<string, any> = {}>(args: effect_Types.Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => effect_Cause.YieldableError & {
    readonly _tag: "FundingReceiptPdsError";
} & Readonly<A>;
/**
 * The PDS rejected or failed to process the record operation.
 * Wraps the raw error from agent.com.atproto.repo.* calls.
 */
declare class FundingReceiptPdsError extends FundingReceiptPdsError_base<{
    message: string;
    cause?: unknown;
}> {
}

declare const LinkEvmValidationError_base: new <A extends Record<string, any> = {}>(args: effect_Types.Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => effect_Cause.YieldableError & {
    readonly _tag: "LinkEvmValidationError";
} & Readonly<A>;
/**
 * Input failed validation against the app.bumicerts.link.evm lexicon.
 * Raised by create/update before any PDS call.
 */
declare class LinkEvmValidationError extends LinkEvmValidationError_base<{
    message: string;
    cause?: unknown;
}> {
}
declare const LinkEvmPdsError_base: new <A extends Record<string, any> = {}>(args: effect_Types.Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => effect_Cause.YieldableError & {
    readonly _tag: "LinkEvmPdsError";
} & Readonly<A>;
/**
 * The PDS rejected or failed to process the record operation.
 * Wraps the raw error from agent.com.atproto.repo.* calls.
 */
declare class LinkEvmPdsError extends LinkEvmPdsError_base<{
    message: string;
    cause?: unknown;
}> {
}
declare const LinkEvmNotFoundError_base: new <A extends Record<string, any> = {}>(args: effect_Types.Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => effect_Cause.YieldableError & {
    readonly _tag: "LinkEvmNotFoundError";
} & Readonly<A>;
/**
 * The requested link.evm record does not exist in the repo.
 * Raised by update and delete when the rkey is not found.
 */
declare class LinkEvmNotFoundError extends LinkEvmNotFoundError_base<{
    rkey: string;
}> {
}

declare const FundingConfigValidationError_base: new <A extends Record<string, any> = {}>(args: effect_Types.Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => effect_Cause.YieldableError & {
    readonly _tag: "FundingConfigValidationError";
} & Readonly<A>;
/**
 * Input failed validation against the app.bumicerts.funding.config lexicon.
 * Raised by all operations (create, update, upsert) before any PDS call.
 */
declare class FundingConfigValidationError extends FundingConfigValidationError_base<{
    message: string;
    cause?: unknown;
}> {
}
declare const FundingConfigNotFoundError_base: new <A extends Record<string, any> = {}>(args: effect_Types.Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => effect_Cause.YieldableError & {
    readonly _tag: "FundingConfigNotFoundError";
} & Readonly<A>;
/**
 * An update, upsert (with rkey), or delete was attempted but no record with
 * that rkey exists in the repo.
 */
declare class FundingConfigNotFoundError extends FundingConfigNotFoundError_base<{
    /** The rkey that was looked up */
    rkey: string;
}> {
}
declare const FundingConfigPdsError_base: new <A extends Record<string, any> = {}>(args: effect_Types.Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => effect_Cause.YieldableError & {
    readonly _tag: "FundingConfigPdsError";
} & Readonly<A>;
/**
 * The PDS rejected or failed to process the record operation.
 * Wraps the raw error from agent.com.atproto.repo.* calls.
 */
declare class FundingConfigPdsError extends FundingConfigPdsError_base<{
    message: string;
    cause?: unknown;
}> {
}

declare const OrganizationInfoValidationError_base: new <A extends Record<string, any> = {}>(args: effect_Types.Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => effect_Cause.YieldableError & {
    readonly _tag: "OrganizationInfoValidationError";
} & Readonly<A>;
/**
 * Input failed validation against the app.gainforest.organization.info lexicon.
 * Raised by all three operations (create, update, upsert) before any PDS call.
 */
declare class OrganizationInfoValidationError extends OrganizationInfoValidationError_base<{
    message: string;
    cause?: unknown;
}> {
}
declare const OrganizationInfoAlreadyExistsError_base: new <A extends Record<string, any> = {}>(args: effect_Types.Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => effect_Cause.YieldableError & {
    readonly _tag: "OrganizationInfoAlreadyExistsError";
} & Readonly<A>;
/**
 * A create was attempted but a record already exists in the repo.
 * organization.info uses key=literal:self — only one record per repo.
 * Use upsertOrganizationInfo if you want create-or-update semantics.
 */
declare class OrganizationInfoAlreadyExistsError extends OrganizationInfoAlreadyExistsError_base<{
    /** AT-URI of the existing record */
    uri: string;
}> {
}
declare const OrganizationInfoNotFoundError_base: new <A extends Record<string, any> = {}>(args: effect_Types.Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => effect_Cause.YieldableError & {
    readonly _tag: "OrganizationInfoNotFoundError";
} & Readonly<A>;
/**
 * An update or upsert was attempted but no record exists in the repo,
 * and the operation requires one (i.e. plain update, not upsert).
 */
declare class OrganizationInfoNotFoundError extends OrganizationInfoNotFoundError_base<{
    /** DID or handle of the repo that was checked */
    repo: string;
}> {
}
declare const OrganizationInfoPdsError_base: new <A extends Record<string, any> = {}>(args: effect_Types.Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => effect_Cause.YieldableError & {
    readonly _tag: "OrganizationInfoPdsError";
} & Readonly<A>;
/**
 * The PDS rejected or failed to process the record operation.
 * Wraps the raw error from agent.com.atproto.repo.* calls.
 */
declare class OrganizationInfoPdsError extends OrganizationInfoPdsError_base<{
    message: string;
    cause?: unknown;
}> {
}

declare const DwcOccurrenceValidationError_base: new <A extends Record<string, any> = {}>(args: effect_Types.Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => effect_Cause.YieldableError & {
    readonly _tag: "DwcOccurrenceValidationError";
} & Readonly<A>;
declare class DwcOccurrenceValidationError extends DwcOccurrenceValidationError_base<{
    message: string;
    cause?: unknown;
}> {
}
declare const DwcOccurrencePdsError_base: new <A extends Record<string, any> = {}>(args: effect_Types.Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => effect_Cause.YieldableError & {
    readonly _tag: "DwcOccurrencePdsError";
} & Readonly<A>;
declare class DwcOccurrencePdsError extends DwcOccurrencePdsError_base<{
    message: string;
    cause?: unknown;
}> {
}

declare const DwcMeasurementValidationError_base: new <A extends Record<string, any> = {}>(args: effect_Types.Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => effect_Cause.YieldableError & {
    readonly _tag: "DwcMeasurementValidationError";
} & Readonly<A>;
declare class DwcMeasurementValidationError extends DwcMeasurementValidationError_base<{
    message: string;
    cause?: unknown;
}> {
}
declare const DwcMeasurementPdsError_base: new <A extends Record<string, any> = {}>(args: effect_Types.Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => effect_Cause.YieldableError & {
    readonly _tag: "DwcMeasurementPdsError";
} & Readonly<A>;
declare class DwcMeasurementPdsError extends DwcMeasurementPdsError_base<{
    message: string;
    cause?: unknown;
}> {
}

/** Returned by create / update / upsert. */
type CertifiedLocationMutationResult = RecordMutationResult<Main>;
type CreateCertifiedLocationInput = {
    /** Optional human-readable name for this location. */
    name?: string;
    /** Optional description for this location. */
    description?: string;
    /**
     * The GeoJSON shapefile for this location (application/geo+json, max 10MB).
     * The file content is parsed, validated, and uploaded as a blob.
     */
    shapefile: SerializableFile;
    /** Optional caller-supplied rkey. PDS assigns a TID if omitted. */
    rkey?: string;
};
type UpdateCertifiedLocationInput = {
    /** rkey of the existing record to update. */
    rkey: string;
    data: {
        /** Updated human-readable name. Omit to keep the existing value. */
        name?: string;
        /** Updated description. Omit to keep the existing value. */
        description?: string;
    };
    /**
     * Replacement GeoJSON file. If omitted the existing blob is preserved.
     * application/geo+json, max 10MB.
     */
    newShapefile?: SerializableFile;
};
/**
 * Semantically identical to CreateCertifiedLocationInput — all the same
 * fields, but communicates that create-or-update behaviour is intended.
 */
type UpsertCertifiedLocationInput = CreateCertifiedLocationInput;

/** Returned by setDefaultSite. */
type DefaultSiteMutationResult = SingletonMutationResult<Main$1>;
type SetDefaultSiteInput = {
    /**
     * Full AT-URI of the certified.location record to set as the default site.
     * Must be in the format `at://{did}/app.certified.location/{rkey}`.
     * The DID in the URI must match the authenticated user's DID — the location
     * must exist in the user's own PDS.
     */
    locationUri: string;
};

/** Returned by create / update / upsert. */
type LayerMutationResult = RecordMutationResult<Main$2>;
/** Known layer type identifiers from the lexicon. */
type LayerType = Main$2["type"];
type CreateLayerInput = {
    /** Layer display name (required, non-empty). */
    name: string;
    /** Layer type — determines how the data at `uri` is rendered. */
    type: LayerType;
    /** URL pointing to the layer data file or tile endpoint. */
    uri: string;
    /** Optional description. */
    description?: string;
    /** Optional caller-supplied rkey. PDS assigns a TID if omitted. */
    rkey?: string;
};
type UpdateLayerInput = {
    /** rkey of the existing record to update. */
    rkey: string;
    data: {
        /** Updated name. Omit to preserve existing value. */
        name?: string;
        /** Updated type. Omit to preserve existing value. */
        type?: LayerType;
        /** Updated URI. Omit to preserve existing value. */
        uri?: string;
        /** Updated description. Omit to preserve existing value. */
        description?: string;
    };
    /** Fields to explicitly remove from the record. */
    unset?: Array<"description">;
};
/**
 * Same shape as CreateLayerInput — communicates that create-or-update is
 * intended, with the full set of fields supplied each time.
 */
type UpsertLayerInput = CreateLayerInput;

/** Returned by create / update / upsert. */
type AudioRecordingMutationResult = RecordMutationResult<Main$3>;
/**
 * Technical audio metadata that the caller must supply.
 * Since `music-metadata` is not a dependency here, the calling application is
 * responsible for extracting these values from the audio file before passing
 * them to the mutation.
 */
type AudioTechnicalMetadata = {
    /** Audio codec (e.g. "MPEG 1 Layer 3", "AAC", "PCM"). */
    codec: string;
    /** Number of audio channels (1 = mono, 2 = stereo, …). */
    channels: number;
    /** Duration of the recording in seconds, as a string (e.g. "142.5"). */
    duration: string;
    /** Sample rate in Hz (e.g. 44100). */
    sampleRate: number;
};
type CreateAudioRecordingInput = {
    /** Short name / title for the recording. */
    name: string;
    /** Optional richtext description (text + optional facets). */
    description?: {
        text: string;
        facets?: unknown[];
    };
    /**
     * The audio file to upload (WAV, MP3, M4A, AAC, FLAC, OGG, Opus, WebM, AIFF).
     * Maximum 100 MB.
     */
    audioFile: SerializableFile;
    /** All technical + user metadata for the recording. */
    metadata: AudioTechnicalMetadata & {
        /** ISO 8601 datetime at which the audio was recorded. */
        recordedAt: string;
        /** Optional coordinates in "latitude,longitude" or "latitude,longitude,altitude" format. */
        coordinates?: string;
    };
    /** Optional caller-supplied rkey. PDS assigns a TID if omitted. */
    rkey?: string;
};
type UpdateAudioRecordingInput = {
    /** rkey of the existing record to update. */
    rkey: string;
    /**
     * User-visible metadata fields to update. These are always writable.
     * If `newAudioFile` is also provided, all technical metadata fields must be
     * supplied as well (they are re-derived from the new file).
     */
    data: {
        name?: string;
        description?: {
            text: string;
            facets?: unknown[];
        };
        metadata?: {
            recordedAt?: string;
            coordinates?: string;
        };
    };
    /**
     * Optional replacement audio file. When provided:
     * - `technicalMetadata` must also be supplied (codec, channels, duration, sampleRate).
     * - The existing blob is replaced.
     *
     * When omitted:
     * - The existing blob is preserved.
     * - The existing technical metadata (codec, channels, duration, sampleRate) is preserved.
     */
    newAudioFile?: SerializableFile;
    /**
     * Required when `newAudioFile` is provided.
     * Supplies the technical metadata for the new file.
     */
    newTechnicalMetadata?: AudioTechnicalMetadata;
};
/**
 * Same shape as CreateAudioRecordingInput — communicates create-or-update intent.
 */
type UpsertAudioRecordingInput = CreateAudioRecordingInput;

/** Input for createClaimActivity. rkey is optional — PDS assigns a TID when absent. */
type CreateClaimActivityInput = RecordCreateInput<Main$4>;
/** Input for updateClaimActivity. */
type UpdateClaimActivityInput = RecordUpdateInput<Main$4>;
/** Input for upsertClaimActivity — same full-replacement semantics as create. */
type UpsertClaimActivityInput = CreateClaimActivityInput;
/** Returned by create, update, and upsert on success. */
type ClaimActivityMutationResult = RecordMutationResult<Main$4>;

/**
 * Input for createFundingReceipt.
 *
 * `from` is technically required by the lexicon but semantically optional —
 * for anonymous donors, pass the donor's wallet address (0x...) as a free
 * string (stored in `notes`) and leave `from` as an empty string or omit
 * it. The receipt is immutable/append-only so there is no update or delete.
 *
 * `rkey` is optional — PDS assigns a TID when absent.
 */
type CreateFundingReceiptInput = RecordCreateInput<Main$5>;
/** Returned by createFundingReceipt on success. */
type FundingReceiptMutationResult = RecordMutationResult<Main$5>;

/**
 * Input for createLinkEvm.
 * rkey is optional — PDS assigns a TID when absent.
 */
type CreateLinkEvmInput = RecordCreateInput<Main$6>;
/**
 * Input for updateLinkEvm.
 * Only `name` is updatable — crypto proof fields are immutable.
 */
type UpdateLinkEvmInput = RecordUpdateInput<Pick<Main$6, "name">>;
/** Returned by create/update on success. */
type LinkEvmMutationResult = RecordMutationResult<Main$6>;

/**
 * Input for createFundingConfig.
 * rkey should match the rkey of the associated org.hypercerts.claim.activity record
 * to enable the shared-rkey join lookup in the indexer.
 */
type CreateFundingConfigInput = RecordCreateInput<Main$7>;
/** Input for updateFundingConfig. */
type UpdateFundingConfigInput = RecordUpdateInput<Main$7>;
/** Input for upsertFundingConfig — same full-replacement semantics as create. */
type UpsertFundingConfigInput = CreateFundingConfigInput;
/** Returned by create, update, and upsert on success. */
type FundingConfigMutationResult = RecordMutationResult<Main$7>;

/** Valid objective values — extracted from the record so they stay in sync with the lexicon. */
type Objective = Main$8["objectives"][number];
/** Input for createOrganizationInfo. */
type CreateOrganizationInfoInput = SingletonCreateInput<Main$8>;
/** Input for updateOrganizationInfo. */
type UpdateOrganizationInfoInput = SingletonUpdateInput<Main$8>;
/** Returned by create, update, and upsert on success. */
type OrganizationInfoMutationResult = SingletonMutationResult<Main$8>;

/** Returned by createDwcOccurrence. */
type DwcOccurrenceMutationResult = RecordMutationResult<Main$9>;
type CreateDwcOccurrenceInput = {
    scientificName: string;
    eventDate: string;
    decimalLatitude: string;
    decimalLongitude: string;
    basisOfRecord?: string;
    vernacularName?: string;
    recordedBy?: string;
    locality?: string;
    country?: string;
    countryCode?: string;
    occurrenceRemarks?: string;
    habitat?: string;
    samplingProtocol?: string;
    kingdom?: string;
    occurrenceID?: string;
    occurrenceStatus?: string;
    geodeticDatum?: string;
    license?: string;
    projectRef?: string;
    rkey?: string;
};

/** Returned by createDwcMeasurement. */
type DwcMeasurementMutationResult = RecordMutationResult<Main$a>;
type FloraMeasurementFields = {
    dbh?: string;
    totalHeight?: string;
    basalDiameter?: string;
    canopyCoverPercent?: string;
};
type CreateDwcMeasurementInput = {
    /** AT-URI to the parent occurrence record (required). */
    occurrenceRef: string;
    /** Flora measurement fields (sessile organisms: trees, plants, etc.). */
    flora: FloraMeasurementFields;
    /** The occurrenceID of the linked occurrence record (for cross-system interop). */
    occurrenceID?: string;
    /** Person(s) who performed the measurements. Pipe-delimited for multiple. */
    measuredBy?: string;
    /** Date the measurements were taken. ISO 8601 format. */
    measurementDate?: string;
    /** General protocol or method used. */
    measurementMethod?: string;
    /** Comments or notes about the measurement session. */
    measurementRemarks?: string;
    /** Optional caller-supplied rkey. PDS assigns a TID if omitted. */
    rkey?: string;
};

export { AtprotoAgent, type AudioRecordingMutationResult, AudioRecordingNotFoundError, AudioRecordingPdsError, AudioRecordingValidationError, type AudioTechnicalMetadata, type BlobConstraint, BlobUploadError, CertifiedLocationIsDefaultError, type CertifiedLocationMutationResult, CertifiedLocationNotFoundError, CertifiedLocationPdsError, CertifiedLocationValidationError, type ClaimActivityMutationResult, ClaimActivityNotFoundError, ClaimActivityPdsError, ClaimActivityValidationError, type Coordinates, type CreateAudioRecordingInput, type CreateCertifiedLocationInput, type CreateClaimActivityInput, type CreateDwcMeasurementInput, type CreateDwcOccurrenceInput, type CreateFundingConfigInput, type CreateFundingReceiptInput, type CreateLayerInput, type CreateLinkEvmInput, type CreateOrganizationInfoInput, type CredentialConfig, CredentialLoginError, DefaultSiteLocationNotFoundError, type DefaultSiteMutationResult, DefaultSitePdsError, DefaultSiteValidationError, type DeleteRecordInput, type DeleteRecordResult, type DwcMeasurementMutationResult, DwcMeasurementPdsError, DwcMeasurementValidationError, type DwcOccurrenceMutationResult, DwcOccurrencePdsError, DwcOccurrenceValidationError, type FieldLabels, FileConstraintError, type FileOrBlobRef, type FloraMeasurementFields, type FormattedError, type FundingConfigMutationResult, FundingConfigNotFoundError, FundingConfigPdsError, FundingConfigValidationError, type FundingReceiptMutationResult, FundingReceiptPdsError, FundingReceiptValidationError, GeoJsonProcessingError, GeoJsonValidationError, HECTARES_PER_SQUARE_METER, type LayerMutationResult, LayerNotFoundError, LayerPdsError, type LayerType, LayerValidationError, type LinkEvmMutationResult, LinkEvmNotFoundError, LinkEvmPdsError, LinkEvmValidationError, MutationError, type MutationResult, type Mutations, type Objective, OrganizationInfoAlreadyExistsError, type OrganizationInfoMutationResult, OrganizationInfoNotFoundError, OrganizationInfoPdsError, OrganizationInfoValidationError, type PolygonMetrics, type RecordCreateInput, type RecordFields, type RecordMutationResult, type RecordUpdateInput, type SerializableFile, type SetDefaultSiteInput, type SingletonCreateInput, type SingletonMutationResult, type SingletonUpdateInput, type UpdateAudioRecordingInput, type UpdateCertifiedLocationInput, type UpdateClaimActivityInput, type UpdateFundingConfigInput, type UpdateLayerInput, type UpdateLinkEvmInput, type UpdateOrganizationInfoInput, type UploadBlobInput, type UploadBlobResult, type UpsertAudioRecordingInput, type UpsertCertifiedLocationInput, type UpsertClaimActivityInput, type UpsertFundingConfigInput, type UpsertLayerInput, type ValidationIssue, type WithFileInputs, adapt, computePolygonMetrics, err, extractBlobConstraints, extractLineStringFeatures, extractPointFeatures, extractPolygonFeatures, formatMutationError, formatMutationErrorMessage, fromSerializableFile, isAnyBlobRef, makeCredentialAgentLayer, mimeMatches, mutations, normalizeBlobRef, ok, toFeatureCollection, toSerializableFile, validateGeojsonOrThrow };
