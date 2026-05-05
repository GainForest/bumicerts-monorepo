/**
 * Multimedia query module.
 *
 * Fetches all multimedia records for a DID.
 *
 * Leaf: queries.multimedia
 *
 * This query now uses gql.tada like the rest of the indexer layer.
 */

import {
  graphql,
  graphqlClient,
  type ResultOf,
} from "@/graphql/indexer";
import { ClientError } from "graphql-request";
import type { ConnectionNode } from "../_connection";
import {
  connectionPageInfo,
  pluckConnectionNodes,
  toResolvedLegacyBlob,
} from "../_migration-helpers";

const document = graphql(`
  query MultimediaByDid($did: String!, $first: Int, $after: String) {
    appGainforestAcMultimedia(
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
          occurrenceRef
          siteRef
          subjectPart
          subjectPartUri
          subjectOrientation
          file {
            ref
            mimeType
            size
          }
          format
          accessUri
          variantLiteral
          caption
          creator
          createDate
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

export type MultimediaItem = {
  metadata: {
    did: string;
    uri: string;
    rkey: string;
    cid: string;
    createdAt: string | null;
  };
  record: {
    occurrenceRef: string | null;
    siteRef: string | null;
    subjectPart: string | null;
    subjectPartUri: string | null;
    subjectOrientation: string | null;
    file: unknown;
    format: string | null;
    accessUri: string | null;
    variantLiteral: string | null;
    caption: string | null;
    creator: string | null;
    createDate: string | null;
    createdAt: string | null;
  };
};

type MultimediaNode = ConnectionNode<
  ResultOf<typeof document>["appGainforestAcMultimedia"]
>;

export type Params = { did: string };
export type Result = MultimediaItem[];

const PAGE_SIZE = 200;
const MAX_PAGES = 50;

let hasWarnedMissingMultimediaSchema = false;

function isUnsupportedMultimediaQueryError(error: unknown): boolean {
  if (!(error instanceof ClientError)) {
    return false;
  }

  return (
    error.response.errors?.some((item) => {
      const message = item.message.toLowerCase();

      return (
        (message.includes("cannot query field") &&
          message.includes("multimedia")) ||
        (message.includes("unknown field") &&
          message.includes("multimedia")) ||
        (message.includes("gainforestacnamespace") &&
          message.includes("multimedia"))
      );
    }) ?? false
  );
}

async function normalizeMultimedia(node: MultimediaNode): Promise<MultimediaItem> {
  const file = await toResolvedLegacyBlob(node.file, node.did);

  return {
    metadata: {
      did: node.did,
      uri: node.uri,
      rkey: node.rkey,
      cid: node.cid,
      createdAt: node.createdAt,
    },
    record: {
      occurrenceRef: node.occurrenceRef,
      siteRef: node.siteRef,
      subjectPart: node.subjectPart,
      subjectPartUri: node.subjectPartUri,
      subjectOrientation: node.subjectOrientation,
      file: file
        ? {
            $type: "blob",
            uri: file.uri,
            cid: file.cid,
            mimeType: file.mimeType,
            size: file.size,
          }
        : null,
      format: node.format,
      accessUri: node.accessUri,
      variantLiteral: node.variantLiteral,
      caption: node.caption,
      creator: node.creator,
      createDate: node.createDate,
      createdAt: node.createdAt,
    },
  } satisfies MultimediaItem;
}

export async function fetch(params: Params): Promise<Result> {
  try {
    const allMultimedia: MultimediaItem[] = [];
    let cursor: string | undefined;

    for (let page = 0; page < MAX_PAGES; page++) {
      const res = await graphqlClient.request(document, {
        did: params.did,
        first: PAGE_SIZE,
        after: cursor,
      });

       const multimedia = res.appGainforestAcMultimedia;
       allMultimedia.push(...(await Promise.all(pluckConnectionNodes(multimedia).map(normalizeMultimedia))));

      const pageInfo = connectionPageInfo(multimedia);
      if (pageInfo?.hasNextPage && pageInfo.endCursor) {
        if (page === MAX_PAGES - 1) {
          console.warn(
            `Multimedia query hit pagination safety cap for ${params.did}; results may be truncated.`,
          );
          break;
        }

        cursor = pageInfo.endCursor;
        continue;
      }

      break;
    }

    return allMultimedia;
  } catch (error) {
    if (isUnsupportedMultimediaQueryError(error)) {
      if (
        process.env.NODE_ENV !== "production" &&
        !hasWarnedMissingMultimediaSchema
      ) {
        hasWarnedMissingMultimediaSchema = true;
        console.warn(
           "Indexer schema does not expose appGainforestAcMultimedia yet; returning an empty multimedia list.",
         );
       }

      return [];
    }

    throw error;
  }
}
