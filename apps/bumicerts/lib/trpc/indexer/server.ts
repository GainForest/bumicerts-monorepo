import { cache } from "react";
import { localQueryRouter } from "@/lib/trpc/query-router/router";

/**
 * Server caller for the indexer query router in React Server Components.
 * Cached per request via React's cache() — safe to call multiple times per render.
 *
 * Most indexer queries are public reads. Session-aware procedures (such as
 * account.current) can receive the signed-in DID when needed.
 *
 * @example
 * import { getIndexerCaller } from "@/lib/trpc/indexer/server";
 * const indexer = await getIndexerCaller();
 * const activities = await indexer.activities.list({ did });
 * const defaultSite = await indexer.organization.defaultSite({ did });
 */
export const getIndexerCaller = cache(async (sessionDid: string | null = null) => {
  return localQueryRouter.createCaller({ sessionDid });
});
