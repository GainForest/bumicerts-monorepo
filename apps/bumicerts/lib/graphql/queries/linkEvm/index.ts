/**
 * linkEvm query module.
 *
 * Fetches app.bumicerts.link.evm records (linked wallets) authored by a given DID.
 * Used on the bumicert owner view to populate the receiving wallet dropdown
 * in the funding config modal.
 */

import { graphqlClient } from "@/lib/graphql/client";
import { graphql } from "@/lib/graphql/tada";
import type { QueryModule } from "@/lib/graphql/create-query";

// ── Document ──────────────────────────────────────────────────────────────────

const byDidDocument = graphql(`
  query LinkEvmByDid($did: String!) {
    bumicerts {
      link {
        evm(where: { did: $did }, limit: 20, order: DESC, sortBy: CREATED_AT) {
          data {
            metadata {
              uri
              rkey
              did
              cid
              createdAt
            }
            specialMetadata {
              valid
            }
            record {
              name
              address
              platformAttestation {
                platformAddress
              }
            }
          }
        }
      }
    }
  }
`);

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * A linked EVM wallet record as returned by the indexer.
 * Mirrors the fields selected in the query above.
 */
export type EvmLink = {
  metadata: {
    uri: string | null;
    rkey: string | null;
    did: string | null;
    cid: string | null;
    createdAt: string | null;
  } | null;
  specialMetadata: {
    valid: boolean | null;
  } | null;
  record: {
    name: string | null;
    address: string | null;
    platformAttestation: {
      platformAddress: string | null;
    } | null;
  } | null;
};

// ── Params ────────────────────────────────────────────────────────────────────

export type Params = { did: string };

// ── Fetch ─────────────────────────────────────────────────────────────────────

export async function fetch(params: Params): Promise<EvmLink[]> {
  const res = await graphqlClient.request(byDidDocument, { did: params.did });
  const raw = res.bumicerts?.link?.evm?.data;
  if (!raw) return [];
  return raw as EvmLink[];
}

/** Keep legacy name for any direct callers. */
export const fetchLinkEvm = (did: string) => fetch({ did });

// ── Default options ───────────────────────────────────────────────────────────

export const defaultOptions = {
  staleTime: 30 * 1_000, // 30 s — links rarely change
  retry: false,
} satisfies QueryModule<Params, unknown>["defaultOptions"];

// ── Enabled ───────────────────────────────────────────────────────────────────

export function enabled(params: Params): boolean {
  return !!params.did;
}
