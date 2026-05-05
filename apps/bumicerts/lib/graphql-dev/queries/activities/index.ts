/**
 * Activities query module.
 *
 * Current read path:
 *   orgHypercertsClaimActivity(...) + Certified actor account enrichment + appGainforestFundingConfigByUri
 */

import { graphqlClient } from "@/lib/graphql-dev/client";
import type { QueryModule } from "@/lib/graphql-dev/create-query";
import type { OrganizationAccountState } from "@/lib/account";
import { readOrganizationAccountsByDids } from "@/lib/account/list";
import { buildOrganizationDataFromOrganizationAccount } from "@/lib/account/organization-data";
import type { BskyFacet, BlobLike, ConnectionResult, StrongRefLike } from "../_migration-helpers";
import { normalizeBskyFacets, pluckConnectionNodes, toLegacyStrongRef, toResolvedLegacyBlob } from "../_migration-helpers";
import { fetchHyperlabelActivitiesForTier, fetchHyperlabelForDid } from "../_hyperlabel";

const LEGACY_DEFAULT_LIMIT = 50;
const LEGACY_MAX_LIMIT = 100;
const MAX_DID_PAGES = 50;

const byDidDocument = /* GraphQL */ `
  query ActivitiesByDid($did: String!, $first: Int, $after: String) {
    orgHypercertsClaimActivity(
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
          shortDescriptionFacets {
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
          description {
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
          image {
            __typename
            ... on OrgHypercertsDefsUri { uri }
            ... on OrgHypercertsDefsSmallImage {
              image {
                ref
                mimeType
                size
              }
            }
          }
          workScope
          contributors {
            contributionWeight
            contributorIdentity {
              __typename
              ... on OrgHypercertsClaimActivityContributorIdentity { identity }
              ... on ComAtprotoRepoStrongRef { uri cid }
            }
            contributionDetails {
              __typename
              ... on OrgHypercertsClaimActivityContributorRole { role }
              ... on ComAtprotoRepoStrongRef { uri cid }
            }
          }
          startDate
          endDate
          locations {
            uri
            cid
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

const activityListPageDocument = /* GraphQL */ `
  query ActivitiesListPage($first: Int, $after: String) {
    orgHypercertsClaimActivity(
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
          image {
            __typename
            ... on OrgHypercertsDefsUri { uri }
            ... on OrgHypercertsDefsSmallImage { image { ref mimeType size } }
          }
        }
      }
      pageInfo {
        endCursor
        hasNextPage
      }
    }
  }
