/**
 * Occurrences query module.
 *
 * Fetches `app.gainforest.dwc.occurrence` records authored by a given DID.
 * Used in the evidence picker to let org owners link tree/species occurrence
 * records as evidence on a bumicert.
 *
 * Leaf: queries.occurrences
 *
 * Schema shape:
 *   gainforest.dwc.occurrence(where: { did: $did }) {
 *     data { metadata { ... } record { scientificName, eventDate, ... } }
 *   }
 */

import { graphqlClient } from "@/lib/graphql-dev/client";
import { graphql } from "@/lib/graphql-dev/tada";
import type { ResultOf } from "@/lib/graphql-dev/tada";
import type { QueryModule } from "@/lib/graphql-dev/create-query";

// ── Document ──────────────────────────────────────────────────────────────────

const byDidDocument = graphql(`
  query OccurrencesByDid($did: String!) {
    gainforest {
      dwc {
        occurrence(where: { did: $did }, order: DESC, sortBy: CREATED_AT) {
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
              createdAt
            }
          }
        }
      }
    }
  }
`);

// ── Types ─────────────────────────────────────────────────────────────────────

type _Result = ResultOf<typeof byDidDocument>;
type _DataArr = NonNullable<
  NonNullable<NonNullable<_Result["gainforest"]>["dwc"]>["occurrence"]
>["data"];
export type OccurrenceItem = NonNullable<_DataArr>[number];

export type Params = { did: string };
export type Result = OccurrenceItem[];

// ── Fetch ─────────────────────────────────────────────────────────────────────

export async function fetch(params: Params): Promise<Result> {
  const res = await graphqlClient.request(byDidDocument, { did: params.did });
  return (res.gainforest?.dwc?.occurrence?.data ?? []) as Result;
}

// ── Default options ───────────────────────────────────────────────────────────

export const defaultOptions = {
  staleTime: 60 * 1_000,
} satisfies QueryModule<Params, Result>["defaultOptions"];

// ── Enabled ───────────────────────────────────────────────────────────────────

export function enabled(params: Params): boolean {
  return !!params.did;
}
