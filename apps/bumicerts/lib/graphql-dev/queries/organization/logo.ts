/**
 * Organization logo query module.
 *
 * Scratch migration target:
 *   appGainforestOrganizationInfo(...) { edges { node { logo } } }
 */

import { GraphQLClient } from "graphql-request";
import type { QueryModule } from "../../create-query";
import type { ConnectionResult } from "../_migration-helpers";
import { pluckConnectionNodes, toResolvedLegacyBlob } from "../_migration-helpers";

const document = /* GraphQL */ `
  query OrgLogo($did: String!) {
    appGainforestOrganizationInfo(
      where: { did: { eq: $did } }
      first: 1
      sortDirection: DESC
      sortBy: createdAt
    ) {
      edges {
        node {
          did
          logo {
            image {
              ref
            }
          }
        }
      }
    }
  }
`;

const indexerUrl = process.env.NEXT_PUBLIC_INDEXER_URL;

if (!indexerUrl) {
  throw new Error("NEXT_PUBLIC_INDEXER_URL must be set for organization logo queries");
}

const graphqlClient = new GraphQLClient(indexerUrl, {
  headers: {
    "ngrok-skip-browser-warning": "true",
  },
});

export type Params = { did: string };
export type Result = string | null;

type OrgLogoNode = {
  did?: string;
  logo: {
    image?: {
      ref?: string | null;
      mimeType?: string | null;
      size?: number | null;
    } | null;
  } | null;
};

type OrgLogoResponse = {
  appGainforestOrganizationInfo?: ConnectionResult<OrgLogoNode> | null;
};

export async function fetch(params: Params): Promise<Result> {
  const res = await graphqlClient.request<OrgLogoResponse>(document, { did: params.did });
  const node = pluckConnectionNodes(res.appGainforestOrganizationInfo)[0];
  if (!node) return null;
  const resolved = await toResolvedLegacyBlob(node.logo?.image ?? null, params.did);
  return resolved?.uri ?? null;
}

export const defaultOptions = {
  staleTime: 60 * 1_000,
} satisfies QueryModule<Params, Result>["defaultOptions"];

export function enabled(params: Params): boolean {
  return !!params.did;
}
