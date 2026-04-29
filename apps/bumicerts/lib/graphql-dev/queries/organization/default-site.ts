/**
 * Organization default-site query module.
 *
 * Reads the singleton `app.gainforest.organization.defaultSite` record for a DID
 * and returns only its `record.site` AT-URI.
 *
 * Leaf: queries.organization.defaultSite
 * Params: { did: string }
 * Result: string | null
 */

import { graphqlClient } from "@/lib/graphql-dev/client";
import { graphql } from "@/lib/graphql-dev/tada";
import type { QueryModule } from "@/lib/graphql-dev/create-query";

const document = graphql(`
  query OrgDefaultSite($did: String!) {
    gainforest {
      organization {
        defaultSite(where: { did: $did }, limit: 1) {
          data {
            record {
              site
            }
          }
        }
      }
    }
  }
`);

export type Params = { did: string };
export type Result = string | null;

export async function fetch(params: Params): Promise<Result> {
  const res = await graphqlClient.request(document, { did: params.did });
  return res.gainforest?.organization?.defaultSite?.data?.[0]?.record?.site ?? null;
}

export const defaultOptions = {
  staleTime: 30 * 1_000,
} satisfies QueryModule<Params, Result>["defaultOptions"];

export function enabled(params: Params): boolean {
  return !!params.did;
}
