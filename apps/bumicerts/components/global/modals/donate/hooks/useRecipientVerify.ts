"use client";

import { useQuery } from "@tanstack/react-query";

type RecipientStatus =
  | { hasAttestation: true;  address: string; chainId: number }
  | { hasAttestation: false };

async function fetchRecipientStatus(orgDid: string): Promise<RecipientStatus> {
  const res = await fetch(`/api/verify-recipient?did=${encodeURIComponent(orgDid)}`);
  if (!res.ok) return { hasAttestation: false };
  return res.json() as Promise<RecipientStatus>;
}

/**
 * Queries /api/verify-recipient to check whether an org has a linked wallet.
 * The result is cached for 5 minutes — orgs rarely change their wallet.
 */
export function useRecipientVerify(orgDid: string) {
  return useQuery({
    queryKey:  ["recipient-verify", orgDid],
    queryFn:   () => fetchRecipientStatus(orgDid),
    staleTime: 5 * 60 * 1_000,
    retry:     false,
    enabled:   !!orgDid,
  });
}
