"use client";

import { createContext } from "react";
import { createTRPCReact } from "@trpc/react-query";
import type { LocalQueryRouter } from "@/lib/trpc/query-router/router";

/**
 * Dedicated React context for the indexer tRPC client.
 *
 * See lib/trpc/client.ts for why each client needs its own context —
 * tRPC v11's singleton context means nested Providers overwrite each other.
 */
const IndexerTRPCContext = createContext<any>(null);

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
