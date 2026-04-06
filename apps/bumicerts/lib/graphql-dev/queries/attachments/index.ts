/**
 * Attachments query module.
 *
 * Fetches all `org.hypercerts.context.attachment` records authored by a given
 * DID (the org). Callers filter by `record.subjects` client-side to get only
 * the attachments relevant to a specific bumicert activity URI.
 *
 * This follows the same pattern as `fundingReceipts` — fetch all by DID,
 * filter client-side — because the indexer's WhereInput for this collection
 * only supports `did`, `handle`, and `rkey`, not a subject URI filter.
 *
 * Leaf: queries.attachments
 *
 * Schema shape:
 *   hypercerts.context.attachment(where: { did: $did }) {
 *     data { metadata { ... } creatorInfo { ... } record { ... } }
 *   }
 */

import { graphqlClient } from "@/lib/graphql-dev/client";
import { graphql } from "@/lib/graphql-dev/tada";
import type { ResultOf } from "@/lib/graphql-dev/tada";
import type { QueryModule } from "@/lib/graphql-dev/create-query";

// ── Document ──────────────────────────────────────────────────────────────────

const byDidDocument = graphql(`
  query AttachmentsByDid($did: String!) {
    hypercerts {
      context {
        attachment(
          where: { did: $did }
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
            creatorInfo {
              did
              organizationName
              organizationLogo {
                uri
                cid
                mimeType
                size
              }
            }
            record {
              title
              shortDescription
              contentType
              subjects {
                uri
                cid
              }
              content
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
  NonNullable<NonNullable<_Result["hypercerts"]>["context"]>["attachment"]
>["data"];
export type AttachmentItem = NonNullable<_DataArr>[number];

export type Params = { did: string };
export type Result = AttachmentItem[];

// ── Fetch ─────────────────────────────────────────────────────────────────────

export async function fetch(params: Params): Promise<Result> {
  const res = await graphqlClient.request(byDidDocument, { did: params.did });
  return (res.hypercerts?.context?.attachment?.data ?? []) as Result;
}

// ── Default options ───────────────────────────────────────────────────────────

export const defaultOptions = {
  staleTime: 60 * 1_000, // 1 minute
} satisfies QueryModule<Params, Result>["defaultOptions"];

// ── Enabled ───────────────────────────────────────────────────────────────────

export function enabled(params: Params): boolean {
  return !!params.did;
}
