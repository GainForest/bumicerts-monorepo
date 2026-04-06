"use client";

import { indexerTrpc } from "@/lib/trpc/indexer/client";

/**
 * tRPC hook — fetches the linked wallets for a given DID.
 * Used on the bumicert owner view to populate the receiving wallet dropdown.
 */
export function useEvmLinks(did: string | undefined) {
  return indexerTrpc.link.evm.list.useQuery({ did: did ?? "" }, { enabled: !!did, retry: false });
}
