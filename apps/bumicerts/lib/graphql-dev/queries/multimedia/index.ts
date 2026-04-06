/**
 * Multimedia query module.
 *
 * Params:
 *   { did } → MultimediaItem[] (all multimedia records for a DID)
 *
 * Leaf: queries.multimedia
 *
 * Note: this query is written as a raw GraphQL string instead of gql.tada
 * because the checked-in `graphql-env.d.ts` schema snapshot does not yet
 * include `gainforest.ac.multimedia`, even though the live indexer does.
 */

import { graphqlClient } from "@/lib/graphql-dev/client";
import type { QueryModule } from "@/lib/graphql-dev/create-query";
import { ClientError } from "graphql-request";

const document = /* GraphQL */ `
  query MultimediaByDid($did: String!) {
    gainforest {
      ac {
        multimedia(where: { did: $did }, order: DESC, sortBy: CREATED_AT) {
          data {
            metadata {
              did
              uri
              rkey
              cid
              createdAt
            }
            record {
              occurrenceRef
              siteRef
              subjectPart
              subjectPartUri
              subjectOrientation
              file
              format
              accessUri
              variantLiteral
              caption
              creator
              createDate
              createdAt
            }
          }
        }
      }
    }
  }
`;

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

type MultimediaResponse = {
  gainforest?: {
    ac?: {
      multimedia?: {
        data?: MultimediaItem[] | null;
      } | null;
    } | null;
  } | null;
};

export type Params = { did: string };
export type Result = MultimediaItem[];

let hasWarnedMissingMultimediaSchema = false;

function isUnsupportedMultimediaQueryError(error: unknown): boolean {
  if (!(error instanceof ClientError)) {
    return false;
  }

  return error.response.errors?.some((item) => {
    const message = item.message.toLowerCase();

    return (
      (message.includes("cannot query field") && message.includes("multimedia")) ||
      (message.includes("unknown field") && message.includes("multimedia")) ||
      (message.includes("gainforestacnamespace") && message.includes("multimedia"))
    );
  }) ?? false;
}

export async function fetch(params: Params): Promise<Result> {
  try {
    const res = await graphqlClient.request<MultimediaResponse>(document, {
      did: params.did,
    });

    return res.gainforest?.ac?.multimedia?.data ?? [];
  } catch (error) {
    if (isUnsupportedMultimediaQueryError(error)) {
      if (
        process.env.NODE_ENV !== "production" &&
        !hasWarnedMissingMultimediaSchema
      ) {
        hasWarnedMissingMultimediaSchema = true;
        console.warn(
          "Indexer schema does not expose gainforest.ac.multimedia yet; returning an empty multimedia list."
        );
      }

      return [];
    }

    throw error;
  }
}

export const defaultOptions = {
  staleTime: 30 * 1_000,
} satisfies QueryModule<Params, Result>["defaultOptions"];

export function enabled(params: Params): boolean {
  return !!params.did;
}
