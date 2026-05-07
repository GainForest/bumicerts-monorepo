/**
 * tRPC init for the indexer query router.
 *
 * Completely independent from the package's mutation router — different
 * endpoint (/api/indexer/trpc), different context shape, different client
 * (indexerTrpc). Query procedures are read-only indexer-backed reads;
 * most are public, while a small number (such as account.current) can use the
 * optional session DID in context.
 */

import { initTRPC } from "@trpc/server";
import superjson from "superjson";

export interface QueryRouterContext {
  sessionDid: string | null;
}

const t = initTRPC.context<QueryRouterContext>().create({
  transformer: superjson,
});

export const queryRouter = t.router;
export const publicQueryProcedure = t.procedure;
