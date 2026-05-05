import "server-only";

import {
  createGraphQLClient,
  graphql,
  type ResultOf,
} from "@/graphql/indexer";
import type { ConnectionNode } from "@/graphql/indexer/queries/_connection";
import { $parse as parseActorOrganizationRecord } from "@gainforest/generated/app/certified/actor/organization.defs";
import { $parse as parseActorProfileRecord } from "@gainforest/generated/app/certified/actor/profile.defs";
import type { OrganizationData } from "@/lib/types";
import type {
  Main as ActorOrganizationRecord,
} from "@gainforest/generated/app/certified/actor/organization.defs";
import type {
  Main as ActorProfileRecord,
} from "@gainforest/generated/app/certified/actor/profile.defs";
import type { OrganizationAccountState } from "./types";
import {
  normalizeOrganizationLongDescriptionForRecord,
  normalizeProfileAvatarForRecord,
  normalizeProfileBannerForRecord,
} from "./indexer-normalization";
import {
  AccountIndexerReadError,
  AccountRecordValidationError,
} from "./errors";
import { buildOrganizationDataFromOrganizationAccount } from "./organization-data";

const organizationListingDocument = graphql(`
  query AccountOrganizationListing($limit: Int!) {
    appCertifiedActorOrganization(
      first: $limit
      sortDirection: DESC
      sortBy: createdAt
    ) {
      edges {
        node {
          did
          rkey
          createdAt
          organizationType
          urls {
            label
            url
          }
          location {
            uri
            cid
          }
          foundedDate
          longDescription {
            __typename
            ... on OrgHypercertsDefsDescriptionString {
              value
              facets {
                index {
                  byteStart
                  byteEnd
                }
                features {
                  ... on AppBskyRichtextFacetMention { did }
                  ... on AppBskyRichtextFacetLink { uri }
                  ... on AppBskyRichtextFacetTag { tag }
                }
              }
            }
            ... on ComAtprotoRepoStrongRef {
              uri
              cid
            }
            ... on PubLeafletPagesLinearDocument {
              id
              blocks {
                alignment
                block {
                  __typename
                  ... on PubLeafletBlocksText {
                    plaintext
                    facets {
                      index {
                        byteStart
                        byteEnd
                      }
                      features {
                        __typename
                        ... on PubLeafletRichtextFacetLink { uri }
                        ... on PubLeafletRichtextFacetDidMention { did }
                        ... on PubLeafletRichtextFacetAtMention { atURI href }
                        ... on PubLeafletRichtextFacetId { id }
                      }
                    }
                  }
                  ... on PubLeafletBlocksHeader {
                    plaintext
                    level
                    facets {
                      index {
                        byteStart
                        byteEnd
                      }
                      features {
                        __typename
                        ... on PubLeafletRichtextFacetLink { uri }
                        ... on PubLeafletRichtextFacetDidMention { did }
                        ... on PubLeafletRichtextFacetAtMention { atURI href }
                        ... on PubLeafletRichtextFacetId { id }
                      }
                    }
                  }
                  ... on PubLeafletBlocksImage {
                    alt
                    aspectRatio {
                      width
                      height
                    }
                    image {
                      ref
                      mimeType
                      size
                    }
                  }
                  ... on PubLeafletBlocksBlockquote {
                    plaintext
                    facets {
                      index {
                        byteStart
                        byteEnd
                      }
                      features {
                        __typename
                        ... on PubLeafletRichtextFacetLink { uri }
                        ... on PubLeafletRichtextFacetDidMention { did }
                        ... on PubLeafletRichtextFacetAtMention { atURI href }
                        ... on PubLeafletRichtextFacetId { id }
                      }
                    }
                  }
                  ... on PubLeafletBlocksUnorderedList {
                    children {
                      checked
                      content {
                        __typename
                        ... on PubLeafletBlocksText {
                          plaintext
                          facets {
                            index {
                              byteStart
                              byteEnd
                            }
                            features {
                              __typename
                              ... on PubLeafletRichtextFacetLink { uri }
                              ... on PubLeafletRichtextFacetDidMention { did }
                              ... on PubLeafletRichtextFacetAtMention { atURI href }
                              ... on PubLeafletRichtextFacetId { id }
                            }
                          }
                        }
                        ... on PubLeafletBlocksHeader {
                          plaintext
                          level
                          facets {
                            index {
                              byteStart
                              byteEnd
                            }
                            features {
                              __typename
                              ... on PubLeafletRichtextFacetLink { uri }
                              ... on PubLeafletRichtextFacetDidMention { did }
                              ... on PubLeafletRichtextFacetAtMention { atURI href }
                              ... on PubLeafletRichtextFacetId { id }
                            }
                          }
                        }
                        ... on PubLeafletBlocksImage {
                          alt
                          aspectRatio {
                            width
                            height
                          }
                          image {
                            ref
                            mimeType
                            size
                          }
                        }
                      }
                    }
                  }
                  ... on PubLeafletBlocksCode {
                    language
                    plaintext
                    syntaxHighlightingTheme
                  }
                  ... on PubLeafletBlocksHorizontalRule {
                    empty
                  }
                  ... on PubLeafletBlocksIframe {
                    url
                    height
                  }
                  ... on PubLeafletBlocksWebsite {
                    src
                    title
                    description
                  }
                }
              }
            }
          }
          visibility
        }
      }
    }
  }
`);

