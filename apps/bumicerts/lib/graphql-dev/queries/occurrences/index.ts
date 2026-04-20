/**
 * Occurrences query module.
 *
 * Fetches all `app.gainforest.dwc.occurrence` records authored by a given DID.
 * Used in the evidence picker and Tree Manager to read full tree/species lists.
 *
 * Leaf: queries.occurrences
 */

import { graphqlClient } from "@/lib/graphql-dev/client";
import type { QueryModule } from "@/lib/graphql-dev/create-query";

const document = /* GraphQL */ `
  query OccurrencesByDid($did: String!, $limit: Int, $cursor: String) {
    gainforest {
      dwc {
        occurrence(
          where: { did: $did }
          limit: $limit
          cursor: $cursor
          order: DESC
          sortBy: CREATED_AT
        ) {
          data {
            metadata {
              did
              uri
              rkey
              cid
              createdAt
            }
            record {
              scientificName
              vernacularName
              individualCount
              eventDate
              decimalLatitude
              decimalLongitude
              recordedBy
              country
              countryCode
              stateProvince
              locality
              occurrenceRemarks
              habitat
              basisOfRecord
              establishmentMeans
              datasetRef
              createdAt
            }
          }
          pageInfo {
            endCursor
            hasNextPage
            count
          }
        }
      }
    }
  }
`;

export type OccurrenceItem = {
  metadata: {
    did: string;
    uri: string;
    rkey: string;
    cid: string;
    createdAt: string | null;
  };
  record: {
    scientificName: string | null;
    vernacularName: string | null;
    individualCount: number | null;
    eventDate: string | null;
    decimalLatitude: string | null;
    decimalLongitude: string | null;
    recordedBy: string | null;
    country: string | null;
    countryCode: string | null;
    stateProvince: string | null;
    locality: string | null;
    occurrenceRemarks: string | null;
    habitat: string | null;
    basisOfRecord: string | null;
    establishmentMeans: string | null;
    datasetRef: string | null;
    createdAt: string | null;
  };
};

type PageInfo = {
  endCursor: string | null;
  hasNextPage: boolean;
  count: number;
};

type OccurrenceResponse = {
  gainforest?: {
    dwc?: {
      occurrence?: {
        data?: OccurrenceItem[] | null;
        pageInfo?: PageInfo | null;
      } | null;
    } | null;
  } | null;
};

export type Params = { did: string };
export type Result = OccurrenceItem[];

const PAGE_SIZE = 200;
const MAX_PAGES = 50;

export async function fetch(params: Params): Promise<Result> {
  const allOccurrences: OccurrenceItem[] = [];
  let cursor: string | undefined;

  for (let page = 0; page < MAX_PAGES; page++) {
    const res = await graphqlClient.request<OccurrenceResponse>(document, {
      did: params.did,
      limit: PAGE_SIZE,
      cursor,
    });

    const occurrence = res.gainforest?.dwc?.occurrence;
    if (occurrence?.data) {
      allOccurrences.push(...occurrence.data);
    }

    const pageInfo = occurrence?.pageInfo;
    if (pageInfo?.hasNextPage && pageInfo.endCursor) {
      if (page === MAX_PAGES - 1) {
        console.warn(
          `Occurrences query hit pagination safety cap for ${params.did}; results may be truncated.`,
        );
        break;
      }

      cursor = pageInfo.endCursor;
      continue;
    }

    break;
  }

  return allOccurrences;
}

export const defaultOptions = {
  staleTime: 60 * 1_000,
} satisfies QueryModule<Params, Result>["defaultOptions"];

export function enabled(params: Params): boolean {
  return !!params.did;
}
