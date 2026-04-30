/**
 * Attachments query module.
 *
 * Scratch migration target:
 *   orgHypercertsContextAttachment(...) + appGainforestOrganizationInfo(...)
 */

import { GraphQLClient } from "graphql-request";
import type { BlobLike, ConnectionResult, StrongRefLike } from "../_migration-helpers";
import {
  connectionPageInfo,
  normalizeBskyFacets,
  pluckConnectionNodes,
  toLegacyStrongRef,
  toResolvedLegacyBlob,
} from "../_migration-helpers";

const PAGE_SIZE = 100;

const indexerUrl = process.env.NEXT_PUBLIC_INDEXER_URL;

if (!indexerUrl) {
  throw new Error("NEXT_PUBLIC_INDEXER_URL must be set for attachments queries");
}

const graphqlClient = new GraphQLClient(indexerUrl, {
  headers: {
    "ngrok-skip-browser-warning": "true",
  },
});

const byDidDocument = /* GraphQL */ `
  query AttachmentsByDid($did: String!, $first: Int!, $after: String) {
    orgHypercertsContextAttachment(
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
          title
          shortDescription
          description {
            __typename
            ... on OrgHypercertsDefsDescriptionString {
              value
              facets {
                index { byteStart byteEnd }
                features {
                  ... on AppBskyRichtextFacetMention { did }
                  ... on AppBskyRichtextFacetLink { uri }
                  ... on AppBskyRichtextFacetTag { tag }
                }
              }
            }
            ... on ComAtprotoRepoStrongRef { uri cid }
            ... on PubLeafletPagesLinearDocument {
              id
              blocks {
                alignment
                block {
                  __typename
                  ... on PubLeafletBlocksText {
                    plaintext
                  }
                  ... on PubLeafletBlocksHeader {
                    plaintext
                    level
                  }
                  ... on PubLeafletBlocksImage {
                    alt
                    image {
                      ref
                      mimeType
                      size
                    }
                  }
                }
              }
            }
          }
          contentType
          subjects { uri cid }
          content {
            __typename
            ... on OrgHypercertsDefsUri { uri }
            ... on OrgHypercertsDefsSmallBlob {
              blob { ref mimeType size }
            }
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
`;

const orgInfoDocument = /* GraphQL */ `
  query AttachmentOrgInfo($did: String!) {
    appGainforestOrganizationInfo(where: { did: { eq: $did } }, first: 1) {
      edges {
        node {
          did
          displayName
          logo { image { ref mimeType size } }
        }
      }
    }
  }
`;

type AttachmentNode = {
  did: string;
  uri: string;
  rkey: string;
  cid: string;
  createdAt: string;
  title: string;
  shortDescription: string | null;
  description: unknown;
  contentType: string | null;
  subjects: Array<StrongRefLike | null> | null;
  content: Array<{ uri?: string | null; blob?: BlobLike | null } | null> | null;
};

type DescriptionStringNode = {
  value?: string | null;
  facets?: Array<{
    index?: {
      byteStart?: number | null;
      byteEnd?: number | null;
    } | null;
    features?: Array<{ did?: string; uri?: string; tag?: string } | null> | null;
  } | null> | null;
};

type LeafletBlockNode = {
  alignment?: string | null;
  block?: {
    __typename?: string | null;
    plaintext?: string | null;
    level?: number | null;
    alt?: string | null;
    image?: BlobLike | null;
  } | null;
};

type LeafletDocumentNode = {
  id?: string | null;
  blocks?: Array<LeafletBlockNode | null> | null;
};

type OrgNode = {
  did: string;
  displayName: string;
  logo: { image?: BlobLike | null } | null;
};

type AttachmentResponse = {
  orgHypercertsContextAttachment?: ConnectionResult<AttachmentNode> | null;
};

type OrgResponse = {
  appGainforestOrganizationInfo?: ConnectionResult<OrgNode> | null;
};

export type AttachmentItem = {
  metadata: {
    did: string | null;
    uri: string | null;
    rkey: string | null;
    cid: string | null;
    createdAt: string | null;
    indexedAt: string | null;
  };
  creatorInfo: {
    did: string | null;
    organizationName: string | null;
    organizationLogo: { uri: string | null; cid: string | null; mimeType: string | null; size: number | null } | null;
  } | null;
  record: {
    title: string | null;
    shortDescription: string | null;
    description: unknown;
    contentType: string | null;
    subjects: Array<{ uri: string | null; cid: string | null }> | null;
    content: unknown;
    createdAt: string | null;
  };
};

export type Params = { did: string };
export type Result = AttachmentItem[];

