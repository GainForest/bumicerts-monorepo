# `@gainforest/atproto-mutations-next`

ATProto mutations for Next.js. Wraps `@gainforest/atproto-mutations-core` with Next.js server actions, OAuth session integration, and a client-side mutations namespace ready for React Query's `useMutation`.

---

## Contents

- [Installation](#installation)
- [Package exports](#package-exports)
- [Architecture overview](#architecture-overview)
- [Setup](#setup)
  - [1. Create an agent layer](#1-create-an-agent-layer)
  - [2. Create the mutations namespace](#2-create-the-mutations-namespace)
  - [3. Use in client components](#3-use-in-client-components)
- [Server-to-server composition](#server-to-server-composition)
- [Available mutations](#available-mutations)
  - [organization.info](#organizationinfo)
  - [claim.activity](#claimactivity)
  - [certified.location](#certifiedlocation)
  - [organization.defaultSite](#organizationdefaultsite)
  - [organization.layer](#organizationlayer)
  - [organization.recordings.audio](#organizationrecordingsaudio)
  - [Blob upload](#blob-upload)
- [Error handling](#error-handling)
  - [In client components](#in-client-components)
  - [Error codes reference](#error-codes-reference)
- [File / blob inputs](#file--blob-inputs)
- [Service-account mutations (no OAuth)](#service-account-mutations-no-oauth)

---

## Installation

```bash
bun add @gainforest/atproto-mutations-next
# or
npm install @gainforest/atproto-mutations-next
```

Peer dependencies: `next >= 14`, `typescript >= 5`.

---

## Package exports

| Import path | Use when |
|---|---|
| `@gainforest/atproto-mutations-next` | Types and primitives safe to import anywhere (server + client) |
| `@gainforest/atproto-mutations-next/actions` | Raw server actions that return `MutationResult` — server-to-server composition |
| `@gainforest/atproto-mutations-next/server` | Layer construction (`makeUserAgentLayer`, `makeServiceAgentLayer`) |
| `@gainforest/atproto-mutations-next/client` | `createMutations()` factory + `MutationError` — for React Query `useMutation` |

---

## Architecture overview

```
Client component
  └── useMutation({ mutationFn: mutations.upsertOrganizationInfo })
        │
        ▼
  mutations namespace          ← createMutations(agentLayer)  [/client]
  (adapt()-wrapped fns)
        │  throws MutationError on failure
        ▼
  Server actions               ← *Action functions            [/actions]
  (return MutationResult)      ← "use server"
        │
        ▼
  Effect mutation (core)       ← createOrganizationInfo()     [@gainforest/atproto-mutations-core]
        │  requires AtprotoAgent
        ▼
  Agent layer                  ← makeUserAgentLayer()          [/server]
  (OAuth session → Agent)
```

The agent layer is passed **explicitly at call time** — there are no hidden `process.env` reads inside this package. You own the auth wiring in your app.

---

## Setup

### 1. Create an agent layer

In a server module (e.g. `lib/auth.ts` or `lib/agent.ts`):

```ts
// lib/agent.ts  (server-only)
import { makeUserAgentLayer } from "@gainforest/atproto-mutations-next/server";
import { oauthClient } from "./oauth";         // your NodeOAuthClient
import { sessionConfig } from "./session";     // your iron-session SessionConfig

export function getUserAgentLayer() {
  return makeUserAgentLayer({ oauthClient, sessionConfig });
}
```

`makeUserAgentLayer` reads the user's DID from the iron-session cookie and restores the OAuth session. It fails with:
- `UnauthorizedError` — no session / user is not logged in
- `SessionExpiredError` — session exists but OAuth token could not be restored

### 2. Create the mutations namespace

Create the namespace **once** in a server module. Do not call `createMutations` inside a component or hook — it captures the layer at creation time and is stable.

```ts
// lib/mutations.ts  (server-only)
import { createMutations } from "@gainforest/atproto-mutations-next/client";
import { getUserAgentLayer } from "./agent";

export const mutations = createMutations(getUserAgentLayer());
```

### 3. Use in client components

```tsx
// components/OrgForm.tsx  ("use client")
"use client";

import { useMutation } from "@tanstack/react-query";
import { mutations } from "~/lib/mutations";
import { MutationError } from "@gainforest/atproto-mutations-next/client";

export function OrgForm() {
  const { mutate, isPending } = useMutation({
    mutationFn: mutations.upsertOrganizationInfo,
    onSuccess: ({ uri, record }) => {
      console.log("Saved at", uri);
    },
    onError: (e) => {
      if (MutationError.isCode(e, "UNAUTHORIZED")) {
        router.push("/login");
        return;
      }
      if (MutationError.isCode(e, "INVALID_RECORD")) {
        setFormError(e.message);
        return;
      }
      if (MutationError.is(e)) {
        toast.error(`Error: ${e.code} — ${e.message}`);
      }
    },
  });

  return (
    <form onSubmit={(ev) => {
      ev.preventDefault();
      mutate({
        displayName: "GainForest",
        objectives: ["Conservation"],
        startDate: "2020-01-01",
      });
    }}>
      <button type="submit" disabled={isPending}>Save</button>
    </form>
  );
}
```

---

## Server-to-server composition

When you need to call one mutation from another (e.g. a post-signup flow that creates an org and then sets a default site), import from `/actions` directly. These functions return `MutationResult` and never throw domain errors:

```ts
// app/api/onboarding/route.ts  (Route Handler)
import {
  upsertOrganizationInfoAction,
  setDefaultSiteAction,
} from "@gainforest/atproto-mutations-next/actions";
import { getUserAgentLayer } from "~/lib/agent";

export async function POST(req: Request) {
  const agentLayer = getUserAgentLayer();
  const body = await req.json();

  const orgResult = await upsertOrganizationInfoAction(body.org, agentLayer);
  if (!orgResult.success) {
    return Response.json({ error: orgResult.code, message: orgResult.message }, { status: 400 });
  }

  if (body.defaultLocationUri) {
    const siteResult = await setDefaultSiteAction(
      { locationUri: body.defaultLocationUri },
      agentLayer
    );
    if (!siteResult.success) {
      // partial success — org created but default site not set
      return Response.json({ warning: siteResult.code, org: orgResult.data }, { status: 207 });
    }
  }

  return Response.json({ org: orgResult.data });
}
```

---

## Available mutations

All functions are available both in the `mutations` namespace (via `createMutations`) and as standalone `*Action` functions from `/actions`.

### organization.info

Singleton per user (`app.gainforest.organization.info`).

```ts
mutations.createOrganizationInfo(input)  // fails if already exists
mutations.updateOrganizationInfo(input)  // partial patch; fails if not found
mutations.upsertOrganizationInfo(input)  // create-or-replace (preferred)
```

**Input fields:** `displayName` (required), `objectives`, `startDate`, `website`, `coverImage`, `logo`, and more — see `CreateOrganizationInfoInput`.

### claim.activity

Per-rkey records (`org.hypercerts.claim.activity`).

```ts
mutations.createClaimActivity(input)              // rkey auto-generated if absent
mutations.updateClaimActivity({ rkey, data })     // partial patch
mutations.upsertClaimActivity({ rkey?, ...rest }) // no rkey → always creates
mutations.deleteClaimActivity({ rkey })
```

### certified.location

Per-rkey records (`app.certified.location`). Requires a GeoJSON shapefile blob.

```ts
mutations.createCertifiedLocation({ name, shapefile, ... })
mutations.updateCertifiedLocation({ rkey, data, newShapefile? })
mutations.upsertCertifiedLocation({ rkey?, name, shapefile, ... })
mutations.deleteCertifiedLocation({ rkey })
// ↑ Throws MutationError("IS_DEFAULT") if this location is the org's default site.
//   Set a different default first, then delete.
```

### organization.defaultSite

Singleton per user (`app.gainforest.organization.defaultSite`). **No delete** — set-only.

```ts
mutations.setDefaultSite({
  locationUri: "at://did:plc:abc123/app.certified.location/rkey123",
})
```

The referenced `certified.location` must exist in the same user's PDS (DID in the URI must match the authenticated user).

### organization.layer

Per-rkey records (`app.gainforest.organization.layer`). No blob fields.

```ts
mutations.createLayer({ name, type, url, ... })
mutations.updateLayer({ rkey, data, unset? })   // unset: string[] removes optional fields
mutations.upsertLayer({ rkey?, name, type, ... })
mutations.deleteLayer({ rkey })
```

**Valid `type` values:** `"geojson_points"` · `"geojson_points_trees"` · `"geojson_line"` · `"choropleth"` · `"choropleth_shannon"` · `"raster_tif"` · `"tms_tile"`

### organization.recordings.audio

Per-rkey records (`app.gainforest.organization.recordings.audio`). Audio blob + technical metadata.

```ts
mutations.createAudioRecording({
  name: "Dawn chorus",
  audioFile: serializableFile,
  metadata: {
    codec: "pcm",
    channels: 1,
    duration: "PT5M30S",   // ISO 8601
    sampleRate: 44100,
    recordedAt: "2024-06-15T05:30:00Z",
  },
})

mutations.updateAudioRecording({
  rkey,
  data: { name: "Updated name", metadata: { coordinates: "-3.1,-60.5" } },
  newAudioFile: replacementFile,          // optional — also requires:
  newTechnicalMetadata: { codec, ... },   // required when newAudioFile is set
})

mutations.upsertAudioRecording({ rkey?, name, audioFile, metadata })
mutations.deleteAudioRecording({ rkey })
```

### Blob upload

Pre-upload a blob to the authenticated user's PDS before attaching it to a record:

```ts
const blobRef = await mutations.uploadBlob({ file: serializableFile });
// blobRef can be passed as the file field in a subsequent createCertifiedLocation call
```

---

## Error handling

### In client components

`MutationError` is a typed `Error` subclass thrown by every `mutations.*` function on failure. Use React Query's `onError` callback to handle it:

```ts
import { MutationError } from "@gainforest/atproto-mutations-next/client";

onError: (e) => {
  // Type-narrow to MutationError
  if (!MutationError.is(e)) return;

  // Match a specific code
  if (MutationError.isCode(e, "UNAUTHORIZED")) {
    router.push("/login");
  } else if (MutationError.isCode(e, "INVALID_RECORD")) {
    setFieldError(e.message);
  } else {
    toast.error(e.message);
  }
},
```

`e.code` is a string literal from the error code union for the relevant entity (see table below). `e.message` is a human-readable description.

### Error codes reference

| Code | Meaning |
|---|---|
| `UNAUTHORIZED` | No active session — redirect to login |
| `SESSION_EXPIRED` | OAuth session expired — redirect to login |
| `NOT_FOUND` | Record does not exist at the given rkey |
| `ALREADY_EXISTS` | Record already exists (only `createOrganizationInfo`) |
| `INVALID_RECORD` | Lexicon validation failed — check `e.message` for field details |
| `FILE_CONSTRAINT` | File too large or wrong MIME type |
| `BLOB_UPLOAD_ERROR` | PDS rejected the blob upload |
| `INVALID_GEOJSON` | GeoJSON file failed structural validation |
| `GEOJSON_PROCESSING` | GeoJSON parsed successfully but has no polygon geometry |
| `IS_DEFAULT` | Cannot delete a `certified.location` set as the org's default site |
| `PDS_ERROR` | Unexpected PDS error — check `e.message` for details |

---

## File / blob inputs

Browser `File` objects cannot cross the Next.js server action boundary directly. Convert them to `SerializableFile` on the client before passing to a mutation:

```tsx
"use client";
import { toSerializableFile } from "@gainforest/atproto-mutations-next";

// In an onChange handler or form submit
const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const serializable = toSerializableFile(file);  // safe to pass to server actions
  mutate({ audioFile: serializable, name: "Recording", metadata: { ... } });
};
```

Existing `BlobRef` objects returned from a previous record read are accepted as-is — no re-upload needed.

---

## Service-account mutations (no OAuth)

For background jobs, admin scripts, or server-initiated writes that don't involve a user session, build a layer from a credential-authenticated agent:

```ts
import { Effect } from "effect";
import { makeServiceAgentLayer } from "@gainforest/atproto-mutations-next/server";
import { makeCredentialAgentLayer } from "@gainforest/atproto-mutations-next";
import {
  upsertOrganizationInfoAction,
} from "@gainforest/atproto-mutations-next/actions";

// Option A — use makeCredentialAgentLayer (from core, re-exported by next's root)
const layer = makeCredentialAgentLayer({
  service: "gainforest.id",
  identifier: "service-account.gainforest.id",
  password: process.env.SERVICE_ACCOUNT_PASSWORD!,
});

const result = await upsertOrganizationInfoAction(input, layer);

// Option B — bring your own Agent, wrap with makeServiceAgentLayer
import { Agent, CredentialSession } from "@atproto/api";

const session = new CredentialSession(new URL("https://gainforest.id"));
await session.login({ identifier: "...", password: "..." });
const serviceLayer = makeServiceAgentLayer(new Agent(session));

const result2 = await upsertOrganizationInfoAction(input, serviceLayer);
```
