/**
 * ATProto Mutations Setup
 *
 * Creates a mutations client for writing data to ATProto using the authenticated
 * user's OAuth session. Uses @gainforest/atproto-mutations-next with the auth
 * package's session management.
 *
 * @example
 * ```tsx
 * "use client";
 * import { useMutation } from "@tanstack/react-query";
 * import { mutations } from "@/lib/mutations";
 *
 * function MyComponent() {
 *   const { mutate, isPending } = useMutation({
 *     mutationFn: mutations.organization.info.upsert,
 *     onSuccess: ({ uri }) => console.log("Saved:", uri),
 *   });
 *
 *   return (
 *     <button onClick={() => mutate({ displayName: "My Org" })}>
 *       Save
 *     </button>
 *   );
 * }
 * ```
 */

import { createMutations } from "@gainforest/atproto-mutations-next/client";
import { makeUserAgentLayer } from "@gainforest/atproto-mutations-next/server";
import { auth } from "@/lib/auth";

/**
 * Mutations namespace for ATProto record operations.
 *
 * All mutations automatically use the authenticated user's session.
 * Throws MutationError on failure with typed error codes.
 *
 * Available namespaces:
 * - `mutations.organization.info.*` - Organization profile
 * - `mutations.organization.defaultSite.*` - Default location
 * - `mutations.organization.layer.*` - GeoJSON layers
 * - `mutations.organization.recordings.audio.*` - Audio recordings
 * - `mutations.claim.activity.*` - Hypercert activities (bumicerts)
 * - `mutations.certified.location.*` - Certified locations
 * - `mutations.blob.*` - Blob uploads
 */
export const mutations = createMutations(makeUserAgentLayer(auth));

// Re-export useful types and utilities
export { MutationError } from "@gainforest/atproto-mutations-next/client";
export {
  toSerializableFile,
  parseAtUri,
  computePolygonMetrics,
} from "@gainforest/atproto-mutations-next";
export type {
  SerializableFile,
  FileOrBlobRef,
  AtUri,
  PolygonMetrics,
} from "@gainforest/atproto-mutations-next";