`;

const activityByUriDocument = /* GraphQL */ `
  query ActivityByUri($uri: String!) {
    orgHypercertsClaimActivityByUri(uri: $uri) {
      did
      uri
      rkey
      cid
      createdAt
      title
      shortDescription
      shortDescriptionFacets {
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
      description {
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
      image {
        __typename
        ... on OrgHypercertsDefsUri { uri }
        ... on OrgHypercertsDefsSmallImage {
          image {
            ref
            mimeType
            size
          }
        }
      }
      workScope
      contributors {
        contributionWeight
        contributorIdentity {
          __typename
          ... on OrgHypercertsClaimActivityContributorIdentity { identity }
          ... on ComAtprotoRepoStrongRef { uri cid }
        }
        contributionDetails {
          __typename
          ... on OrgHypercertsClaimActivityContributorRole { role }
          ... on ComAtprotoRepoStrongRef { uri cid }
        }
      }
      startDate
      endDate
      locations {
        uri
        cid
      }
    }
  }
`;

const fundingConfigDocument = /* GraphQL */ `
  query ActivityFundingConfig($uri: String!) {
    appGainforestFundingConfigByUri(uri: $uri) {
      receivingWallet {
        ... on AppGainforestFundingConfigEvmLinkRef { uri }
      }
      status
      goalInUSD
      minDonationInUSD
      maxDonationInUSD
      allowOversell
      createdAt
      updatedAt
    }
  }
`;

type ActivityImageNode =
  | { __typename: "OrgHypercertsDefsUri"; uri: string }
  | { __typename: "OrgHypercertsDefsSmallImage"; image?: BlobLike | null }
  | null;

type LeafletRichtextFeature =
  | { __typename: "PubLeafletRichtextFacetLink"; uri: string }
  | { __typename: "PubLeafletRichtextFacetDidMention"; did: string }
  | { __typename: "PubLeafletRichtextFacetAtMention"; atURI: string; href?: string | null }
  | { __typename: "PubLeafletRichtextFacetBold" }
  | { __typename: "PubLeafletRichtextFacetItalic" }
  | { __typename: "PubLeafletRichtextFacetCode" }
  | { __typename: "PubLeafletRichtextFacetStrikethrough" }
  | { __typename: "PubLeafletRichtextFacetUnderline" }
  | { __typename: "PubLeafletRichtextFacetHighlight" }
  | { __typename: "PubLeafletRichtextFacetId"; id?: string | null };

type LeafletFacet = {
  index?: {
    byteStart?: number | null;
    byteEnd?: number | null;
  } | null;
  features?: Array<LeafletRichtextFeature | null> | null;
};

type LeafletBlockNode = {
  __typename?: string;
  plaintext?: string | null;
  level?: number | null;
  alt?: string | null;
  image?: BlobLike | null;
  facets?: Array<LeafletFacet | null> | null;
};

type ActivityListPageNode = {
  did: string;
  uri: string;
  rkey: string;
  cid: string;
  createdAt: string;
  image: ActivityImageNode;
};

type ActivityDetailNode = {
  did: string;
  uri: string;
  rkey: string;
  cid: string;
  createdAt: string;
  title: string;
  shortDescription: string;
  shortDescriptionFacets: Array<BskyFacet | null> | null;
  description:
    | {
        __typename?: "OrgHypercertsDefsDescriptionString";
        value?: string | null;
        facets?: Array<BskyFacet | null> | null;
      }
    | {
        __typename?: "ComAtprotoRepoStrongRef";
        uri?: string | null;
        cid?: string | null;
      }
    | {
        __typename?: "PubLeafletPagesLinearDocument";
        id?: string | null;
        blocks?: Array<{ alignment?: string | null; block?: LeafletBlockNode | null } | null> | null;
      }
    | null;
  image: ActivityImageNode;
  workScope: unknown;
  contributors: unknown;
  startDate: string | null;
  endDate: string | null;
  locations: Array<StrongRefLike | null> | null;
};

type ActivityResponse = { orgHypercertsClaimActivity?: ConnectionResult<ActivityDetailNode> | null };
type ActivityListPageResponse = { orgHypercertsClaimActivity?: ConnectionResult<ActivityListPageNode> | null };
type ActivityByUriResponse = { orgHypercertsClaimActivityByUri?: ActivityDetailNode | null };
type FundingConfigResponse = {
  appGainforestFundingConfigByUri?: {
    receivingWallet?: { uri?: string | null } | null;
    status?: string | null;
    goalInUSD?: string | null;
    minDonationInUSD?: string | null;
    maxDonationInUSD?: string | null;
    allowOversell?: boolean | null;
    createdAt?: string | null;
    updatedAt?: string | null;
  } | null;
};

export type Activity = {
  metadata: {
    did: string | null;
    uri: string | null;
    rkey: string | null;
    cid: string | null;
    createdAt: string | null;
    indexedAt: string | null;
  };
  specialMetadata: { labelTier: string | null; label: unknown | null } | null;
  fundingConfig: {
    receivingWallet: { $type: string; uri: string } | null;
    status: string | null;
    goalInUSD: string | null;
    minDonationInUSD: string | null;
    maxDonationInUSD: string | null;
    allowOversell: boolean | null;
    createdAt: string | null;
    updatedAt: string | null;
  } | null;
  creatorInfo: {
    did: string | null;
    organizationName: string | null;
    organizationLogo: { cid: string | null; mimeType: string | null; size: number | null; uri: string | null } | null;
  };
  record: {
    title: string | null;
    shortDescription: string | null;
    shortDescriptionFacets: unknown;
    description: unknown;
    image: unknown;
    workScope: unknown;
    contributors: unknown;
    startDate: string | null;
    endDate: string | null;
    createdAt: string | null;
    locations: Array<{ uri: string | null; cid: string | null }> | null;
  };
};

export type ActivityOrgInfo = {
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
    organizationLogo: { cid: string | null; mimeType: string | null; size: number | null; uri: string | null } | null;
  };
  record: {
    displayName: string | null;
    shortDescription: unknown;
    longDescription: unknown;
    logo: { cid: string | null; mimeType: string | null; size: number | null; uri: string | null } | null;
    coverImage: { cid: string | null; mimeType: string | null; size: number | null; uri: string | null } | null;
    objectives: string[] | null;
    country: string | null;
    website: string | null;
    startDate: string | null;
    visibility: string | null;
    createdAt: string | null;
  };
};

export type ByDidParams = { did: string };
export type ByDidAndOrgParams = { did: string; orgDid: string };
export type ListParams = { limit?: number; cursor?: string; labelTier?: string; hasImage?: boolean; hasOrganizationInfoRecord?: boolean };
export type Params = ByDidParams | ByDidAndOrgParams | ListParams;

export type Result<P extends Params> =
  P extends ByDidAndOrgParams
    ? { activities: Activity[]; org: ActivityOrgInfo | null }
    : P extends ByDidParams
      ? Activity[]
      : { data: Activity[]; pageInfo: { endCursor: string | null; hasNextPage: boolean; count: number } };

function buildFundingConfigUri(did: string, rkey: string): string {
  return `at://${did}/app.gainforest.funding.config/${rkey}`;
}

function clampLegacyLimit(limit: number | undefined): number {
  return Math.min(Math.max(limit ?? LEGACY_DEFAULT_LIMIT, 1), LEGACY_MAX_LIMIT);
}

function toLegacyPageInfo(endCursor: string | null | undefined, hasNextPage: boolean | null | undefined, count: number) {
  return {
    endCursor: endCursor ?? null,
    hasNextPage: hasNextPage ?? false,
    count,
  };
}

function normalizeNullableBskyFacets(facets: Array<BskyFacet | null> | null | undefined): unknown {
  if (facets == null) return null;
  return normalizeBskyFacets(facets);
}

function normalizeLeafletRichtextFacets(facets: Array<LeafletFacet | null> | null | undefined): unknown {
  if (facets == null) return null;

  type NormalizedLeafletFeature =
    | { $type: "pub.leaflet.richtext.facet#link"; uri: string }
    | { $type: "pub.leaflet.richtext.facet#didMention"; did: string }
    | { $type: "pub.leaflet.richtext.facet#atMention"; atURI: string }
    | { $type: "pub.leaflet.richtext.facet#bold" }
    | { $type: "pub.leaflet.richtext.facet#italic" }
    | { $type: "pub.leaflet.richtext.facet#code" }
    | { $type: "pub.leaflet.richtext.facet#strikethrough" }
    | { $type: "pub.leaflet.richtext.facet#underline" }
    | { $type: "pub.leaflet.richtext.facet#highlight" }
    | { $type: "pub.leaflet.richtext.facet#id"; id?: string };

  return (facets ?? []).flatMap((facet) => {
    if (!facet?.index) return [];

    const features = (facet.features ?? []).flatMap((feature): NormalizedLeafletFeature[] => {
      if (!feature) return [];

      switch (feature.__typename) {
        case "PubLeafletRichtextFacetLink":
          return [{ $type: "pub.leaflet.richtext.facet#link", uri: feature.uri }];
        case "PubLeafletRichtextFacetDidMention":
          return [{ $type: "pub.leaflet.richtext.facet#didMention", did: feature.did }];
        case "PubLeafletRichtextFacetAtMention":
          return [{ $type: "pub.leaflet.richtext.facet#atMention", atURI: feature.atURI }];
        case "PubLeafletRichtextFacetBold":
          return [{ $type: "pub.leaflet.richtext.facet#bold" }];
        case "PubLeafletRichtextFacetItalic":
          return [{ $type: "pub.leaflet.richtext.facet#italic" }];
        case "PubLeafletRichtextFacetCode":
          return [{ $type: "pub.leaflet.richtext.facet#code" }];
        case "PubLeafletRichtextFacetStrikethrough":
          return [{ $type: "pub.leaflet.richtext.facet#strikethrough" }];
        case "PubLeafletRichtextFacetUnderline":
          return [{ $type: "pub.leaflet.richtext.facet#underline" }];
        case "PubLeafletRichtextFacetHighlight":
          return [{ $type: "pub.leaflet.richtext.facet#highlight" }];
        case "PubLeafletRichtextFacetId":
          return [{ $type: "pub.leaflet.richtext.facet#id", ...(feature.id != null ? { id: feature.id } : {}) }];
        default:
          return [];
      }
    });

    return [
      {
        index: {
          byteStart: facet.index.byteStart ?? 0,
          byteEnd: facet.index.byteEnd ?? 0,
        },
        features,
      },
    ];
  });
}

async function normalizeLegacyImage(image: ActivityImageNode, did: string): Promise<unknown> {
  if (!image) return null;

  if (image.__typename === "OrgHypercertsDefsUri") {
    return {
      $type: "org.hypercerts.defs#uri",
      uri: image.uri,
    };
  }

  if (image.__typename === "OrgHypercertsDefsSmallImage") {
    const resolved = await toResolvedLegacyBlob(image.image ?? null, did);

    return {
      $type: "org.hypercerts.defs#smallImage",
      image: resolved
        ? {
            $type: "blob",
            ...resolved,
          }
        : null,
    };
  }

  return null;
}

async function normalizeLeafletBlock(block: unknown, did: string): Promise<unknown> {
  if (!block || typeof block !== "object") return block;

  const value = block as {
    __typename?: string;
    plaintext?: string | null;
    level?: number | null;
    alt?: string | null;
    image?: BlobLike | null;
    facets?: Array<LeafletFacet | null> | null;
  };

  if (value.__typename === "PubLeafletBlocksText") {
    const facets = normalizeLeafletRichtextFacets(value.facets);

    return {
      $type: "pub.leaflet.blocks.text",
      ...(facets != null ? { facets } : {}),
      plaintext: value.plaintext ?? null,
    };
  }

  if (value.__typename === "PubLeafletBlocksHeader") {
    const facets = normalizeLeafletRichtextFacets(value.facets);

    return {
      $type: "pub.leaflet.blocks.header",
      ...(facets != null ? { facets } : {}),
      plaintext: value.plaintext ?? null,
      level: value.level ?? null,
    };
  }

  if (value.__typename === "PubLeafletBlocksImage") {
    const resolved = await toResolvedLegacyBlob(value.image ?? null, did);

    return {
      $type: "pub.leaflet.blocks.image",
      alt: value.alt ?? null,
      image: resolved
        ? {
            $type: "blob",
            ...resolved,
          }
        : null,
    };
  }

  return block;
}

async function normalizeDescriptionForDid(description: unknown, did: string): Promise<unknown> {
  if (description == null) return null;
  if (typeof description === "string") return description;
  if (typeof description !== "object") return description;

  const value = description as {
    __typename?: string;
    value?: string | null;
    facets?: Array<BskyFacet | null> | null;
    uri?: string | null;
    cid?: string | null;
    id?: string | null;
    blocks?: Array<{ alignment?: string | null; block?: unknown } | null> | null;
  };

  if (value.__typename === "OrgHypercertsDefsDescriptionString") {
    return {
      $type: "org.hypercerts.defs#descriptionString",
      value: value.value ?? null,
      facets: normalizeNullableBskyFacets(value.facets),
    };
  }

  if (value.__typename === "ComAtprotoRepoStrongRef") {
    return {
      $type: "com.atproto.repo.strongRef",
      uri: value.uri ?? null,
      cid: value.cid ?? null,
    };
  }

  if (value.__typename === "PubLeafletPagesLinearDocument" || Array.isArray(value.blocks)) {
    const blocks = await Promise.all(
      (value.blocks ?? []).map(async (item) => {
        if (!item || typeof item !== "object") return item;

        const normalizedBlock = await normalizeLeafletBlock(item.block, did);
        return {
          $type: "pub.leaflet.pages.linearDocument#block",
          ...(item.alignment != null ? { alignment: item.alignment } : {}),
          block: normalizedBlock,
        };
      }),
    );

    return {
      $type: "pub.leaflet.pages.linearDocument",
      ...(value.id != null ? { id: value.id } : {}),
      blocks,
    };
  }

  return description;
}

function normalizeContributorIdentity(value: unknown): unknown | null {
  if (!value || typeof value !== "object") return null;

  const identity = value as {
    __typename?: string;
    identity?: string | null;
    uri?: string | null;
    cid?: string | null;
  };

  if (identity.__typename === "OrgHypercertsClaimActivityContributorIdentity") {
    return {
      $type: "org.hypercerts.claim.activity#contributorIdentity",
      identity: identity.identity ?? null,
    };
  }

  if (identity.__typename === "ComAtprotoRepoStrongRef") {
    return {
      $type: "com.atproto.repo.strongRef",
      uri: identity.uri ?? null,
      cid: identity.cid ?? null,
    };
  }

  return null;
}

function normalizeContributionDetails(value: unknown): unknown | null {
  if (!value || typeof value !== "object") return null;

  const details = value as {
    __typename?: string;
    role?: string | null;
    uri?: string | null;
    cid?: string | null;
  };

  if (details.__typename === "OrgHypercertsClaimActivityContributorRole") {
    return {
      $type: "org.hypercerts.claim.activity#contributorRole",
      role: details.role ?? null,
    };
  }

  if (details.__typename === "ComAtprotoRepoStrongRef") {
    return {
      $type: "com.atproto.repo.strongRef",
      uri: details.uri ?? null,
      cid: details.cid ?? null,
    };
  }

  return null;
}

function normalizeContributors(contributors: unknown): unknown {
  if (contributors == null) return null;
  if (!Array.isArray(contributors)) return contributors;

  return contributors.flatMap((item) => {
    if (!item || typeof item !== "object") return [];

    const contributor = item as {
      contributionWeight?: string | null;
      contributorIdentity?: unknown;
      contributionDetails?: unknown;
    };

    const normalized: Record<string, unknown> = {};
    const contributorIdentity = normalizeContributorIdentity(contributor.contributorIdentity);
    const contributionDetails = normalizeContributionDetails(contributor.contributionDetails);

    if (contributorIdentity != null) normalized.contributorIdentity = contributorIdentity;
    if (contributor.contributionWeight != null) normalized.contributionWeight = contributor.contributionWeight;
    if (contributionDetails != null) normalized.contributionDetails = contributionDetails;

    return Object.keys(normalized).length > 0 ? [normalized] : [];
  });
}

function normalizeCreatorInfo(did: string, orgInfo: ActivityOrgInfo | undefined): Activity["creatorInfo"] {
  return orgInfo?.creatorInfo ?? {
    did,
    organizationName: null,
    organizationLogo: null,
  };
}

function toActivityMedia(
  uri: string | null,
): {
  cid: string | null;
  mimeType: string | null;
  size: number | null;
  uri: string | null;
} | null {
  if (!uri) return null;

  return {
    cid: null,
    mimeType: null,
    size: null,
    uri,
  };
}

function buildActivityOrgInfoFromAccount(
  account: OrganizationAccountState,
): ActivityOrgInfo {
  const organization = buildOrganizationDataFromOrganizationAccount(account);
  const displayName =
    organization.displayName.trim().length > 0
      ? organization.displayName
      : account.did;
  const createdAt = account.organization.createdAt ?? account.profile.createdAt;
  const logo = toActivityMedia(organization.logoUrl);
  const coverImage = toActivityMedia(organization.coverImageUrl);

  return {
    metadata: {
      did: account.did,
      uri: `at://${account.did}/app.certified.actor.organization/self`,
      rkey: "self",
      cid: null,
      createdAt,
      indexedAt: null,
    },
    creatorInfo: {
      did: account.did,
      organizationName: displayName,
      organizationLogo: logo,
    },
    record: {
      displayName,
      shortDescription: { text: organization.shortDescription },
      longDescription: organization.longDescription,
      logo,
      coverImage,
      objectives: organization.objectives,
      country: organization.country,
      website: organization.website,
      startDate: organization.startDate,
      visibility: organization.visibility,
      createdAt,
    },
  };
}

async function fetchOrgMap(dids: string[]): Promise<Map<string, ActivityOrgInfo>> {
  const accountMap = await readOrganizationAccountsByDids(dids);
  const orgMap = new Map<string, ActivityOrgInfo>();

  for (const [did, account] of accountMap) {
    orgMap.set(did, buildActivityOrgInfoFromAccount(account));
  }

  return orgMap;
}

async function fetchFundingConfig(did: string, rkey: string): Promise<Activity["fundingConfig"]> {
  const res = await graphqlClient.request<FundingConfigResponse>(fundingConfigDocument, {
    uri: buildFundingConfigUri(did, rkey),
  });

  const fc = res.appGainforestFundingConfigByUri;
  if (!fc) return null;

  return {
    receivingWallet: fc.receivingWallet?.uri
      ? {
          $type: "app.gainforest.funding.config#evmLinkRef",
          uri: fc.receivingWallet.uri,
        }
      : null,
    status: fc.status ?? null,
    goalInUSD: fc.goalInUSD ?? null,
    minDonationInUSD: fc.minDonationInUSD ?? null,
    maxDonationInUSD: fc.maxDonationInUSD ?? null,
    allowOversell: fc.allowOversell ?? null,
    createdAt: fc.createdAt ?? null,
    updatedAt: fc.updatedAt ?? null,
  };
}

function mergeOrgMaps(target: Map<string, ActivityOrgInfo>, source: Map<string, ActivityOrgInfo>) {
  for (const [did, orgInfo] of source) {
    target.set(did, orgInfo);
  }
}

async function normalizeActivities(nodes: ActivityDetailNode[], orgMap: Map<string, ActivityOrgInfo>): Promise<Activity[]> {
  return Promise.all(
    nodes.map(async (node) => {
      const [fundingConfig, labelInfo, normalizedImage, normalizedDescription] = await Promise.all([
        fetchFundingConfig(node.did, node.rkey),
        fetchHyperlabelForDid(node.did),
        normalizeLegacyImage(node.image, node.did),
        normalizeDescriptionForDid(node.description, node.did),
      ]);

      return {
        metadata: {
          did: node.did,
          uri: node.uri,
          rkey: node.rkey,
          cid: node.cid,
          createdAt: node.createdAt,
          indexedAt: null,
        },
        specialMetadata: labelInfo
          ? {
              labelTier: labelInfo.labelTier,
              label: labelInfo.label,
            }
          : null,
        fundingConfig,
        creatorInfo: normalizeCreatorInfo(node.did, orgMap.get(node.did)),
        record: {
          title: node.title,
          shortDescription: node.shortDescription,
          shortDescriptionFacets: normalizeNullableBskyFacets(node.shortDescriptionFacets),
          description: normalizedDescription,
          image: normalizedImage,
          workScope: node.workScope,
          contributors: normalizeContributors(node.contributors),
          startDate: node.startDate,
          endDate: node.endDate,
          createdAt: node.createdAt,
          locations: (node.locations ?? []).map((item) => toLegacyStrongRef(item) ?? { uri: null, cid: null }),
        },
      };
    }),
  );
}

function parseActivityUri(activityUri: string): { did: string; rkey: string } | null {
  const match = activityUri.match(/^at:\/\/([^/]+)\/[^/]+\/([^/]+)$/);
  if (!match) return null;
  return { did: match[1] ?? "", rkey: match[2] ?? "" };
}

function buildActivityUri(did: string, rkey: string): string {
  return `at://${did}/org.hypercerts.claim.activity/${rkey}`;
}

function parseListCursor(cursor: string | undefined): number {
  if (!cursor) return 0;
  const parsed = Number(cursor);
  if (!Number.isInteger(parsed) || parsed < 0) return 0;
  return parsed;
}

function sortActivityNodesDescending(nodes: ActivityDetailNode[]): ActivityDetailNode[] {
  return [...nodes].sort((left, right) => {
    const createdAtCompare = right.createdAt.localeCompare(left.createdAt);
    if (createdAtCompare !== 0) return createdAtCompare;
    return right.uri.localeCompare(left.uri);
  });
}

async function fetchTierMatchedActivityNodes(tier: string): Promise<ActivityDetailNode[]> {
  const matches = await fetchHyperlabelActivitiesForTier(tier);
  const candidateUris = Array.from(
    new Set(
      matches.flatMap((match) => {
        if (typeof match.uri === "string" && match.uri.length > 0) {
          return [match.uri];
        }

        if (typeof match.did === "string" && match.did.length > 0 && typeof match.rkey === "string" && match.rkey.length > 0) {
          return [buildActivityUri(match.did, match.rkey)];
        }

        return [];
      }),
    ),
  );

  const detailNodes = await Promise.all(
    candidateUris.map(async (uri) => {
      try {
        const response = await graphqlClient.request<ActivityByUriResponse>(activityByUriDocument, {
          uri,
        });

        return response.orgHypercertsClaimActivityByUri;
      } catch {
        return null;
      }
    }),
  );

  return sortActivityNodesDescending(detailNodes.flatMap((node) => (node ? [node] : [])));
}

export async function fetch<P extends Params>(params: P): Promise<Result<P>> {
  if ("orgDid" in params) {
    const res = await graphqlClient.request<ActivityResponse>(byDidDocument, {
      did: params.did,
      first: 100,
      after: undefined,
    });
    const nodes = pluckConnectionNodes(res.orgHypercertsClaimActivity);
    const orgMap = await fetchOrgMap([params.orgDid, ...nodes.map((item) => item.did)]);
    const activities = await normalizeActivities(nodes, orgMap);
    const result = { activities, org: orgMap.get(params.orgDid) ?? null };
    return result as Result<P>;
  }

  if ("did" in params) {
    const nodes: ActivityDetailNode[] = [];
    let after: string | undefined;
    const seenCursors = new Set<string>();
    let exceededMaxPages = true;

    for (let pageIndex = 0; pageIndex < MAX_DID_PAGES; pageIndex += 1) {
      const res = await graphqlClient.request<ActivityResponse>(byDidDocument, {
        did: params.did,
        first: LEGACY_MAX_LIMIT,
        after,
      });

      nodes.push(...pluckConnectionNodes(res.orgHypercertsClaimActivity));

      const endCursor = res.orgHypercertsClaimActivity?.pageInfo?.endCursor ?? undefined;
      const hasNextPage = res.orgHypercertsClaimActivity?.pageInfo?.hasNextPage ?? false;

      if (!hasNextPage) {
        exceededMaxPages = false;
        break;
      }

      if (!endCursor) {
        throw new Error("orgHypercertsClaimActivity reported hasNextPage without an endCursor for did-scoped fetch");
      }

      if (endCursor === after || seenCursors.has(endCursor)) {
        throw new Error(`orgHypercertsClaimActivity repeated cursor ${endCursor} for ${params.did}`);
      }

      seenCursors.add(endCursor);
      after = endCursor;
    }

    if (exceededMaxPages) {
      throw new Error(`orgHypercertsClaimActivity exceeded ${MAX_DID_PAGES} pages for ${params.did}`);
    }

    const orgMap = await fetchOrgMap(nodes.map((item) => item.did));
    return (await normalizeActivities(nodes, orgMap)) as Result<P>;
  }

  if (params.labelTier != null) {
    const allTierNodes = await fetchTierMatchedActivityNodes(params.labelTier);
    const orgMap = await fetchOrgMap(allTierNodes.map((item) => item.did));
    const normalized = await normalizeActivities(allTierNodes, orgMap);

    const filtered = normalized.filter((item) => {
      if (params.hasImage != null) {
        const hasImage = item.record.image != null;
        if (hasImage !== params.hasImage) return false;
      }

      if (params.hasOrganizationInfoRecord != null) {
        const hasOrganizationAccount = item.creatorInfo.organizationName != null;
        if (hasOrganizationAccount !== params.hasOrganizationInfoRecord) return false;
      }

      return true;
    });

    const first = clampLegacyLimit(params.limit);
    const offset = parseListCursor(params.cursor);
    const data = filtered.slice(offset, offset + first);
    const nextOffset = offset + first;
    const hasNextPage = nextOffset < filtered.length;

    const result = {
      data,
      pageInfo: toLegacyPageInfo(hasNextPage ? String(nextOffset) : null, hasNextPage, data.length),
    };
    return result as Result<P>;
  }

  const first = clampLegacyLimit(params.limit);
  const filteredNodes: ActivityListPageNode[] = [];
  const filteredOrgMap = new Map<string, ActivityOrgInfo>();
  const seenCursors = new Set<string>();
  let upstreamCursor = params.cursor;
  let pageEndCursor: string | null = null;
  let pageHasNextPage = false;

  while (filteredNodes.length < first) {
    const res = await graphqlClient.request<ActivityListPageResponse>(activityListPageDocument, {
      first,
      after: upstreamCursor,
    });
    const connection = res.orgHypercertsClaimActivity;
    const nodes = pluckConnectionNodes(connection);
    const pageOrgMap =
      params.hasOrganizationInfoRecord != null
        ? await fetchOrgMap(nodes.map((item) => item.did))
        : null;

    if (pageOrgMap) {
      mergeOrgMaps(filteredOrgMap, pageOrgMap);
    }

    for (const node of nodes) {
      const normalizedImage = await normalizeLegacyImage(node.image, node.did);

      if (params.hasImage != null) {
        const hasImage = normalizedImage != null;
        if (hasImage !== params.hasImage) continue;
      }

      if (params.hasOrganizationInfoRecord != null) {
        const creatorInfo = normalizeCreatorInfo(node.did, pageOrgMap?.get(node.did));
        const hasOrganizationAccount = creatorInfo.organizationName != null;
        if (hasOrganizationAccount !== params.hasOrganizationInfoRecord) continue;
      }

      filteredNodes.push(node);
    }

    pageEndCursor = connection?.pageInfo?.endCursor ?? null;
    pageHasNextPage = connection?.pageInfo?.hasNextPage ?? false;

    if (!pageHasNextPage) {
      break;
    }

    if (!pageEndCursor) {
      throw new Error(
        "orgHypercertsClaimActivity list fetch reported hasNextPage without an endCursor",
      );
    }

    if (pageEndCursor === upstreamCursor || seenCursors.has(pageEndCursor)) {
      throw new Error(`orgHypercertsClaimActivity list fetch repeated cursor ${pageEndCursor}`);
    }

    seenCursors.add(pageEndCursor);
    upstreamCursor = pageEndCursor;
  }

  const nodesForDetails = filteredNodes.slice(0, first);
  const orgMap =
    params.hasOrganizationInfoRecord != null
      ? filteredOrgMap
      : await fetchOrgMap(nodesForDetails.map((item) => item.did));

  const detailNodes = await Promise.all(
    nodesForDetails.map(async (node) => {
      const response = await graphqlClient.request<ActivityByUriResponse>(activityByUriDocument, {
        uri: node.uri,
      });

      return response.orgHypercertsClaimActivityByUri;
    }),
  );

  const data = await normalizeActivities(
    detailNodes.flatMap((node) => (node ? [node] : [])),
    orgMap,
  );

  const result = {
    data,
    pageInfo: toLegacyPageInfo(
      pageEndCursor,
      pageHasNextPage,
      data.length,
    ),
  };
  return result as Result<P>;
}

export async function fetchCidByAtUri(activityUri: string): Promise<string | null> {
  const parsed = parseActivityUri(activityUri);
  if (!parsed) return null;

  const res = await graphqlClient.request<ActivityByUriResponse>(activityByUriDocument, {
    uri: activityUri,
  });

  return res.orgHypercertsClaimActivityByUri?.cid ?? null;
}

export const defaultOptions = {
  staleTime: 60 * 1_000,
} satisfies QueryModule<Params, unknown>["defaultOptions"];

export function enabled(params: Params): boolean {
  if ("did" in params) return !!params.did;
  return true;
}
