/**
 * Organization default-site query module.
 *
 * Scratch migration target:
 *   appGainforestOrganizationDefaultSite(...) { edges { node { site } } }
 */

import {
  graphql,
  graphqlClient,
} from "@/graphql/indexer";
import { pluckConnectionNodes } from "../_migration-helpers";

const document = graphql(`
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
`);

export type Params = { did: string };
export type Result = string | null;

export async function fetch(params: Params): Promise<Result> {
  const res = await graphqlClient.request(document, { did: params.did });
  return pluckConnectionNodes(res.appGainforestOrganizationDefaultSite)[0]?.site ?? null;
}
