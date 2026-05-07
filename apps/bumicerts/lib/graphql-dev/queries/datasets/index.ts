/**
 * Datasets query module.
 *
 * Scratch migration target:
 *   appGainforestDwcDataset(...) { edges { node { ... } } }
 */

import { GraphQLClient } from "graphql-request";
import type { QueryModule } from "@/lib/graphql-dev/create-query";
import type { ConnectionResult } from "../_migration-helpers";
import { pluckConnectionNodes } from "../_migration-helpers";

const indexerUrl = process.env.NEXT_PUBLIC_INDEXER_URL;

if (!indexerUrl) {
  throw new Error("NEXT_PUBLIC_INDEXER_URL must be set for datasets queries");
}

const graphqlClient = new GraphQLClient(indexerUrl, {
  headers: {
    "ngrok-skip-browser-warning": "true",
  },
});

const document = /* GraphQL */ `
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
`;

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

type DatasetNode = {
  did: string;
  uri: string;
  rkey: string;
  cid: string;
  createdAt: string;
  name: string;
  description: string | null;
  recordCount: number | null;
  establishmentMeans: string | null;
};

type DatasetResponse = {
  appGainforestDwcDataset?: ConnectionResult<DatasetNode> | null;
};

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
  };
}

export async function fetch(params: Params): Promise<Result> {
  const res = await graphqlClient.request<DatasetResponse>(document, {
    did: params.did,
  });

  return pluckConnectionNodes(res.appGainforestDwcDataset).map(normalizeDataset);
}

export const defaultOptions = {
  staleTime: 30 * 1_000,
} satisfies QueryModule<Params, Result>["defaultOptions"];

export function enabled(params: Params): boolean {
  return !!params.did;
}
