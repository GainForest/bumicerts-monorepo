/**
 * Locations query module.
 *
 * Params:
 *   { did }  → CertifiedLocationItem[]  (all certified locations for a DID)
 *
 * Leaf: queries.locations
 *
 * Schema shape (post-redesign):
 *   certified.location(...) { data { metadata { ... } creatorInfo { ... } record { ... } } pageInfo }
 */

import { graphqlClient } from "@/lib/graphql/client";
import { graphql } from "@/lib/graphql/tada";
import type { ResultOf } from "@/lib/graphql/tada";
import type { QueryModule } from "@/lib/graphql/create-query";

// ── Document ──────────────────────────────────────────────────────────────────

const document = graphql(`
  query CertifiedLocations($did: String!) {
    certified {
      location(where: { did: $did }, order: DESC, sortBy: CREATED_AT) {
        data {
          metadata {
            did
            uri
            rkey
            cid
          }
          record {
            name
            description
            location
            locationType
          }
        }
      }
    }
  }
`);

// ── Types ─────────────────────────────────────────────────────────────────────

type _Result = ResultOf<typeof document>;
type _Data = NonNullable<NonNullable<NonNullable<_Result["certified"]>["location"]>["data"]>;
export type CertifiedLocation = NonNullable<_Data[number]>;

export type Params = { did: string };
export type Result = CertifiedLocation[];

// ── Fetch ─────────────────────────────────────────────────────────────────────

export async function fetch(params: Params): Promise<Result> {
  const res = await graphqlClient.request(document, { did: params.did });
  return (res.certified?.location?.data ?? []) as Result;
}

// ── Default options ───────────────────────────────────────────────────────────

export const defaultOptions = {
  staleTime: 30 * 1_000, // 30 seconds — locations change more often than org info
} satisfies QueryModule<Params, Result>["defaultOptions"];

// ── Enabled ───────────────────────────────────────────────────────────────────

export function enabled(params: Params): boolean {
  return !!params.did;
}
