/**
 * Datasets query module.
 *
 * Scratch migration target:
 *   appGainforestDwcDataset(...) { edges { node { ... } } }
 */

import {
  graphql,
  graphqlClient,
  type ResultOf,
} from "@/graphql/indexer";
import type { ConnectionNode } from "../_connection";
import { pluckConnectionNodes } from "../_migration-helpers";

const document = graphql(`
  query DatasetsByDid($did: String!) {
    appGainforestDwcDataset(
      where: { did: { eq: $did } }
      first: 200
      sortDirection: DESC
      sortBy: createdAt
    ) {
      edges {
        node {
          did
          uri
          rkey
          cid
          createdAt
          name
          description
          recordCount
          establishmentMeans
        }
      }
    }
  }
`);

export type DatasetItem = {
  metadata: {
    did: string;
    uri: string;
    rkey: string;
    cid: string;
    createdAt: string | null;
  };
  record: {
    name: string;
    description: string | null;
    recordCount: number | null;
    establishmentMeans: string | null;
    createdAt: string | null;
  };
};

type DatasetNode = ConnectionNode<
  ResultOf<typeof document>["appGainforestDwcDataset"]
>;

export type Params = { did: string };
export type Result = DatasetItem[];

function normalizeDataset(node: DatasetNode): DatasetItem {
  return {
    metadata: {
      did: node.did,
      uri: node.uri,
      rkey: node.rkey,
      cid: node.cid,
      createdAt: node.createdAt,
    },
    record: {
      name: node.name,
      description: node.description,
      recordCount: node.recordCount,
      establishmentMeans: node.establishmentMeans,
      createdAt: node.createdAt,
    },
  } satisfies DatasetItem;
}

export async function fetch(params: Params): Promise<Result> {
  const res = await graphqlClient.request(document, {
    did: params.did,
  });

  return pluckConnectionNodes(res.appGainforestDwcDataset).map(normalizeDataset);
}