const organizationAccountsDocument = graphql(`
  query AccountOrganizationAccounts($dids: [String!]!, $limit: Int!) {
    appCertifiedActorOrganization(
      where: { did: { in: $dids } }
      first: $limit
      sortDirection: DESC
      sortBy: createdAt
    ) {
      edges {
        node {
          did
          rkey
          createdAt
          organizationType
          urls {
            label
            url
          }
          location {
            uri
            cid
          }
          foundedDate
          longDescription {
            __typename
            ... on OrgHypercertsDefsDescriptionString {
              value
              facets {
                index {
                  byteStart
                  byteEnd
                }
                features {
                  ... on AppBskyRichtextFacetMention { did }
                  ... on AppBskyRichtextFacetLink { uri }
                  ... on AppBskyRichtextFacetTag { tag }
                }
              }
            }
            ... on ComAtprotoRepoStrongRef {
              uri
              cid
            }
            ... on PubLeafletPagesLinearDocument {
              id
              blocks {
                alignment
                block {
                  __typename
                  ... on PubLeafletBlocksText {
                    plaintext
                    facets {
                      index {
                        byteStart
                        byteEnd
                      }
                      features {
                        __typename
                        ... on PubLeafletRichtextFacetLink { uri }
                        ... on PubLeafletRichtextFacetDidMention { did }
                        ... on PubLeafletRichtextFacetAtMention { atURI href }
                        ... on PubLeafletRichtextFacetId { id }
                      }
                    }
                  }
                  ... on PubLeafletBlocksHeader {
                    plaintext
                    level
                    facets {
                      index {
                        byteStart
                        byteEnd
                      }
                      features {
                        __typename
                        ... on PubLeafletRichtextFacetLink { uri }
                        ... on PubLeafletRichtextFacetDidMention { did }
                        ... on PubLeafletRichtextFacetAtMention { atURI href }
                        ... on PubLeafletRichtextFacetId { id }
                      }
                    }
                  }
                  ... on PubLeafletBlocksImage {
                    alt
                    aspectRatio {
                      width
                      height
                    }
                    image {
                      ref
                      mimeType
                      size
                    }
                  }
                  ... on PubLeafletBlocksBlockquote {
                    plaintext
                    facets {
                      index {
                        byteStart
                        byteEnd
                      }
                      features {
                        __typename
                        ... on PubLeafletRichtextFacetLink { uri }
                        ... on PubLeafletRichtextFacetDidMention { did }
                        ... on PubLeafletRichtextFacetAtMention { atURI href }
                        ... on PubLeafletRichtextFacetId { id }
                      }
                    }
                  }
                  ... on PubLeafletBlocksUnorderedList {
                    children {
                      checked
                      content {
                        __typename
                        ... on PubLeafletBlocksText {
                          plaintext
                          facets {
                            index {
                              byteStart
                              byteEnd
                            }
                            features {
                              __typename
                              ... on PubLeafletRichtextFacetLink { uri }
                              ... on PubLeafletRichtextFacetDidMention { did }
                              ... on PubLeafletRichtextFacetAtMention { atURI href }
                              ... on PubLeafletRichtextFacetId { id }
                            }
                          }
                        }
                        ... on PubLeafletBlocksHeader {
                          plaintext
                          level
                          facets {
                            index {
                              byteStart
                              byteEnd
                            }
                            features {
                              __typename
                              ... on PubLeafletRichtextFacetLink { uri }
                              ... on PubLeafletRichtextFacetDidMention { did }
                              ... on PubLeafletRichtextFacetAtMention { atURI href }
                              ... on PubLeafletRichtextFacetId { id }
                            }
                          }
                        }
                        ... on PubLeafletBlocksImage {
                          alt
                          aspectRatio {
                            width
                            height
                          }
                          image {
                            ref
                            mimeType
                            size
                          }
                        }
                      }
                    }
                  }
                  ... on PubLeafletBlocksCode {
                    language
                    plaintext
                    syntaxHighlightingTheme
                  }
                  ... on PubLeafletBlocksHorizontalRule {
                    empty
                  }
                  ... on PubLeafletBlocksIframe {
                    url
                    height
                  }
                  ... on PubLeafletBlocksWebsite {
                    src
                    title
                    description
                  }
                }
              }
            }
          }
          visibility
        }
      }
    }
    appCertifiedActorProfile(
      where: { did: { in: $dids } }
      first: $limit
      sortDirection: DESC
      sortBy: createdAt
    ) {
      edges {
        node {
          did
          rkey
          createdAt
          displayName
          description
          pronouns
          website
          avatar {
            __typename
            ... on OrgHypercertsDefsUri {
              uri
            }
            ... on OrgHypercertsDefsSmallImage {
              image {
                ref
                mimeType
                size
              }
            }
          }
          banner {
            __typename
            ... on OrgHypercertsDefsUri {
              uri
            }
            ... on OrgHypercertsDefsLargeImage {
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
  }
`);

