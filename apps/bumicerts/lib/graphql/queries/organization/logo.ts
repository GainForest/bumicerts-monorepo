/**
 * Organization logo query module.
 *
 * A lightweight fetch that returns just the logo URI string.
 * Kept as a separate query so callers that only need the logo
 * don't pull the full OrgInfo payload.
 *
 * Leaf: queries.organization.logo
 * Params: { did: string }
 * Result: string | null
 *
 * Schema shape (post-redesign):
 *   gainforest.organization.info(...) { data { record { logo { uri } } } }
 */

import { graphqlClient } from "@/lib/graphql/client";
import { graphql } from "@/lib/graphql/tada";
import type { QueryModule } from "@/lib/graphql/create-query";

// ── Document ──────────────────────────────────────────────────────────────────

const document = graphql(`
  query OrgLogo($did: String!) {
    gainforest {
      organization {
        info(where: { did: $did }, limit: 1) {
          data {
            record {
              logo {
                uri
              }
            }
          }
        }
      }
    }
  }
`);

// ── Types ─────────────────────────────────────────────────────────────────────

export type Params = { did: string };
export type Result = string | null;

// ── Fetch ─────────────────────────────────────────────────────────────────────

export async function fetch(params: Params): Promise<Result> {
  const res = await graphqlClient.request(document, { did: params.did });
  return res.gainforest?.organization?.info?.data?.[0]?.record?.logo?.uri ?? null;
}

// ── Default options ───────────────────────────────────────────────────────────

export const defaultOptions = {
  staleTime: 60 * 1_000, // 1 minute
} satisfies QueryModule<Params, Result>["defaultOptions"];

// ── Enabled ───────────────────────────────────────────────────────────────────

export function enabled(params: Params): boolean {
  return !!params.did;
}
