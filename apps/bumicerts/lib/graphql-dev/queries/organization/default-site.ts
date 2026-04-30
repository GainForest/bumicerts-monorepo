/**
 * Organization default-site query module.
 *
 * Scratch migration target:
 *   appGainforestOrganizationDefaultSite(...) { edges { node { site } } }
 */

import { GraphQLClient } from "graphql-request";
import type { QueryModule } from "../../create-query";
import type { ConnectionResult } from "../_migration-helpers";
import { pluckConnectionNodes } from "../_migration-helpers";

const indexerUrl = process.env.NEXT_PUBLIC_INDEXER_URL;

if (!indexerUrl) {
  throw new Error("NEXT_PUBLIC_INDEXER_URL is required");
}

const graphqlClient = new GraphQLClient(indexerUrl, {
  headers: {
    "ngrok-skip-browser-warning": "true",
  },
});

const document = /* GraphQL */ `
  query OrgDefaultSite($did: String!) {
    appGainforestOrganizationDefaultSite(
      where: { did: { eq: $did } }
      first: 1
      sortDirection: DESC
      sortBy: createdAt
    ) {
      edges {
        node {
          site
        }
      }
    }
  }
`;

export type Params = { did: string };
export type Result = string | null;

type DefaultSiteNode = {
  site: string;
};

type DefaultSiteResponse = {
  appGainforestOrganizationDefaultSite?: ConnectionResult<DefaultSiteNode> | null;
};

export async function fetch(params: Params): Promise<Result> {
  const res = await graphqlClient.request<DefaultSiteResponse>(document, { did: params.did });
  return pluckConnectionNodes(res.appGainforestOrganizationDefaultSite)[0]?.site ?? null;
}

export const defaultOptions = {
  staleTime: 30 * 1_000,
} satisfies QueryModule<Params, Result>["defaultOptions"];

export function enabled(params: Params): boolean {
  return !!params.did;
}