type OrganizationListingResponse = ResultOf<typeof organizationListingDocument>;
type OrganizationAccountsResponse = ResultOf<typeof organizationAccountsDocument>;
type OrganizationNode = ConnectionNode<
  OrganizationAccountsResponse["appCertifiedActorOrganization"]
>;
type ProfileNode = ConnectionNode<
  OrganizationAccountsResponse["appCertifiedActorProfile"]
>;

function getConnectionNodes<TNode>(
  connection:
    | {
        edges?: Array<{ node?: TNode | null } | null> | null;
      }
    | null
    | undefined,
): TNode[] {
  const nodes: TNode[] = [];

  for (const edge of connection?.edges ?? []) {
    if (edge?.node) {
      nodes.push(edge.node);
    }
  }

  return nodes;
}

async function requestOrganizationListing(
  limit: number,
): Promise<OrganizationListingResponse> {
  try {
    const client = createGraphQLClient();
    return await client.request(organizationListingDocument, { limit });
  } catch (cause) {
    throw new AccountIndexerReadError({
      operation: "AccountOrganizationListing",
      message: "Indexer request failed for AccountOrganizationListing",
      cause,
    });
  }
}

async function requestOrganizationAccounts(
  operation: "AccountOrganizationsByDid" | "AccountOrganizationListingAccounts",
  dids: string[],
  limit: number,
): Promise<OrganizationAccountsResponse> {
  try {
    const client = createGraphQLClient();
    return await client.request(organizationAccountsDocument, { dids, limit });
  } catch (cause) {
    throw new AccountIndexerReadError({
      operation,
      message: `Indexer request failed for ${operation}`,
      cause,
    });
  }
}

function parseOrganizationRecord(
  node: OrganizationNode,
): { did: string; record: ActorOrganizationRecord } {
  if (!node.did || !node.createdAt) {
    throw new AccountRecordValidationError({
      did: node.did ?? "",
      collection: "app.certified.actor.organization",
      rkey: node.rkey ?? "self",
      cause: new Error("Missing required did or createdAt field"),
    });
  }

  try {
    return {
      did: node.did,
      record: parseActorOrganizationRecord({
        $type: "app.certified.actor.organization",
        organizationType: node.organizationType ?? undefined,
        urls: node.urls ?? undefined,
        location:
          node.location?.uri && node.location?.cid
            ? {
                uri: node.location.uri,
                cid: node.location.cid,
              }
            : undefined,
        foundedDate: node.foundedDate ?? undefined,
        longDescription:
          normalizeOrganizationLongDescriptionForRecord(
            node.longDescription,
          ) ?? undefined,
        visibility: node.visibility ?? undefined,
        createdAt: node.createdAt,
      }),
    };
  } catch (cause) {
    throw new AccountRecordValidationError({
      did: node.did,
      collection: "app.certified.actor.organization",
      rkey: node.rkey ?? "self",
      cause,
    });
  }
}

