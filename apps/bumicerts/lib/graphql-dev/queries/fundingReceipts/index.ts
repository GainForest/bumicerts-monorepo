/**
 * Funding receipts query module.
 *
 * Fetches all org.hypercerts.funding.receipt records authored by a given DID
 * (typically the facilitator). Callers filter by `record.for` client-side
 * to get receipts relevant to a specific bumicert.
 *
 * Leaf: queries.fundingReceipts
 *
 * Schema shape:
 *   hypercerts.funding.receipt(where: { did: $did }) {
 *     data { metadata { ... } record { ... } }
 *   }
 */

import { graphqlClient } from "@/lib/graphql-dev/client";
import { graphql } from "@/lib/graphql-dev/tada";
import type { ResultOf } from "@/lib/graphql-dev/tada";
import type { QueryModule } from "@/lib/graphql-dev/create-query";

// ── Document ──────────────────────────────────────────────────────────────────

const byDidDocument = graphql(`
  query FundingReceiptsByDid($did: String!) {
    hypercerts {
      funding {
        receipt(where: { did: $did }, order: DESC, sortBy: CREATED_AT) {
          data {
            metadata {
              did
              uri
              rkey
              cid
              createdAt
              indexedAt
            }
            record {
              from
              to
              amount
              currency
              paymentRail
              paymentNetwork
              transactionId
              for
              notes
              occurredAt
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
  NonNullable<NonNullable<_Result["hypercerts"]>["funding"]>["receipt"]
>["data"];
export type FundingReceiptItem = NonNullable<_DataArr>[number];

export type Params = { did: string };
export type Result = FundingReceiptItem[];

// ── Fetch ─────────────────────────────────────────────────────────────────────

export async function fetch(params: Params): Promise<Result> {
  const res = await graphqlClient.request(byDidDocument, { did: params.did });
  return (res.hypercerts?.funding?.receipt?.data ?? []) as Result;
}

// ── Default options ───────────────────────────────────────────────────────────

export const defaultOptions = {
  staleTime: 30 * 1_000, // 30 seconds — donations are near-real-time
} satisfies QueryModule<Params, Result>["defaultOptions"];

// ── Enabled ───────────────────────────────────────────────────────────────────

export function enabled(params: Params): boolean {
  return !!params.did;
}
