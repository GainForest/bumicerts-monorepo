/**
 * Occurrences query module.
 *
 * Fetches all `app.gainforest.dwc.occurrence` records authored by a given DID.
 * Used in the evidence picker and Tree Manager to read full tree/species lists.
 *
 * Leaf: queries.occurrences
 */

import {
  graphql,
  graphqlClient,
  type ResultOf,
} from "@/graphql/indexer";
import type { ConnectionNode } from "../_connection";
import { connectionPageInfo, pluckConnectionNodes } from "../_migration-helpers";

const document = graphql(`
  query OccurrencesByDid($did: String!, $first: Int, $after: String) {
    appGainforestDwcOccurrence(
      where: { did: { eq: $did } }
      first: $first
      after: $after
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
          datasetRef
        }
      }
      pageInfo {
        endCursor
        hasNextPage
      }
      totalCount
    }
  }
`);

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
    /** TODO(graphql-migration): temporary establishmentMeans shim; remove when the query path supports it or upload UI stops depending on it. */
    establishmentMeans: string | null;
    datasetRef: string | null;
    createdAt: string | null;
  };
};

type OccurrenceNode = ConnectionNode<
  ResultOf<typeof document>["appGainforestDwcOccurrence"]
>;

export type Params = { did: string };
export type Result = OccurrenceItem[];

const PAGE_SIZE = 200;
const MAX_PAGES = 50;

function normalizeOccurrence(node: OccurrenceNode): OccurrenceItem {
  return {
    metadata: {
      did: node.did,
      uri: node.uri,
      rkey: node.rkey,
      cid: node.cid,
      createdAt: node.createdAt,
    },
    record: {
      scientificName: node.scientificName,
      vernacularName: node.vernacularName,
      individualCount: node.individualCount,
      eventDate: node.eventDate,
      decimalLatitude: node.decimalLatitude,
      decimalLongitude: node.decimalLongitude,
      recordedBy: node.recordedBy,
      country: node.country,
      countryCode: node.countryCode,
      stateProvince: node.stateProvince,
      locality: node.locality,
      occurrenceRemarks: node.occurrenceRemarks,
      habitat: node.habitat,
      basisOfRecord: node.basisOfRecord,
      // TODO(graphql-migration): temporary establishmentMeans shim; remove when the query path supports it or upload UI stops depending on it.
      establishmentMeans: null,
      datasetRef: node.datasetRef,
      createdAt: node.createdAt,
    },
  } satisfies OccurrenceItem;
}

export async function fetch(params: Params): Promise<Result> {
  const allOccurrences: OccurrenceItem[] = [];
  let cursor: string | undefined;

  for (let page = 0; page < MAX_PAGES; page++) {
    const res = await graphqlClient.request(document, {
      did: params.did,
      first: PAGE_SIZE,
      after: cursor,
    });

    const occurrence = res.appGainforestDwcOccurrence;
    allOccurrences.push(...pluckConnectionNodes(occurrence).map(normalizeOccurrence));

    const pageInfo = connectionPageInfo(occurrence);
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
