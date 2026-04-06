/**
 * tRPC init for the indexer query router.
 *
 * Completely independent from the package's mutation router — different
 * endpoint (/api/indexer/trpc), different context (none needed), different
 * client (indexerTrpc). Query procedures are public reads from the indexer;
 * no auth context is required or passed.
 */

import { initTRPC } from "@trpc/server";
import superjson from "superjson";

const t = initTRPC.create({
  transformer: superjson,
});

export const queryRouter = t.router;
export const publicQueryProcedure = t.procedure;
