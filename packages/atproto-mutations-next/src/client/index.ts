// @gainforest/atproto-mutations-next/client
//
// Client-facing mutations namespace.
//
// Every function returned here is the adapt()-wrapped version of its
// corresponding raw server action. This means:
//   - It returns TData directly on success (not wrapped in MutationResult).
//   - It throws MutationError on failure, so React Query's onError fires
//     with a typed, structured error — not a generic Error.
//
// Because server actions in this package require an agent layer (injected at
// call time so there are no hidden env reads), the mutations namespace is
// created via a factory — call createMutations(agentLayer) once in your
// app's server layer setup, then import the resulting `mutations` object in
// client components.
//
// Typical setup in lib/mutations.ts in the consuming app:
//
//   import { createMutations } from "@gainforest/atproto-mutations-next/client";
//   import { makeUserAgentLayer } from "@gainforest/atproto-mutations-next/server";
//   import { oauthClient, sessionConfig } from "./auth";
//
//   export const mutations = createMutations(
//     makeUserAgentLayer({ oauthClient, sessionConfig })
//   );
//
// Then in a client component:
//
//   import { mutations } from "~/lib/mutations";
//   import { MutationError } from "@gainforest/atproto-mutations-next/client";
//
//   const { mutate } = useMutation({
//     mutationFn: mutations.upsertOrganizationInfo,
//     onSuccess: (result) => toast.success("Saved"),
//     onError: (e) => {
//       if (MutationError.isCode(e, "UNAUTHORIZED")) redirectToLogin();
//       if (MutationError.is(e)) toast.error(e.code);
//     },
//   });
//
// DO NOT use this on the server — import from ./actions or ./server instead.

import type { Layer } from "effect";
import { adapt } from "@gainforest/atproto-mutations-core";
import type {
  AtprotoAgent,
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
} from "@gainforest/atproto-mutations-core";
import {
  createOrganizationInfoAction,
  updateOrganizationInfoAction,
  upsertOrganizationInfoAction,
  createClaimActivityAction,
  updateClaimActivityAction,
  upsertClaimActivityAction,
  deleteClaimActivityAction,
  uploadBlobAction,
} from "../actions";
import type { UnauthorizedError, SessionExpiredError } from "../server";

export type AgentLayer = Layer.Layer<AtprotoAgent, UnauthorizedError | SessionExpiredError>;

export type Mutations = {
  // organization.info
  createOrganizationInfo: (input: CreateOrganizationInfoInput) => Promise<OrganizationInfoMutationResult>;
  updateOrganizationInfo: (input: UpdateOrganizationInfoInput) => Promise<OrganizationInfoMutationResult>;
  upsertOrganizationInfo: (input: CreateOrganizationInfoInput) => Promise<OrganizationInfoMutationResult & { created: boolean }>;
  // claim.activity
  createClaimActivity: (input: CreateClaimActivityInput) => Promise<ClaimActivityMutationResult>;
  updateClaimActivity: (input: UpdateClaimActivityInput) => Promise<ClaimActivityMutationResult>;
  upsertClaimActivity: (input: UpsertClaimActivityInput) => Promise<ClaimActivityMutationResult & { created: boolean }>;
  deleteClaimActivity: (input: DeleteRecordInput) => Promise<DeleteRecordResult>;
  // blob
  uploadBlob: (input: UploadBlobInput) => Promise<UploadBlobResult>;
};

/**
 * Create the client-side mutations namespace.
 *
 * Pass the agent layer that should be used for all mutations — typically
 * `makeUserAgentLayer({ oauthClient, sessionConfig })` from the server module.
 *
 * Call this once in your app's `lib/mutations.ts` and re-export the result.
 * Do not call it inside components or hooks — it captures the layer at creation
 * time and is stable across renders.
 */
export function createMutations(agentLayer: AgentLayer): Mutations {
  return {
    /**
     * Create a new app.gainforest.organization.info record.
     * Throws MutationError with code ALREADY_EXISTS if one already exists.
     * Prefer upsertOrganizationInfo for idempotent writes.
     */
    createOrganizationInfo: adapt((input: CreateOrganizationInfoInput) =>
      createOrganizationInfoAction(input, agentLayer)
    ),

    /**
     * Update an existing app.gainforest.organization.info record (partial patch).
     * Throws MutationError with code NOT_FOUND if no record exists.
     * Prefer upsertOrganizationInfo if you want create-or-update semantics.
     */
    updateOrganizationInfo: adapt((input: UpdateOrganizationInfoInput) =>
      updateOrganizationInfoAction(input, agentLayer)
    ),

    /**
     * Upsert an app.gainforest.organization.info record.
     * Creates if absent, fully replaces if present (preserving original createdAt).
     * Returns { uri, cid, record, created: boolean }.
     */
    upsertOrganizationInfo: adapt((input: CreateOrganizationInfoInput) =>
      upsertOrganizationInfoAction(input, agentLayer)
    ),

    // -----------------------------------------------------------------------
    // claim.activity
    // -----------------------------------------------------------------------

    /**
     * Create a new org.hypercerts.claim.activity record.
     * rkey is optional — a TID is generated if not provided.
     */
    createClaimActivity: adapt((input: CreateClaimActivityInput) =>
      createClaimActivityAction(input, agentLayer)
    ),

    /**
     * Update an existing org.hypercerts.claim.activity record (partial patch).
     * Throws MutationError with code NOT_FOUND if no record exists at input.rkey.
     */
    updateClaimActivity: adapt((input: UpdateClaimActivityInput) =>
      updateClaimActivityAction(input, agentLayer)
    ),

    /**
     * Upsert an org.hypercerts.claim.activity record.
     * No rkey → always creates. rkey present → creates or replaces.
     * Returns { uri, cid, rkey, record, created: boolean }.
     */
    upsertClaimActivity: adapt((input: UpsertClaimActivityInput) =>
      upsertClaimActivityAction(input, agentLayer)
    ),

    /**
     * Delete an org.hypercerts.claim.activity record.
     * Throws MutationError with code NOT_FOUND if no record exists at input.rkey.
     */
    deleteClaimActivity: adapt((input: DeleteRecordInput) =>
      deleteClaimActivityAction(input, agentLayer)
    ),

    // -----------------------------------------------------------------------
    // blob
    // -----------------------------------------------------------------------

    /**
     * Upload a blob to the authenticated user's PDS.
     * Returns the BlobRef that can be embedded in subsequent record writes.
     */
    uploadBlob: adapt((input: UploadBlobInput) => uploadBlobAction(input, agentLayer)),
  } as const;
}

// Re-export adapt and MutationError so consumers don't need a separate import
// from core just to handle errors or wrap their own actions.
export { adapt } from "@gainforest/atproto-mutations-core";
export { MutationError } from "@gainforest/atproto-mutations-core";
