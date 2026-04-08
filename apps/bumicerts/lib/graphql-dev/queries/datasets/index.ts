/**
 * Datasets query module.
 *
 * Params:
 *   { did } → DatasetItem[] (all dwc.dataset records for a DID)
 *
 * Leaf: queries.datasets
 *
 * Note: this query is written as a raw GraphQL string instead of gql.tada
 * because the checked-in `graphql-env.d.ts` schema snapshot does not yet
 * include `gainforest.dwc.dataset`, even though the live indexer does.
 */

import { graphqlClient } from "@/lib/graphql-dev/client";
import type { QueryModule } from "@/lib/graphql-dev/create-query";
import { ClientError } from "graphql-request";

const document = /* GraphQL */ `
  query DatasetsByDid($did: String!) {
    gainforest {
      dwc {
        dataset(where: { did: $did }, order: DESC, sortBy: CREATED_AT) {
          data {
            metadata {
              did
              uri
              rkey
              cid
              createdAt
            }
            record {
              name
              description
              recordCount
              establishmentMeans
              createdAt
            }
          }
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

type DatasetResponse = {
  gainforest?: {
    dwc?: {
      dataset?: {
        data?: DatasetItem[] | null;
      } | null;
    } | null;
  } | null;
};

export type Params = { did: string };
export type Result = DatasetItem[];

let hasWarnedMissingDatasetSchema = false;

function isUnsupportedDatasetQueryError(error: unknown): boolean {
  if (!(error instanceof ClientError)) {
    return false;
  }

  return error.response.errors?.some((item) => {
    const message = item.message.toLowerCase();

    return (
      (message.includes("cannot query field") && message.includes("dataset")) ||
      (message.includes("unknown field") && message.includes("dataset")) ||
      (message.includes("gainforestdwcnamespace") && message.includes("dataset"))
    );
  }) ?? false;
}

export async function fetch(params: Params): Promise<Result> {
  try {
    const res = await graphqlClient.request<DatasetResponse>(document, {
      did: params.did,
    });

    return res.gainforest?.dwc?.dataset?.data ?? [];
  } catch (error) {
    if (isUnsupportedDatasetQueryError(error)) {
      if (
        process.env.NODE_ENV !== "production" &&
        !hasWarnedMissingDatasetSchema
      ) {
        hasWarnedMissingDatasetSchema = true;
        console.warn(
          "Indexer schema does not expose gainforest.dwc.dataset yet; returning an empty dataset list."
        );
      }

      return [];
    }

    throw error;
  }
}

export const defaultOptions = {
  staleTime: 30 * 1_000,
} satisfies QueryModule<Params, Result>["defaultOptions"];

export function enabled(params: Params): boolean {
  return !!params.did;
}
