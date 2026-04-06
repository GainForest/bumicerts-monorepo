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
  query FundingReceiptsByDid($did: String!, $limit: Int, $cursor: String) {
    hypercerts {
      funding {
        receipt(
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
          pageInfo {
            endCursor
            hasNextPage
            count
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

// ── Pagination ────────────────────────────────────────────────────────────────

/** Items per GraphQL request — generous to minimise round trips. */
const PAGE_SIZE = 200;

/** Hard cap on pages to prevent runaway loops (200 × 50 = 10 000 receipts). */
const MAX_PAGES = 50;

// ── Fetch ─────────────────────────────────────────────────────────────────────

export async function fetch(params: Params): Promise<Result> {
  const allReceipts: FundingReceiptItem[] = [];
  let cursor: string | undefined;

  for (let page = 0; page < MAX_PAGES; page++) {
    const res = await graphqlClient.request(byDidDocument, {
      did: params.did,
      limit: PAGE_SIZE,
      cursor,
    });

    const receipt = res.hypercerts?.funding?.receipt;
    const data = (receipt?.data ?? []) as FundingReceiptItem[];
    allReceipts.push(...data);

    const pageInfo = receipt?.pageInfo;
    if (pageInfo?.hasNextPage && pageInfo.endCursor) {
      cursor = pageInfo.endCursor;
    } else {
      break;
    }
  }

  return allReceipts;
}

// ── Default options ───────────────────────────────────────────────────────────

export const defaultOptions = {
  staleTime: 30 * 1_000, // 30 seconds — donations are near-real-time
} satisfies QueryModule<Params, Result>["defaultOptions"];

// ── Enabled ───────────────────────────────────────────────────────────────────

export function enabled(params: Params): boolean {
  return !!params.did;
}
