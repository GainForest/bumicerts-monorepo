/**
 * Audio recordings query module.
 *
 * Scratch migration target:
 *   appGainforestAcAudio(...) { edges { node { ... } } }
 */

import {
  graphql,
  graphqlClient,
  type ResultOf,
} from "@/graphql/indexer";
import type { ConnectionNode } from "../_connection";
import { connectionPageInfo, normalizeBskyFacets, pluckConnectionNodes, toResolvedLegacyBlob } from "../_migration-helpers";

const document = graphql(`
  query AudioRecordingsByDid($did: String!, $first: Int, $after: String) {
    appGainforestAcAudio(
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
          name
          description {
            text
            facets {
              index {
                byteStart
                byteEnd
              }
              features {
                ... on AppBskyRichtextFacetMention {
                  did
                }
                ... on AppBskyRichtextFacetLink {
                  uri
                }
                ... on AppBskyRichtextFacetTag {
                  tag
                }
              }
            }
          }
          blob {
            file {
              ref
              mimeType
              size
            }
          }
          metadata {
            bitDepth
            channels
            codec
            duration
            fileFormat
            fileSizeBytes
            filterHighPassHz
            filterLowPassHz
            maxFrequencyHz
            minFrequencyHz
            recordedAt
            sampleRate
            signalToNoiseRatio
          }
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

type AudioNode = ConnectionNode<ResultOf<typeof document>["appGainforestAcAudio"]>;

export type AudioRecordingItem = {
  metadata: {
    did: string;
    uri: string;
    rkey: string;
    cid: string;
  };
  record: {
    name: string | null;
    description: unknown;
    createdAt: string | null;
    blob: unknown;
    metadata: unknown;
  };
};

export type Params = { did: string };
export type Result = AudioRecordingItem[];

const PAGE_SIZE = 200;
const MAX_PAGES = 50;

function withDefinedValue<Key extends string, Value>(record: Record<Key, Value>, key: Key, value: Value | null | undefined) {
  if (value !== null && value !== undefined) {
    record[key] = value;
  }
}

function normalizeAudioDescription(description: AudioNode["description"]): unknown {
  if (!description) {
    return null;
  }

  const normalizedFacets = normalizeBskyFacets(description.facets);
  const normalized: Record<string, unknown> = {
    text: description.text ?? "",
    $type: "app.gainforest.common.defs#richtext",
  };

  if (normalizedFacets.length > 0) {
    normalized.facets = normalizedFacets;
  }

  return normalized;
}

function normalizeAudioBlob(blob: Awaited<ReturnType<typeof toResolvedLegacyBlob>>): unknown {
  if (!blob) {
    return null;
  }

  return {
    file: {
      $type: "blob",
      uri: blob.uri,
      cid: blob.cid,
      mimeType: blob.mimeType,
      size: blob.size,
    },
    $type: "app.gainforest.common.defs#audio",
  };
}

function normalizeAudioMetadata(metadata: AudioNode["metadata"]): unknown {
  if (!metadata) {
    return null;
  }

  const normalized: Record<string, unknown> = {
    $type: "app.gainforest.ac.audio#metadata",
  };

  withDefinedValue(normalized, "codec", metadata.codec);
  withDefinedValue(normalized, "channels", metadata.channels);
  withDefinedValue(normalized, "duration", metadata.duration);
  withDefinedValue(normalized, "recordedAt", metadata.recordedAt);
  withDefinedValue(normalized, "sampleRate", metadata.sampleRate);
  withDefinedValue(normalized, "bitDepth", metadata.bitDepth);
  withDefinedValue(normalized, "fileFormat", metadata.fileFormat);
  withDefinedValue(normalized, "fileSizeBytes", metadata.fileSizeBytes);
  withDefinedValue(normalized, "filterHighPassHz", metadata.filterHighPassHz);
  withDefinedValue(normalized, "filterLowPassHz", metadata.filterLowPassHz);
  withDefinedValue(normalized, "maxFrequencyHz", metadata.maxFrequencyHz);
  withDefinedValue(normalized, "minFrequencyHz", metadata.minFrequencyHz);
  withDefinedValue(normalized, "signalToNoiseRatio", metadata.signalToNoiseRatio);

  return normalized;
}

async function normalizeAudio(node: AudioNode): Promise<AudioRecordingItem> {
  const resolvedBlob = await toResolvedLegacyBlob(node.blob?.file ?? null, node.did);

  return {
    metadata: {
      did: node.did,
      uri: node.uri,
      rkey: node.rkey,
      cid: node.cid,
    },
    record: {
      name: node.name,
      description: normalizeAudioDescription(node.description),
      createdAt: node.createdAt,
      blob: normalizeAudioBlob(resolvedBlob),
      metadata: normalizeAudioMetadata(node.metadata),
    },
  } satisfies AudioRecordingItem;
}

export async function fetch(params: Params): Promise<Result> {
  const allAudio: AudioRecordingItem[] = [];
  let cursor: string | undefined;
  let hasMorePages = false;

  for (let page = 0; page < MAX_PAGES; page++) {
    const res = await graphqlClient.request(document, {
      did: params.did,
      first: PAGE_SIZE,
      after: cursor,
    });

    const audio = res.appGainforestAcAudio;
    allAudio.push(...(await Promise.all(pluckConnectionNodes(audio).map(normalizeAudio))));

    const pageInfo = connectionPageInfo(audio);
    hasMorePages = pageInfo.hasNextPage;

    if (pageInfo.hasNextPage && !pageInfo.endCursor) {
      throw new Error("appGainforestAcAudio returned hasNextPage=true without endCursor");
    }

    if (pageInfo.hasNextPage && pageInfo.endCursor) {
      cursor = pageInfo.endCursor;
      continue;
    }

    cursor = undefined;
    break;
  }

  if (hasMorePages && cursor) {
    throw new Error(`appGainforestAcAudio pagination exceeded ${MAX_PAGES} pages`);
  }

  return allAudio;
}
