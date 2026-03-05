/**
 * ATProto Mutations Setup
 *
 * Creates a mutations client for writing data to ATProto using the authenticated
 * user's OAuth session. Uses @gainforest/atproto-mutations-next with the auth
 * package's session management.
 *
 * IMPORTANT: This module contains server-only code (auth session reading).
 * It is designed to be imported in server components, route handlers, and
 * server actions. The mutations themselves are server actions that can be
 * called from client components via React Query.
 *
 * @example
 * ```tsx
 * // In a server action file:
 * "use server";
 * import { mutations } from "@/lib/mutations";
 *
 * export async function createBumicert(input) {
 *   return mutations.claim.activity.create(input);
 * }
 * ```
 *
 * @example
 * ```tsx
 * // In a client component (via wrapper action):
 * "use client";
 * import { useMutation } from "@tanstack/react-query";
 * import { createBumicertAction } from "@/actions/bumicerts";
 *
 * function MyComponent() {
 *   const { mutate } = useMutation({ mutationFn: createBumicertAction });
 *   // ...
 * }
 * ```
 */

import "server-only";

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
