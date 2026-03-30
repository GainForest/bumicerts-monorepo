"use client";

import React from "react";
import { createTRPCReact } from "@trpc/react-query";
import type { LocalQueryRouter } from "@/lib/trpc/query-router/router";

/**
 * Dedicated React context for the indexer tRPC client.
 *
 * tRPC's createTRPCReact instances all share a single global TRPCContext by
 * default. If two providers are nested, the inner one overwrites the context
 * for all children — meaning mutations on the outer `trpc` client would
 * incorrectly route through the inner indexer client.
 *
 * Passing a custom context to createTRPCReact gives indexerTrpc its own
 * isolated React context so it never interferes with the mutation trpc client.
 */
export const IndexerTRPCContext = React.createContext<unknown>(null);

/**
 * tRPC React client for the indexer query router.
 *
 * Served at /api/indexer/trpc — public reads only, no auth required.
 * Uses its own React context (IndexerTRPCContext) so it never conflicts
 * with the mutation trpc client.
 *
 * @example
 * import { indexerTrpc } from "@/lib/trpc/indexer/client";
 * const { data } = indexerTrpc.activities.list.useQuery({ did });
 */
// Cast is required because createTRPCReact's context option is typed as
// React.Context<any> in the library. We use `as unknown as` to satisfy the
// type without an explicit `any` (which the lint config disallows).
type TRPCContextValue = typeof IndexerTRPCContext extends React.Context<infer T> ? T : unknown;
export const indexerTrpc = createTRPCReact<LocalQueryRouter>({
  context: IndexerTRPCContext as unknown as React.Context<TRPCContextValue>,
});
