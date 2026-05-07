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
  normalizeActorOrganizationRecordCandidate,
  normalizeActorProfileRecordCandidate,
} from "./record-normalization";
import {
  AccountIndexerReadError,
  AccountRecordValidationError,
} from "./errors";
import { buildOrganizationDataFromOrganizationAccount } from "./organization-data";

const ORGANIZATION_ACTIVITY_COUNT_PAGE_SIZE = 500;
const MAX_ORGANIZATION_ACTIVITY_COUNT_PAGES = 200;

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

const organizationActivityCountDocument = graphql(`
  query AccountOrganizationActivityCounts(
    $dids: [String!]!
    $first: Int!
    $after: String
  ) {
    orgHypercertsClaimActivity(
      where: { did: { in: $dids } }
      first: $first
      after: $after
      sortDirection: DESC
      sortBy: createdAt
    ) {
      edges {
        node {
          did
        }
      }
      pageInfo {
        endCursor
        hasNextPage
      }
    }
  }
`);

type OrganizationListingResponse = ResultOf<typeof organizationListingDocument>;
type OrganizationAccountsResponse = ResultOf<typeof organizationAccountsDocument>;
type OrganizationActivityCountResponse = ResultOf<
  typeof organizationActivityCountDocument
>;
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

async function requestOrganizationActivityCounts(
  dids: string[],
  first: number,
  after: string | undefined,
): Promise<OrganizationActivityCountResponse> {
  try {
    const client = createGraphQLClient();
    return await client.request(organizationActivityCountDocument, {
      dids,
      first,
      after,
    });
  } catch (cause) {
    throw new AccountIndexerReadError({
      operation: "AccountOrganizationActivityCounts",
      message: "Indexer request failed for AccountOrganizationActivityCounts",
      cause,
    });
  }
}

async function countOrganizationActivitiesByDid(
  dids: string[],
): Promise<Map<string, number>> {
  const counts = new Map(dids.map((did) => [did, 0]));
  let after: string | undefined;
  const seenCursors = new Set<string>();

  for (
    let pageIndex = 0;
    pageIndex < MAX_ORGANIZATION_ACTIVITY_COUNT_PAGES;
    pageIndex += 1
  ) {
    const response = await requestOrganizationActivityCounts(
      dids,
      ORGANIZATION_ACTIVITY_COUNT_PAGE_SIZE,
      after,
    );

    for (const node of getConnectionNodes(response.orgHypercertsClaimActivity)) {
      if (!node.did) continue;
      counts.set(node.did, (counts.get(node.did) ?? 0) + 1);
    }

    const endCursor =
      response.orgHypercertsClaimActivity?.pageInfo?.endCursor ?? undefined;
    const hasNextPage =
      response.orgHypercertsClaimActivity?.pageInfo?.hasNextPage ?? false;

    if (!hasNextPage) {
      return counts;
    }

    if (!endCursor) {
      throw new AccountIndexerReadError({
        operation: "AccountOrganizationActivityCounts",
        message:
          "orgHypercertsClaimActivity reported hasNextPage without an endCursor while counting activities",
      });
    }

    if (endCursor === after || seenCursors.has(endCursor)) {
      throw new AccountIndexerReadError({
        operation: "AccountOrganizationActivityCounts",
        message: `orgHypercertsClaimActivity repeated cursor ${endCursor} while counting activities`,
      });
    }

    seenCursors.add(endCursor);
    after = endCursor;
  }

  throw new AccountIndexerReadError({
    operation: "AccountOrganizationActivityCounts",
    message: `orgHypercertsClaimActivity exceeded ${MAX_ORGANIZATION_ACTIVITY_COUNT_PAGES} pages while counting activities`,
  });
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
      record: parseActorOrganizationRecord(
        normalizeActorOrganizationRecordCandidate({
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
      ),
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
      record: parseActorProfileRecord(
        normalizeActorProfileRecordCandidate({
          displayName: node.displayName ?? undefined,
          description: node.description ?? undefined,
          pronouns: node.pronouns ?? undefined,
          website: node.website ?? undefined,
          avatar: avatar ?? undefined,
          banner: banner ?? undefined,
          createdAt: node.createdAt,
        }),
      ),
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

  const [accountsResponse, bumicertCounts] = await Promise.all([
    requestOrganizationAccounts(
      "AccountOrganizationListingAccounts",
      dids,
      dids.length,
    ),
    countOrganizationActivitiesByDid(dids),
  ]);

  const accountByDid = await buildOrganizationAccountMapFromResponse(
    accountsResponse,
  );

  return dids
    .map((did) => accountByDid.get(did))
    .filter((account): account is OrganizationAccountState => Boolean(account))
    .map((account) =>
      buildOrganizationDataFromOrganizationAccount(
        account,
        bumicertCounts.get(account.did) ?? 0,
      ),
    );
}
