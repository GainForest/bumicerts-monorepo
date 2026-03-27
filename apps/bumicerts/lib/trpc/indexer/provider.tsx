"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { httpBatchLink, loggerLink } from "@trpc/client";
import { indexerTrpc } from "./client";
import superjson from "superjson";

/**
 * Provides the indexerTrpc client to the component tree.
 *
 * Must be rendered inside the existing <QueryClientProvider> (from TRPCProvider)
 * so both clients share the same QueryClient instance and cache.
 *
 * Placement in the layout:
 *   <TRPCProvider>          ← sets up QueryClient + mutation trpc
 *     <IndexerTRPCProvider> ← adds indexer query trpc to the same QueryClient
 *       {children}
 *     </IndexerTRPCProvider>
 *   </TRPCProvider>
 */
export function IndexerTRPCProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();

  const [trpcClient] = useState(() =>
    indexerTrpc.createClient({
      links: [
        loggerLink({
          enabled: (opts) =>
            process.env.NODE_ENV === "development" ||
            (opts.direction === "down" && opts.result instanceof Error),
        }),
        httpBatchLink({
          url: "/api/indexer/trpc",
          transformer: superjson,
        }),
      ],
    })
  );

  return (
    <indexerTrpc.Provider client={trpcClient} queryClient={queryClient}>
      {children}
    </indexerTrpc.Provider>
  );
}