async function parseProfileRecord(
  node: ProfileNode,
): Promise<{ did: string; record: ActorProfileRecord }> {
  if (!node.did || !node.createdAt) {
    throw new AccountRecordValidationError({
      did: node.did ?? "",
      collection: "app.certified.actor.profile",
      rkey: node.rkey ?? "self",
      cause: new Error("Missing required did or createdAt field"),
    });
  }

  try {
    const avatar = await normalizeProfileAvatarForRecord(node.avatar, node.did);
    const banner = await normalizeProfileBannerForRecord(node.banner, node.did);

    return {
      did: node.did,
      record: parseActorProfileRecord({
        $type: "app.certified.actor.profile",
        displayName: node.displayName ?? undefined,
        description: node.description ?? undefined,
        pronouns: node.pronouns ?? undefined,
        website: node.website ?? undefined,
        avatar: avatar ?? undefined,
        banner: banner ?? undefined,
        createdAt: node.createdAt,
      }),
    };
  } catch (cause) {
    throw new AccountRecordValidationError({
      did: node.did,
      collection: "app.certified.actor.profile",
      rkey: node.rkey ?? "self",
      cause,
    });
  }
}

function tryParseOrganizationRecord(
  node: OrganizationNode,
): { did: string; record: ActorOrganizationRecord } | null {
  try {
    return parseOrganizationRecord(node);
  } catch (error) {
    console.warn(
      "[account/list] Skipping invalid Certified organization record",
      node.did,
      error,
    );
    return null;
  }
}

async function tryParseProfileRecord(
  node: ProfileNode,
): Promise<{ did: string; record: ActorProfileRecord } | null> {
  try {
    return await parseProfileRecord(node);
  } catch (error) {
    console.warn(
      "[account/list] Skipping invalid Certified profile record",
      node.did,
      error,
    );
    return null;
  }
}

async function buildOrganizationAccountMapFromResponse(
  response: OrganizationAccountsResponse,
): Promise<Map<string, OrganizationAccountState>> {
  const profileByDid = new Map<string, ActorProfileRecord>();

  const parsedProfiles = await Promise.all(
    getConnectionNodes(response.appCertifiedActorProfile).map((node) =>
      tryParseProfileRecord(node),
    ),
  );

  for (const parsed of parsedProfiles) {
    if (!parsed || profileByDid.has(parsed.did)) continue;
    profileByDid.set(parsed.did, parsed.record);
  }

  const organizationByDid = new Map<string, ActorOrganizationRecord>();

  for (const node of getConnectionNodes(response.appCertifiedActorOrganization)) {
    const parsed = tryParseOrganizationRecord(node);
    if (!parsed || organizationByDid.has(parsed.did)) continue;
    organizationByDid.set(parsed.did, parsed.record);
  }

  const accountByDid = new Map<string, OrganizationAccountState>();

  for (const [did, organization] of organizationByDid) {
    const profile = profileByDid.get(did);
    if (!profile) continue;

    accountByDid.set(did, {
      kind: "organization",
      did,
      profile,
      organization,
    });
  }

  return accountByDid;
}

export async function readOrganizationAccountsByDids(
  dids: string[],
): Promise<Map<string, OrganizationAccountState>> {
  const uniqueDids = Array.from(new Set(dids.filter(Boolean)));
  if (uniqueDids.length === 0) {
    return new Map();
  }

  const response = await requestOrganizationAccounts(
    "AccountOrganizationsByDid",
    uniqueDids,
    uniqueDids.length,
  );

  return await buildOrganizationAccountMapFromResponse(response);
}

export async function listOrganizationData(options?: {
  limit?: number;
}): Promise<OrganizationData[]> {
  const limit = options?.limit ?? 1000;
  const response = await requestOrganizationListing(limit);

  const dids = Array.from(
    new Set(
      getConnectionNodes(response.appCertifiedActorOrganization)
        .map((node) => node.did)
        .filter((did): did is string => Boolean(did)),
    ),
  );

  if (dids.length === 0) {
    return [];
  }

  const accountsResponse = await requestOrganizationAccounts(
    "AccountOrganizationListingAccounts",
    dids,
    dids.length,
  );

  const accountByDid = await buildOrganizationAccountMapFromResponse(
    accountsResponse,
  );

  return dids
    .map((did) => accountByDid.get(did))
    .filter((account): account is OrganizationAccountState => Boolean(account))
    .map((account) => buildOrganizationDataFromOrganizationAccount(account));
}