async function normalizeContent(items: AttachmentNode["content"], did: string): Promise<unknown> {
  return Promise.all((items ?? []).map(async (item) => {
    if (!item) return null;
    if (item.uri) {
      return {
        uri: item.uri,
        $type: "org.hypercerts.defs#uri",
      };
    }
    if (item.blob) {
      const blob = await toResolvedLegacyBlob(item.blob, did);
      return {
        blob: blob
          ? {
              $type: "blob",
              uri: blob.uri,
              cid: blob.cid,
              mimeType: blob.mimeType,
              size: blob.size,
            }
          : blob,
        $type: "org.hypercerts.defs#smallBlob",
      };
    }
    return null;
  }));
}

function normalizeLeafletBlock(value: LeafletBlockNode): unknown {
  const block = value.block;

  if (!block?.__typename) {
    return block ?? null;
  }

  if (block.__typename === "PubLeafletBlocksText") {
    return {
      $type: "pub.leaflet.blocks.text",
      plaintext: block.plaintext ?? "",
    };
  }

  if (block.__typename === "PubLeafletBlocksHeader") {
    return {
      $type: "pub.leaflet.blocks.header",
      plaintext: block.plaintext ?? "",
      level: block.level ?? null,
    };
  }

  if (block.__typename === "PubLeafletBlocksImage") {
    return {
      $type: "pub.leaflet.blocks.image",
      alt: block.alt ?? null,
      image: block.image
        ? {
            $type: "blob",
            ref: block.image.ref ?? null,
            mimeType: block.image.mimeType ?? null,
            size: block.image.size ?? null,
          }
        : null,
    };
  }

  return block;
}

function normalizeAttachmentDescription(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;

  const record = value as DescriptionStringNode & StrongRefLike & LeafletDocumentNode;

  if (typeof record.value === "string") {
    return {
      $type: "org.hypercerts.defs#descriptionString",
      value: record.value,
      facets: normalizeBskyFacets(record.facets),
    };
  }

  if ("uri" in record || "cid" in record) {
    return toLegacyStrongRef(record);
  }

  if (Array.isArray(record.blocks)) {
    return {
      $type: "pub.leaflet.pages.linearDocument",
      blocks: record.blocks.map((block) => ({
        $type: "pub.leaflet.pages.linearDocument#block",
        ...(block?.alignment ? { alignment: block.alignment } : {}),
        block: normalizeLeafletBlock(block ?? {}),
      })),
    };
  }

  return value;
}

async function fetchAllAttachments(did: string): Promise<AttachmentNode[]> {
  const nodes: AttachmentNode[] = [];
  let after: string | null = null;

  while (true) {
    const res = await graphqlClient.request<AttachmentResponse>(byDidDocument, {
      did,
      first: PAGE_SIZE,
      after,
    });
    const connection = res.orgHypercertsContextAttachment;

    nodes.push(...pluckConnectionNodes(connection));

    const page = connectionPageInfo(connection);
    if (!page.hasNextPage) {
      return nodes;
    }

    if (!page.endCursor) {
      throw new Error(`orgHypercertsContextAttachment for ${did} is missing endCursor while hasNextPage is true`);
    }

    after = page.endCursor;
  }
}

export async function fetch(params: Params): Promise<Result> {
  const [res, orgRes] = await Promise.all([
    fetchAllAttachments(params.did),
    graphqlClient.request<OrgResponse>(orgInfoDocument, { did: params.did }),
  ]);

  const org = pluckConnectionNodes(orgRes.appGainforestOrganizationInfo)[0] ?? null;
  const creatorInfo = org
    ? {
        did: org.did,
        organizationName: org.displayName,
        organizationLogo: await toResolvedLegacyBlob(org.logo?.image ?? null, org.did),
      }
    : null;

  return Promise.all(
    res.map(async (node) => ({
      metadata: {
        did: node.did,
        uri: node.uri,
        rkey: node.rkey,
        cid: node.cid,
        createdAt: node.createdAt,
        indexedAt: null,
      },
      creatorInfo,
      record: {
        title: node.title,
        shortDescription: node.shortDescription,
        description: normalizeAttachmentDescription(node.description),
        contentType: node.contentType,
        subjects: (node.subjects ?? []).map((subject) => toLegacyStrongRef(subject) ?? { uri: null, cid: null }),
        content: await normalizeContent(node.content, node.did),
        createdAt: node.createdAt,
      },
    })),
  );
}

export const defaultOptions = {
  staleTime: 60 * 1_000,
};

export function enabled(params: Params): boolean {
  return !!params.did;
}
