/**
 * Funding receipts query module.
 *
 * Scratch migration target:
 *   orgHypercertsFundingReceipt(...) { edges { node { ... } } }
 */

import { GraphQLClient } from "graphql-request";
import type { QueryModule } from "@/lib/graphql-dev/create-query";
import type { ConnectionResult, StrongRefLike } from "../_migration-helpers";
import { connectionPageInfo, pluckConnectionNodes, toLegacyStrongRef } from "../_migration-helpers";

const indexerUrl = process.env.NEXT_PUBLIC_INDEXER_URL;

if (!indexerUrl) {
  throw new Error("NEXT_PUBLIC_INDEXER_URL must be set for fundingReceipts queries");
}

const graphqlClient = new GraphQLClient(indexerUrl, {
  headers: {
    "ngrok-skip-browser-warning": "true",
  },
});

const byDidDocument = /* GraphQL */ `
  query FundingReceiptsByDid($did: String!, $first: Int, $after: String) {
    orgHypercertsFundingReceipt(
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
          from {
            ... on OrgHypercertsFundingReceiptText {
              value
            }
            ... on AppCertifiedDefsDid {
              did
            }
            ... on ComAtprotoRepoStrongRef {
              uri
              cid
            }
          }
          to {
            ... on OrgHypercertsFundingReceiptText {
              value
            }
            ... on AppCertifiedDefsDid {
              did
            }
            ... on ComAtprotoRepoStrongRef {
              uri
              cid
            }
          }
          amount
          currency
          paymentRail
          paymentNetwork
          transactionId
          for {
            uri
            cid
          }
          notes
          occurredAt
        }
      }
      pageInfo {
        endCursor
        hasNextPage
      }
      totalCount
    }
  }
`;

type TextUnion = { value: string };
type DidUnion = { did: string };
type FundingUnion = TextUnion | DidUnion | StrongRefLike | null;

type FundingReceiptNode = {
  did: string;
  uri: string;
  rkey: string;
  cid: string;
  createdAt: string;
  from: FundingUnion;
  to: FundingUnion;
  amount: string;
  currency: string;
  paymentRail: string | null;
  paymentNetwork: string | null;
  transactionId: string | null;
  for: StrongRefLike | null;
  notes: string | null;
  occurredAt: string | null;
};

type FundingReceiptResponse = {
  orgHypercertsFundingReceipt?: ConnectionResult<FundingReceiptNode> | null;
};

export type FundingReceiptItem = {
  metadata: {
    did: string;
    uri: string;
    rkey: string;
    cid: string;
    createdAt: string | null;
    indexedAt: string | null;
  };
  record: {
    from: unknown;
    to: unknown;
    amount: string;
    currency: string;
    paymentRail: string | null;
    paymentNetwork: string | null;
    transactionId: string | null;
    for: { uri: string | null; cid: string | null } | null;
    notes: string | null;
    occurredAt: string | null;
    createdAt: string | null;
  };
};

export type Params = { did: string };
export type Result = FundingReceiptItem[];

const PAGE_SIZE = 200;
const MAX_PAGES = 50;

function normalizeFundingUnion(value: FundingUnion): unknown {
  if (!value) return null;
  if ("value" in value && typeof value.value === "string") {
    return { $type: "org.hypercerts.funding.receipt#text", value: value.value };
  }
  if ("did" in value && typeof value.did === "string") {
    return { did: value.did, $type: "app.certified.defs#did" };
  }
  if ("uri" in value || "cid" in value) {
    return toLegacyStrongRef(value);
  }
  return null;
}

function normalizeReceipt(node: FundingReceiptNode): FundingReceiptItem {
  return {
    metadata: {
      did: node.did,
      uri: node.uri,
      rkey: node.rkey,
      cid: node.cid,
      createdAt: node.createdAt,
      indexedAt: null,
    },
    record: {
      from: normalizeFundingUnion(node.from),
      to: normalizeFundingUnion(node.to),
      amount: node.amount,
      currency: node.currency,
      paymentRail: node.paymentRail,
      paymentNetwork: node.paymentNetwork,
      transactionId: node.transactionId,
      for: toLegacyStrongRef(node.for),
      notes: node.notes,
      occurredAt: node.occurredAt,
      createdAt: node.createdAt,
    },
  };
}

export async function fetch(params: Params): Promise<Result> {
  const allReceipts: FundingReceiptItem[] = [];
  let cursor: string | undefined;

  for (let page = 0; page < MAX_PAGES; page++) {
    const res = await graphqlClient.request<FundingReceiptResponse>(byDidDocument, {
      did: params.did,
      first: PAGE_SIZE,
      after: cursor,
    });

    const receiptConnection = res.orgHypercertsFundingReceipt;
    allReceipts.push(...pluckConnectionNodes(receiptConnection).map(normalizeReceipt));

    const pageInfo = connectionPageInfo(receiptConnection);
    if (pageInfo.hasNextPage && pageInfo.endCursor) {
      cursor = pageInfo.endCursor;
      continue;
    }

    break;
  }

  return allReceipts;
}

export const defaultOptions = {
  staleTime: 30 * 1_000,
} satisfies QueryModule<Params, Result>["defaultOptions"];

export function enabled(params: Params): boolean {
  return !!params.did;
}
