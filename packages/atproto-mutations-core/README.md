# `@gainforest/atproto-mutations-core`

Framework-agnostic ATProto mutation primitives. Typed results, structured errors, and Effect-based services — usable in any environment: Node scripts, Bun workers, serverless functions, or as the foundation for `@gainforest/atproto-mutations-next`.

---

## Contents

- [Installation](#installation)
- [Concepts](#concepts)
  - [MutationResult](#mutationresult)
  - [AtprotoAgent layer](#atprotoagent-layer)
  - [Effect operations](#effect-operations)
- [Authentication](#authentication)
  - [Credential (username/password)](#credential-usernamepassword)
- [Running a mutation](#running-a-mutation)
- [Entities](#entities)
  - [organization.info](#organizationinfo)
  - [claim.activity](#claimactivity)
  - [certified.location](#certifiedlocation)
  - [organization.defaultSite](#organizationdefaultsite)
  - [organization.layer](#organizationlayer)
  - [organization.recordings.audio](#organizationrecordingsaudio)
- [Blob / file handling](#blob--file-handling)
  - [SerializableFile](#serializablefile)
  - [Standalone blob upload](#standalone-blob-upload)
- [GeoJSON utilities](#geojson-utilities)
- [Error handling](#error-handling)
- [adapt()](#adapt)

---

## Installation

```bash
bun add @gainforest/atproto-mutations-core
# or
npm install @gainforest/atproto-mutations-core
```

---

## Concepts

### MutationResult

Every Effect operation in this package produces a value that, when run, resolves to a `MutationResult<TData, TCode>`:

```ts
type MutationResult<TData, TCode extends string> =
  | { success: true; data: TData }
  | { success: false; code: TCode; message: string };
```

Construct results with the provided helpers:

```ts
import { ok, err } from "@gainforest/atproto-mutations-core";

ok({ uri, cid, record });          // success branch
err("NOT_FOUND", "No record");     // failure branch
```

### AtprotoAgent layer

All mutation Effects depend on the `AtprotoAgent` service, which is an `@atproto/api` `Agent` instance. You provide the agent by constructing a Layer and passing it to `Effect.runPromise`:

```ts
import { Effect } from "effect";
import { createOrganizationInfo, makeCredentialAgentLayer } from "@gainforest/atproto-mutations-core";

const layer = makeCredentialAgentLayer({
  service: "bsky.social",
  identifier: "alice.bsky.social",
  password: "app-password",
});

const result = await Effect.runPromise(
  createOrganizationInfo(input).pipe(Effect.provide(layer))
);
```

### Effect operations

All mutation functions return `Effect.Effect<TData, TError, AtprotoAgent>`. They are pure descriptions of work — nothing runs until you call `Effect.runPromise` (or `Effect.runSync`). Chain, map, and compose them freely before running:

```ts
const program = createOrganizationInfo(input).pipe(
  Effect.map((result) => ({ ...result, extra: "data" })),
  Effect.catchTag("OrganizationInfoValidationError", (e) =>
    Effect.fail(new MyAppError(e.message))
  ),
  Effect.provide(layer),
);

const data = await Effect.runPromise(program);
```

---

## Authentication

### Credential (username/password)

Use `makeCredentialAgentLayer` for scripts, service accounts, workers, or tests where you have a direct handle + app-password:

```ts
import { Effect } from "effect";
import {
  makeCredentialAgentLayer,
  CredentialLoginError,
  upsertOrganizationInfo,
} from "@gainforest/atproto-mutations-core";

const layer = makeCredentialAgentLayer({
  service: "bsky.social",      // PDS hostname (no https://)
  identifier: "alice.bsky.social",
  password: "xxxx-xxxx-xxxx-xxxx",
});

// The layer itself may fail with CredentialLoginError if credentials are wrong.
const result = await Effect.runPromise(
  upsertOrganizationInfo({ displayName: "Alice's Org", objectives: ["Conservation"] }).pipe(
    Effect.provide(layer)
  )
);
```

For OAuth-based authentication in a Next.js app, use `makeUserAgentLayer` from `@gainforest/atproto-mutations-next/server` instead.

---

## Running a mutation

The full lifecycle for a single mutation in a standalone script:

```ts
import { Effect } from "effect";
import {
  makeCredentialAgentLayer,
  upsertOrganizationInfo,
  OrganizationInfoValidationError,
  FileConstraintError,
} from "@gainforest/atproto-mutations-core";

const layer = makeCredentialAgentLayer({
  service: "gainforest.id",
  identifier: "myorg.gainforest.id",
  password: process.env.ATPROTO_PASSWORD!,
});

const result = await Effect.runPromise(
  upsertOrganizationInfo({
    displayName: "GainForest",
    objectives: ["Conservation", "Community"],
  }).pipe(
    Effect.map((r) => ({ success: true as const, data: r })),
    Effect.catchAll((e) => Effect.succeed({ success: false as const, error: e })),
    Effect.provide(layer),
  )
);

if (!result.success) {
  console.error("Failed:", result.error);
} else {
  console.log("URI:", result.data.uri);
}
```

---

## Entities

### organization.info

Singleton record (`app.gainforest.organization.info`). One per PDS user.

```ts
import {
  createOrganizationInfo,
  updateOrganizationInfo,
  upsertOrganizationInfo,
  type CreateOrganizationInfoInput,
  type UpdateOrganizationInfoInput,
} from "@gainforest/atproto-mutations-core";

// Create — fails with OrganizationInfoAlreadyExistsError if one already exists
await Effect.runPromise(
  createOrganizationInfo({
    displayName: "GainForest",
    objectives: ["Conservation"],
    startDate: "2020-01-01",
  }).pipe(Effect.provide(layer))
);

// Update — partial patch, fails with OrganizationInfoNotFoundError if absent
await Effect.runPromise(
  updateOrganizationInfo({
    data: { displayName: "GainForest (Updated)" },
  }).pipe(Effect.provide(layer))
);

// Upsert — creates or fully replaces (preserves original createdAt)
const { uri, cid, record, created } = await Effect.runPromise(
  upsertOrganizationInfo({
    displayName: "GainForest",
    objectives: ["Conservation"],
    startDate: "2020-01-01",
  }).pipe(Effect.provide(layer))
);
```

**Possible errors:** `OrganizationInfoAlreadyExistsError`, `OrganizationInfoNotFoundError`, `OrganizationInfoValidationError`, `OrganizationInfoPdsError`, `FileConstraintError`, `BlobUploadError`

---

### claim.activity

Per-rkey records (`org.hypercerts.claim.activity`). Multiple per user.

```ts
import {
  createClaimActivity,
  updateClaimActivity,
  upsertClaimActivity,
  deleteClaimActivity,
  type CreateClaimActivityInput,
} from "@gainforest/atproto-mutations-core";

// Create — rkey is optional (a TID is auto-generated if absent)
const { uri, cid, rkey } = await Effect.runPromise(
  createClaimActivity({
    title: "Tree planting Q1",
    startDate: "2024-01-01",
    endDate: "2024-03-31",
  }).pipe(Effect.provide(layer))
);

// Update — partial patch by rkey
await Effect.runPromise(
  updateClaimActivity({
    rkey,
    data: { title: "Tree planting Q1 (revised)" },
  }).pipe(Effect.provide(layer))
);

// Upsert — no rkey always creates; with rkey creates-or-replaces
const { created } = await Effect.runPromise(
  upsertClaimActivity({
    rkey: "my-stable-rkey",
    title: "Tree planting Q1",
    startDate: "2024-01-01",
    endDate: "2024-03-31",
  }).pipe(Effect.provide(layer))
);

// Delete
await Effect.runPromise(
  deleteClaimActivity({ rkey }).pipe(Effect.provide(layer))
);
```

**Possible errors:** `ClaimActivityValidationError`, `ClaimActivityNotFoundError`, `ClaimActivityPdsError`, `FileConstraintError`, `BlobUploadError`

---

### certified.location

Per-rkey records (`app.certified.location`). Holds a GeoJSON shapefile blob and computed polygon metrics.

```ts
import {
  createCertifiedLocation,
  updateCertifiedLocation,
  upsertCertifiedLocation,
  deleteCertifiedLocation,
  type CreateCertifiedLocationInput,
  toSerializableFile,
} from "@gainforest/atproto-mutations-core";

// The shapefile must be a GeoJSON file (MIME: application/geo+json, max 10 MB)
const shapefileBytes = await fs.readFile("boundary.geojson");
const shapefile = toSerializableFile(
  new File([shapefileBytes], "boundary.geojson", { type: "application/geo+json" })
);

// Create
const { uri, cid, rkey, record } = await Effect.runPromise(
  createCertifiedLocation({
    name: "Amazon Reserve A",
    shapefile,
  }).pipe(Effect.provide(layer))
);

// Update — supply newShapefile to replace the blob, or omit to patch metadata only
await Effect.runPromise(
  updateCertifiedLocation({
    rkey,
    data: { name: "Amazon Reserve A (revised)" },
    // newShapefile: updatedShapefile,  // optional
  }).pipe(Effect.provide(layer))
);

// Delete — fails with CertifiedLocationIsDefaultError if set as the org's default site
await Effect.runPromise(
  deleteCertifiedLocation({ rkey }).pipe(Effect.provide(layer))
);
```

**Possible errors:** `CertifiedLocationValidationError`, `CertifiedLocationNotFoundError`, `CertifiedLocationIsDefaultError`, `CertifiedLocationPdsError`, `GeoJsonValidationError`, `GeoJsonProcessingError`, `FileConstraintError`, `BlobUploadError`

---

### organization.defaultSite

Singleton (`app.gainforest.organization.defaultSite`). Points to a `certified.location` record. **Set-only — no delete operation.**

```ts
import {
  setDefaultSite,
  type SetDefaultSiteInput,
} from "@gainforest/atproto-mutations-core";

// The locationUri must be an AT-URI for a certified.location in the same user's PDS
await Effect.runPromise(
  setDefaultSite({
    locationUri: "at://did:plc:abc123/app.certified.location/rkey123",
  }).pipe(Effect.provide(layer))
);
```

**Validation:** The DID in `locationUri` must match the authenticated user's DID, and the referenced record must exist.

**Possible errors:** `DefaultSiteValidationError`, `DefaultSiteLocationNotFoundError`, `DefaultSitePdsError`

---

### organization.layer

Per-rkey records (`app.gainforest.organization.layer`). Map layer definitions (no blob fields).

```ts
import {
  createLayer,
  updateLayer,
  upsertLayer,
  deleteLayer,
  type CreateLayerInput,
  type LayerType,
} from "@gainforest/atproto-mutations-core";

// Valid types: "geojson_points" | "geojson_points_trees" | "geojson_line"
//            | "choropleth" | "choropleth_shannon" | "raster_tif" | "tms_tile"
const { rkey } = await Effect.runPromise(
  createLayer({
    name: "Canopy cover 2024",
    type: "raster_tif",
    url: "https://tiles.example.com/canopy/{z}/{x}/{y}.tif",
  }).pipe(Effect.provide(layer))
);

// Update — partial patch; use unset: ["description"] to remove optional fields
await Effect.runPromise(
  updateLayer({
    rkey,
    data: { name: "Canopy cover 2024 (v2)" },
    unset: ["description"],
  }).pipe(Effect.provide(layer))
);

await Effect.runPromise(
  deleteLayer({ rkey }).pipe(Effect.provide(layer))
);
```

**Possible errors:** `LayerValidationError`, `LayerNotFoundError`, `LayerPdsError`

---

### organization.recordings.audio

Per-rkey records (`app.gainforest.organization.recordings.audio`). Audio recordings with technical metadata.

```ts
import {
  createAudioRecording,
  updateAudioRecording,
  upsertAudioRecording,
  deleteAudioRecording,
  type CreateAudioRecordingInput,
  toSerializableFile,
} from "@gainforest/atproto-mutations-core";

const audioFile = toSerializableFile(
  new File([audioBytes], "recording.wav", { type: "audio/wav" })
);

// Create — audioFile + all metadata required
const { rkey } = await Effect.runPromise(
  createAudioRecording({
    name: "Dawn chorus site A",
    audioFile,
    metadata: {
      codec: "pcm",
      channels: 1,
      duration: "PT5M30S",   // ISO 8601 duration
      sampleRate: 44100,
      recordedAt: "2024-06-15T05:30:00Z",
      coordinates: "-3.1234,-60.5678",
    },
  }).pipe(Effect.provide(layer))
);

// Update — omit newAudioFile to patch metadata only;
//          supply newAudioFile + newTechnicalMetadata to replace the blob
await Effect.runPromise(
  updateAudioRecording({
    rkey,
    data: {
      name: "Dawn chorus site A (corrected)",
      metadata: { coordinates: "-3.1235,-60.5679" },
    },
    // newAudioFile: replacementFile,           // optional
    // newTechnicalMetadata: { ... },           // required when newAudioFile is set
  }).pipe(Effect.provide(layer))
);

await Effect.runPromise(
  deleteAudioRecording({ rkey }).pipe(Effect.provide(layer))
);
```

**Accepted audio MIME types:** `audio/wav`, `audio/x-wav`, `audio/vnd.wave`, `audio/mpeg`, `audio/mp3`, `audio/mp4`, `audio/x-m4a`, `audio/aac`, `audio/flac`, `audio/x-flac`, `audio/ogg`, `audio/opus`, `audio/webm`, `audio/aiff`, `audio/x-aiff` (max 100 MB)

**Possible errors:** `AudioRecordingValidationError`, `AudioRecordingNotFoundError`, `AudioRecordingPdsError`, `FileConstraintError`, `BlobUploadError`

---

## Blob / file handling

### SerializableFile

Browser `File` / `Blob` objects cannot cross the Next.js server action boundary. `SerializableFile` is a plain-object form that can:

```ts
import { toSerializableFile, fromSerializableFile } from "@gainforest/atproto-mutations-core";

// Client side — convert before passing to a server action
const serializableFile = toSerializableFile(fileInputElement.files[0]);

// Server side — get back the raw bytes for upload
const bytes = fromSerializableFile(serializableFile);
```

Any mutation input field that accepts a file accepts either a `File`, `Blob`, or `SerializableFile`. Existing `BlobRef` objects (from a previous read) are also accepted and passed through as-is.

### Standalone blob upload

For advanced pre-upload scenarios (e.g. uploading before a form is submitted):

```ts
import { Effect } from "effect";
import { uploadBlob, toSerializableFile } from "@gainforest/atproto-mutations-core";

const { ref, mimeType, size } = await Effect.runPromise(
  uploadBlob({ file: toSerializableFile(file) }).pipe(Effect.provide(layer))
);
// ref is a BlobRef that can be used in subsequent record writes
```

---

## GeoJSON utilities

Used internally by `certified.location` but also exported for standalone use:

```ts
import {
  validateGeojsonOrThrow,
  computePolygonMetrics,
  GeoJsonValidationError,
  GeoJsonProcessingError,
} from "@gainforest/atproto-mutations-core";

// Parse + validate a GeoJSON string or object — throws GeoJsonValidationError
const geojson = validateGeojsonOrThrow(jsonString);

// Compute area and perimeter for the first polygon in the feature collection
const { areaHectares, perimeterKm, centroid } = computePolygonMetrics(geojson);
```

---

## Error handling

All errors are typed Effect tagged errors. In a plain `Effect.runPromise` call they surface as thrown values; use `Effect.catchTag` / `Effect.catchAll` to handle them in the Effect pipeline:

```ts
import { Effect } from "effect";
import {
  upsertOrganizationInfo,
  OrganizationInfoValidationError,
} from "@gainforest/atproto-mutations-core";

const result = await Effect.runPromise(
  upsertOrganizationInfo(input).pipe(
    Effect.catchTag("OrganizationInfoValidationError", (e) =>
      // handle validation error; return a fallback Effect or re-fail
      Effect.fail(new Error(`Validation: ${e.message}`))
    ),
    Effect.provide(layer),
  )
);
```

All error classes follow the naming convention `<EntityName><ErrorType>Error`, e.g.:
- `OrganizationInfoValidationError`
- `ClaimActivityNotFoundError`
- `CertifiedLocationIsDefaultError`
- `GeoJsonValidationError`
- `FileConstraintError` / `BlobUploadError` (shared, for any file-bearing entity)

---

## adapt()

`adapt()` converts a `MutationResult`-returning function into one that **throws `MutationError` on failure** and **returns `TData` directly on success**. This is what powers the client namespace in `@gainforest/atproto-mutations-next/client` and makes mutations suitable for React Query's `mutationFn`:

```ts
import { adapt, MutationError } from "@gainforest/atproto-mutations-core";

// Wrap your own server action (must return MutationResult)
const myMutationFn = adapt(myServerAction);

// In a React Query mutation
const { mutate } = useMutation({
  mutationFn: myMutationFn,
  onSuccess: (data) => console.log(data),   // TData, not MutationResult
  onError: (e) => {
    if (MutationError.isCode(e, "UNAUTHORIZED")) redirectToLogin();
    if (MutationError.is(e)) toast.error(e.code);
  },
});
```
