/**
 * Locations query module.
 *
 * Scratch migration target:
 *   appCertifiedLocation(...) { edges { node { ... } } pageInfo }
 */

import { graphqlClient } from "@/lib/graphql-dev/client";
import type { QueryModule } from "@/lib/graphql-dev/create-query";
import type { BlobLike, ConnectionResult } from "../_migration-helpers";
import { connectionPageInfo, pluckConnectionNodes, toResolvedLegacyBlob } from "../_migration-helpers";

const PAGE_SIZE = 200;
const MAX_PAGES = 50;

const byDidDocument = /* GraphQL */ `
  query CertifiedLocationsByDid($did: String!, $first: Int!, $after: String) {
    appCertifiedLocation(
      where: { did: { eq: $did } }
      sortDirection: DESC
      sortBy: createdAt
      first: $first
      after: $after
    ) {
      edges {
        node {
          did
          uri
          rkey
          cid
          createdAt
          name
          description
          location {
            __typename
            ... on AppCertifiedLocationString {
              string
            }
            ... on OrgHypercertsDefsUri {
              uri
            }
            ... on OrgHypercertsDefsSmallBlob {
              blob {
                ref
                mimeType
                size
              }
            }
          }
          locationType
        }
      }
      pageInfo {
        endCursor
        hasNextPage
      }
    }
  }
`;

const byDidAndRkeyDocument = /* GraphQL */ `
  query CertifiedLocationByUri($uri: String!) {
    appCertifiedLocationByUri(uri: $uri) {
      did
      uri
      rkey
      cid
      createdAt
      name
      description
      location {
        __typename
        ... on AppCertifiedLocationString {
          string
        }
        ... on OrgHypercertsDefsUri {
          uri
        }
        ... on OrgHypercertsDefsSmallBlob {
          blob {
            ref
            mimeType
            size
          }
        }
      }
      locationType
    }
  }
`;

type CertifiedLocationNode = {
  did: string;
  uri: string;
  rkey: string;
  cid: string;
  createdAt: string;
  name: string | null;
  description: string | null;
  location:
    | { __typename: "AppCertifiedLocationString"; string: string }
    | { __typename: "OrgHypercertsDefsUri"; uri: string }
    | { __typename: "OrgHypercertsDefsSmallBlob"; blob: BlobLike }
    | null;
  locationType: string;
};

export type CertifiedLocation = {
  metadata: {
    did: string;
    uri: string;
    rkey: string;
    cid: string;
  };
  record: {
    name: string | null;
    description: string | null;
    location: unknown;
    locationType: string | null;
  };
};

type CertifiedLocationResponse = {
  appCertifiedLocation?: ConnectionResult<CertifiedLocationNode> | null;
};

type CertifiedLocationByUriResponse = {
  appCertifiedLocationByUri?: CertifiedLocationNode | null;
};

export type ByDidParams = { did: string };
export type ByDidAndRkeyParams = { did: string; rkey: string };
export type Params = ByDidParams | ByDidAndRkeyParams;
export type Result = CertifiedLocation[];

async function normalizeLocation(node: CertifiedLocationNode): Promise<CertifiedLocation> {
  let location: unknown = null;

  if (node.location?.__typename === "AppCertifiedLocationString") {
    location = { $type: "app.certified.location#string", string: node.location.string };
  } else if (node.location?.__typename === "OrgHypercertsDefsUri") {
    location = { $type: "org.hypercerts.defs#uri", uri: node.location.uri };
  } else if (node.location?.__typename === "OrgHypercertsDefsSmallBlob") {
    const blob = await toResolvedLegacyBlob(node.location.blob, node.did);
    location = {
      blob: blob
        ? {
            $type: "blob",
            ...blob,
          }
        : blob,
      $type: "org.hypercerts.defs#smallBlob",
    };
  }

  return {
    metadata: {
      did: node.did,
      uri: node.uri,
      rkey: node.rkey,
      cid: node.cid,
    },
    record: {
      name: node.name,
      description: node.description,
      location,
      locationType: node.locationType,
    },
  };
}

export async function fetch(params: Params): Promise<Result> {
  if ("rkey" in params) {
    const uri = `at://${params.did}/app.certified.location/${params.rkey}`;
    const res = await graphqlClient.request<CertifiedLocationByUriResponse>(byDidAndRkeyDocument, {
      uri,
    });
    return res.appCertifiedLocationByUri ? [await normalizeLocation(res.appCertifiedLocationByUri)] : [];
  }

  const nodes: CertifiedLocationNode[] = [];
  let after: string | null = null;
  const seenCursors = new Set<string>();
  let exceededMaxPages = true;

  for (let pageIndex = 0; pageIndex < MAX_PAGES; pageIndex += 1) {
    const res = await graphqlClient.request<CertifiedLocationResponse>(byDidDocument, {
      did: params.did,
      first: PAGE_SIZE,
      after,
    });
    const connection = res.appCertifiedLocation;

    nodes.push(...pluckConnectionNodes(connection));

    const page = connectionPageInfo(connection);
    if (!page.hasNextPage) {
      exceededMaxPages = false;
      break;
    }
    if (!page.endCursor) {
      throw new Error("appCertifiedLocation reported hasNextPage without an endCursor");
    }

    if (page.endCursor === after || seenCursors.has(page.endCursor)) {
      throw new Error(`appCertifiedLocation repeated cursor ${page.endCursor}`);
    }

    seenCursors.add(page.endCursor);
    after = page.endCursor;
  }

  if (exceededMaxPages) {
    throw new Error(`appCertifiedLocation exceeded ${MAX_PAGES} pages for ${params.did}`);
  }

  return Promise.all(nodes.map(normalizeLocation));
}

export const defaultOptions = {
  staleTime: 30 * 1_000,
} satisfies QueryModule<Params, Result>["defaultOptions"];

export function enabled(params: Params): boolean {
  return !!params.did;
}
