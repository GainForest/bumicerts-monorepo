"use client";

import { indexerTrpc } from "@/lib/trpc/indexer/client";

export interface UseAccountOptions {
  enabled?: boolean;
  staleTime?: number;
  refetchOnMount?: boolean | "always";
  refetchOnWindowFocus?: boolean;
}

/**
 * Convenience account hooks for low-stakes ambient UI.
 *
 * Use these in shared shell surfaces such as the account provider, sidebar,
 * header, and menus. For high-stakes routes such as `/account` and `/upload`,
 * query the indexer directly via the server caller or `indexerTrpc.account.*`
 * so the route keeps authoritative, freshest account state.
 */
export function useCurrentAccount(options?: UseAccountOptions) {
  const enabled = options?.enabled ?? true;
  const staleTime = options?.staleTime;
  const refetchOnMount = options?.refetchOnMount;
  const refetchOnWindowFocus = options?.refetchOnWindowFocus ?? false;

  return indexerTrpc.account.current.useQuery(undefined, {
    enabled,
    ...(staleTime !== undefined ? { staleTime } : {}),
    ...(refetchOnMount !== undefined ? { refetchOnMount } : {}),
    refetchOnWindowFocus,
  });
}

export function useAccountByDid(did: string, options?: UseAccountOptions) {
  const enabled = options?.enabled ?? true;
  const staleTime = options?.staleTime;
  const refetchOnMount = options?.refetchOnMount;
  const refetchOnWindowFocus = options?.refetchOnWindowFocus ?? false;

  return indexerTrpc.account.byDid.useQuery(
    { did },
    {
      enabled,
      ...(staleTime !== undefined ? { staleTime } : {}),
      ...(refetchOnMount !== undefined ? { refetchOnMount } : {}),
      refetchOnWindowFocus,
    },
  );
}
