import { createServerCaller } from "@gainforest/atproto-mutations-next/trpc";
import { auth } from "@/lib/auth";

/**
 * Server caller for React Server Components — mutation router only.
 * Cached per request via React's cache() — safe to call multiple times per render.
 *
 * For indexer reads in RSC, use getIndexerCaller() from lib/trpc/indexer/server.ts.
 */
export const getServerCaller = createServerCaller(auth);
