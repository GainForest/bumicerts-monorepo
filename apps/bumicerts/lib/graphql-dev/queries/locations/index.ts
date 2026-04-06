/**
 * Locations query module.
 *
 * Params:
 *   { did }         → CertifiedLocationItem[]  (all certified locations for a DID)
 *   { did, rkey }   → CertifiedLocationItem[]  (single location by exact did + rkey)
 *
 * Leaf: queries.locations
 *
 * Schema shape (post-redesign):
 *   certified.location(...) { data { metadata { ... } creatorInfo { ... } record { ... } } pageInfo }
 */

import { graphqlClient } from "@/lib/graphql-dev/client";
import { graphql } from "@/lib/graphql-dev/tada";
import type { ResultOf } from "@/lib/graphql-dev/tada";
import type { QueryModule } from "@/lib/graphql-dev/create-query";

// ── Documents ─────────────────────────────────────────────────────────────────

const byDidDocument = graphql(`
  query CertifiedLocationsByDid($did: String!) {
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

const byDidAndRkeyDocument = graphql(`
  query CertifiedLocationByDidAndRkey($did: String!, $rkey: String!) {
    certified {
      location(where: { did: $did, rkey: $rkey }) {
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

type _Result = ResultOf<typeof byDidDocument>;
type _Data = NonNullable<NonNullable<NonNullable<_Result["certified"]>["location"]>["data"]>;
export type CertifiedLocation = NonNullable<_Data[number]>;

export type ByDidParams = { did: string };
export type ByDidAndRkeyParams = { did: string; rkey: string };
export type Params = ByDidParams | ByDidAndRkeyParams;
export type Result = CertifiedLocation[];

// ── Fetch ─────────────────────────────────────────────────────────────────────

export async function fetch(params: Params): Promise<Result> {
  if ("rkey" in params) {
    const res = await graphqlClient.request(byDidAndRkeyDocument, {
      did: params.did,
      rkey: params.rkey,
    });
    return (res.certified?.location?.data ?? []) as Result;
  }
  const res = await graphqlClient.request(byDidDocument, { did: params.did });
  return (res.certified?.location?.data ?? []) as Result;
}

// ── Default options ───────────────────────────────────────────────────────────

export const defaultOptions = {
  staleTime: 30 * 1_000,
} satisfies QueryModule<Params, Result>["defaultOptions"];

// ── Enabled ───────────────────────────────────────────────────────────────────

export function enabled(params: Params): boolean {
  return !!params.did;
}
