import { createServerCaller } from "@gainforest/atproto-mutations-next/trpc";
import { auth } from "@/lib/auth";

/**
 * Server caller for React Server Components.
 * Cached per request via React's cache() — safe to call multiple times per render.
 *
 * @example
 * const caller = await getServerCaller();
 * const bumicert = await caller.claim.activity.create({ ... });
 */
export const getServerCaller = createServerCaller(auth);
