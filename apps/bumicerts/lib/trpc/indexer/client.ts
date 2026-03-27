"use client";

import { createTRPCReact } from "@trpc/react-query";
import type { LocalQueryRouter } from "@/lib/trpc/query-router/router";

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
export const indexerTrpc = createTRPCReact<LocalQueryRouter>();
