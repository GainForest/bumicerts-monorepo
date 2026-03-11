"use client";

import { queries } from "@/lib/graphql/queries";

/**
 * React Query hook — fetches the linked wallets for a given DID.
 * Used on the bumicert owner view to populate the receiving wallet dropdown.
 */
export function useEvmLinks(did: string | undefined) {
  return queries.linkEvm.useQuery({ did: did ?? "" });
}
