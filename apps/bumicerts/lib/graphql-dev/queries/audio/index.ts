/**
 * Audio recordings query module.
 *
 * Params:
 *   { did }  → AudioRecordingItem[]  (all audio recordings for a DID)
 *
 * Leaf: queries.audio
 *
 * Schema shape:
 *   gainforest.organization.recordings.audio(...) { data { metadata creatorInfo record } pageInfo }
 */

import { graphqlClient } from "@/lib/graphql-dev/client";
import { graphql } from "@/lib/graphql-dev/tada";
import type { ResultOf } from "@/lib/graphql-dev/tada";
import type { QueryModule } from "@/lib/graphql-dev/create-query";

// ── Document ──────────────────────────────────────────────────────────────────

const document = graphql(`
  query AudioRecordingsByDid($did: String!) {
    gainforest {
      organization {
        recordings {
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
                blob {
                  uri
                  mimeType
                  size
                  cid
                }
                metadata {
                  codec
                  channels
                  duration
                  sampleRate
                  recordedAt
                  coordinates
                }
              }
            }
          }
        }
      }
    }
  }
`);

// ── Types ─────────────────────────────────────────────────────────────────────

type _Result = ResultOf<typeof document>;
type _GainforestOrg = NonNullable<NonNullable<_Result["gainforest"]>["organization"]>;
type _Recordings = NonNullable<NonNullable<_GainforestOrg["recordings"]>["audio"]>["data"];
type _RecordingsArr = NonNullable<_Recordings> extends readonly (infer T)[] ? T : never;
export type AudioRecordingItem = NonNullable<_RecordingsArr>;

export type Params = { did: string };
export type Result = AudioRecordingItem[];

// ── Fetch ─────────────────────────────────────────────────────────────────────

export async function fetch(params: Params): Promise<Result> {
  const res = await graphqlClient.request(document, { did: params.did });
  return (res.gainforest?.organization?.recordings?.audio?.data ?? []) as Result;
}

// ── Default options ───────────────────────────────────────────────────────────

export const defaultOptions = {
  staleTime: 30 * 1_000, // 30 seconds
} satisfies QueryModule<Params, Result>["defaultOptions"];

// ── Enabled ───────────────────────────────────────────────────────────────────

export function enabled(params: Params): boolean {
  return !!params.did;
}
