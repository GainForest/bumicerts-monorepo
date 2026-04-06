/**
 * Audio recordings query module.
 *
 * Params:
 *   { did }  → AudioRecordingItem[]  (all audio recordings for a DID)
 *
 * Leaf: queries.audio
 *
 * Schema shape:
 *   gainforest.ac.audio(...) { data { metadata creatorInfo record } pageInfo }
 */

import { graphqlClient } from "@/lib/graphql-dev/client";
import { graphql } from "@/lib/graphql-dev/tada";
import type { ResultOf } from "@/lib/graphql-dev/tada";
import type { QueryModule } from "@/lib/graphql-dev/create-query";

// ── Document ──────────────────────────────────────────────────────────────────

const document = graphql(`
  query AudioRecordingsByDid($did: String!) {
    gainforest {
      ac {
        audio(where: { did: $did }, order: DESC, sortBy: CREATED_AT) {
          data {
            metadata {
              did
              uri
              rkey
              cid
            }
            record {
              name
              description
              createdAt
              blob
              metadata
            }
          }
        }
      }
    }
  }
`);

// ── Types ─────────────────────────────────────────────────────────────────────

type _Result = ResultOf<typeof document>;
type _GainforestAc = NonNullable<NonNullable<_Result["gainforest"]>["ac"]>;
type _AudioData = NonNullable<NonNullable<_GainforestAc["audio"]>["data"]>;
type _AudioDataArr = NonNullable<_AudioData> extends readonly (infer T)[] ? T : never;
export type AudioRecordingItem = NonNullable<_AudioDataArr>;

export type Params = { did: string };
export type Result = AudioRecordingItem[];

// ── Fetch ─────────────────────────────────────────────────────────────────────

export async function fetch(params: Params): Promise<Result> {
  const res = await graphqlClient.request(document, { did: params.did });
  return (res.gainforest?.ac?.audio?.data ?? []) as Result;
}

// ── Default options ───────────────────────────────────────────────────────────

export const defaultOptions = {
  staleTime: 30 * 1_000, // 30 seconds
} satisfies QueryModule<Params, Result>["defaultOptions"];

// ── Enabled ───────────────────────────────────────────────────────────────────

export function enabled(params: Params): boolean {
  return !!params.did;
}
