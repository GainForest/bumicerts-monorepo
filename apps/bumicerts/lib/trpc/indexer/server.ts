import { cache } from "react";
import { localQueryRouter } from "@/lib/trpc/query-router/router";

/**
 * Server caller for the indexer query router in React Server Components.
 * Cached per request via React's cache() — safe to call multiple times per render.
 *
 * No auth context needed — all indexer queries are public reads.
 *
 * @example
 * import { getIndexerCaller } from "@/lib/trpc/indexer/server";
 * const indexer = await getIndexerCaller();
 * const activities = await indexer.activities.list({ did });
 * const org = await indexer.organization.byDid({ did });
 */
export const getIndexerCaller = cache(async () => {
  return localQueryRouter.createCaller({});
});
