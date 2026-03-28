"use client";

import { createContext } from "react";
import { createTRPCReact } from "@trpc/react-query";
import type { LocalQueryRouter } from "@/lib/trpc/query-router/router";

/**
 * Dedicated React context for the indexer tRPC client.
 *
 * By default, every `createTRPCReact()` instance shares a single module-level
 * `TRPCContext` from @trpc/react-query.  When two Providers are nested (mutations
 * inside indexer, or vice-versa), the inner Provider silently overwrites the
 * outer one's context value.  This caused mutations to be sent to the indexer
 * endpoint (/api/indexer/trpc) instead of the mutations endpoint (/api/trpc),
 * producing "No procedure found" 404 errors (ECO-363).
 *
 * Passing a separate context isolates the two clients so they no longer collide.
 */
const IndexerTRPCContext = createContext<unknown>(null);

/**
 * tRPC React client for the indexer query router.
 *
 * Served at /api/indexer/trpc — public reads only, no auth required.
 * Use this for all .useQuery() calls that fetch from the indexer.
 *
 * @example
 * import { indexerTrpc } from "@/lib/trpc/indexer/client";
 * const { data } = indexerTrpc.activities.list.useQuery({ did });
 */
export const indexerTrpc = createTRPCReact<LocalQueryRouter>({
  context: IndexerTRPCContext,
});
