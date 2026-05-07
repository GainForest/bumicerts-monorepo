/**
 * Organization query module.
 *
 * Scratch migration target:
 *   appGainforestOrganizationInfo(...) + orgHypercertsClaimActivity(...)
 */

import type { BlobLike, ConnectionResult } from "../_migration-helpers";
import {
  connectionPageInfo,
  normalizeBskyFacets,
  pluckConnectionNodes,
  toResolvedLegacyBlob,
} from "../_migration-helpers";
import { fetchHyperlabelForDid } from "../_hyperlabel";
import { scoreActivity } from "../_labeller-scorer.ts";

const LOCAL_LABELLER_SOURCE = "local";
const MAX_ACTIVITY_PAGES = 50;

const INDEXER_URL = process.env.NEXT_PUBLIC_INDEXER_URL;

const singleOrgDocument = /* GraphQL */ `
  query OrganizationInfo($did: String!) {
    appGainforestOrganizationInfo(
      where: { did: { eq: $did } }
      first: 1
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
          displayName
          shortDescription {
            text
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
          longDescription {
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
          logo {
            image {
              ref
              mimeType
              size
            }
          }
          coverImage {
            image {
              ref
              mimeType
              size
            }
          }
          objectives
          country
          website
          startDate
          visibility
        }
      }
    }
  }
`;

const listOrgDocument = /* GraphQL */ `
  query AllOrganizationIds($first: Int, $after: String) {
    appGainforestOrganizationInfo(
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
      totalCount
    }
  }
`;

const activitiesByDidDocument = /* GraphQL */ `
  query OrganizationActivities($did: String!, $first: Int, $after: String) {
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

type QueryModule<TParams, TResult> = {
  defaultOptions?: unknown;
  fetch: (params: TParams) => Promise<TResult>;
};

type GraphQLError = {
  message?: string | null;
};

type GraphQLResponse<Result> = {
  data?: Result | null;
  errors?: GraphQLError[] | null;
};

type AppFacet = {
  index?: {
    byteStart?: number | null;
    byteEnd?: number | null;
  } | null;
  features?: Array<
    | { did: string }
    | { uri: string }
    | { tag: string }
    | null
  > | null;
};

type LeafletFacet = {
  index?: {
    byteStart?: number | null;
    byteEnd?: number | null;
  } | null;
  features?: Array<
    | { __typename: "PubLeafletRichtextFacetLink"; uri: string }
    | { __typename: "PubLeafletRichtextFacetDidMention"; did: string }
    | { __typename: "PubLeafletRichtextFacetAtMention"; atURI: string; href?: string | null }
    | { __typename: "PubLeafletRichtextFacetBold" }
    | { __typename: "PubLeafletRichtextFacetItalic" }
    | { __typename: "PubLeafletRichtextFacetCode" }
    | { __typename: "PubLeafletRichtextFacetStrikethrough" }
    | { __typename: "PubLeafletRichtextFacetUnderline" }
    | { __typename: "PubLeafletRichtextFacetHighlight" }
    | { __typename: "PubLeafletRichtextFacetId"; id?: string | null }
    | null
  > | null;
};

type LeafletBlock = {
  __typename?: string;
  plaintext?: string | null;
  level?: number | null;
  alt?: string | null;
  image?: BlobLike | null;
  facets?: Array<LeafletFacet | null> | null;
};

type OrgNode = {
  did: string;
  uri: string;
  rkey: string;
  cid: string;
  createdAt: string;
  displayName: string;
  shortDescription: {
    text: string;
    facets?: Array<AppFacet | null> | null;
  };
  longDescription: {
    id?: string | null;
    blocks?: Array<{
      alignment?: string | null;
      block?: LeafletBlock | null;
    } | null> | null;
  } | null;
  logo: { image?: BlobLike | null } | null;
  coverImage: { image?: BlobLike | null } | null;
  objectives: string[];
  country: string;
  website: string | null;
  startDate: string | null;
  visibility: string | null;
};

type ActivityImageNode =
  | { __typename: "OrgHypercertsDefsUri"; uri: string }
  | { __typename: "OrgHypercertsDefsSmallImage"; image?: BlobLike | null }
  | null;

type ActivityContributorIdentity = {
  __typename?: string;
  identity?: string | null;
  uri?: string | null;
  cid?: string | null;
};

type ActivityContributionDetails = {
  __typename?: string;
  role?: string | null;
  uri?: string | null;
  cid?: string | null;
};

type ActivityNode = {
  did: string;
  uri: string;
  rkey: string;
  cid: string;
  createdAt: string;
  title: string;
  shortDescription: string;
  shortDescriptionFacets: Array<AppFacet | null> | null;
  description:
    | {
        __typename?: "OrgHypercertsDefsDescriptionString";
        value?: string | null;
        facets?: Array<AppFacet | null> | null;
      }
    | {
        __typename?: "ComAtprotoRepoStrongRef";
        uri?: string | null;
        cid?: string | null;
      }
    | {
        __typename?: "PubLeafletPagesLinearDocument";
        id?: string | null;
        blocks?: Array<{
          alignment?: string | null;
          block?: LeafletBlock | null;
        } | null> | null;
      }
    | null;
  image: ActivityImageNode;
  workScope: unknown;
  contributors:
    | Array<{
        contributionWeight?: string | null;
        contributorIdentity?: ActivityContributorIdentity | null;
        contributionDetails?: ActivityContributionDetails | null;
      } | null>
    | null;
  startDate: string | null;
  endDate: string | null;
  locations: Array<{ uri?: string | null; cid?: string | null } | null> | null;
};

type OrgResponse = {
  appGainforestOrganizationInfo?: ConnectionResult<OrgNode> | null;
};

type ActivityResponse = {
  orgHypercertsClaimActivity?: ConnectionResult<ActivityNode> | null;
};

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

export type OrgInfo = {
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
  } | null;
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

export type OrgActivity = {
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

export type SingleParams = { did: string };
export type ListParams = { limit?: number; cursor?: string };
export type Params = SingleParams | ListParams;

export type SingleResult = { org: OrgInfo | null; activities: OrgActivity[] };
export type ListResult = { data: OrgInfo[]; pageInfo: { endCursor: string | null; hasNextPage: boolean; count: number } };
export type Result<P extends Params> = P extends SingleParams ? SingleResult : ListResult;

async function requestGraphQL<Result>(query: string, variables: Record<string, unknown>): Promise<Result> {
  if (!INDEXER_URL) {
    throw new Error("NEXT_PUBLIC_INDEXER_URL is not set");
  }

  const response = await globalThis.fetch(INDEXER_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "ngrok-skip-browser-warning": "true",
    },
    body: JSON.stringify({ query, variables }),
  });

  const text = await response.text();
  let parsed: GraphQLResponse<Result>;

  try {
    parsed = JSON.parse(text) as GraphQLResponse<Result>;
  } catch {
    throw new Error(`Non-JSON GraphQL response (${response.status}): ${text}`);
  }

  if ((parsed.errors?.length ?? 0) > 0) {
    const message = parsed.errors?.map((error) => error.message ?? "Unknown GraphQL error").join("; ");
    throw new Error(message);
  }

  if (!parsed.data) {
    throw new Error("GraphQL response did not include data");
  }

  return parsed.data;
}

function orderLegacyMediaObject(
  media: { uri: string | null; cid: string | null; mimeType: string | null; size: number | null } | null,
): { cid: string | null; mimeType: string | null; size: number | null; uri: string | null } | null {
  if (!media) return null;

  return {
    cid: media.cid,
    mimeType: media.mimeType,
    size: media.size,
    uri: media.uri,
  };
}

function normalizeNullableBskyFacets(facets: Array<AppFacet | null> | null | undefined): unknown {
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
          byteEnd: facet.index.byteEnd ?? 0,
          byteStart: facet.index.byteStart ?? 0,
        },
        features,
      },
    ];
  });
}

async function normalizeLeafletBlock(block: LeafletBlock | null | undefined, did: string): Promise<unknown> {
  if (!block || typeof block !== "object") return block;

  if (block.__typename === "PubLeafletBlocksText") {
    const facets = normalizeLeafletRichtextFacets(block.facets);

    return {
      $type: "pub.leaflet.blocks.text",
      ...(facets != null ? { facets } : {}),
      plaintext: block.plaintext ?? null,
    };
  }

  if (block.__typename === "PubLeafletBlocksHeader") {
    const facets = normalizeLeafletRichtextFacets(block.facets);

    return {
      $type: "pub.leaflet.blocks.header",
      level: block.level ?? null,
      ...(facets != null ? { facets } : {}),
      plaintext: block.plaintext ?? null,
    };
  }

  if (block.__typename === "PubLeafletBlocksImage") {
    const resolved = await toResolvedLegacyBlob(block.image ?? null, did);

    return {
      $type: "pub.leaflet.blocks.image",
      alt: block.alt ?? null,
      image: resolved
        ? {
            $type: "blob",
            uri: resolved.uri,
            cid: resolved.cid,
            mimeType: resolved.mimeType,
            size: resolved.size,
          }
        : null,
    };
  }

  return block;
}

async function normalizeLinearDocument(
  value:
    | {
        id?: string | null;
        blocks?: Array<{
          alignment?: string | null;
          block?: LeafletBlock | null;
        } | null> | null;
      }
    | null
    | undefined,
  did: string,
): Promise<unknown> {
  if (!value) return value ?? null;

  const blocks = await Promise.all(
    (value.blocks ?? []).map(async (item) => {
      if (!item) return item;

      return {
        $type: "pub.leaflet.pages.linearDocument#block",
        ...(item.alignment != null ? { alignment: item.alignment } : {}),
        block: await normalizeLeafletBlock(item.block, did),
      };
    }),
  );

  return {
    $type: "pub.leaflet.pages.linearDocument",
    ...(value.id != null ? { id: value.id } : {}),
    blocks,
  };
}

async function normalizeActivityImage(image: ActivityImageNode, did: string): Promise<unknown> {
  if (!image) return null;

  if (image.__typename === "OrgHypercertsDefsUri") {
    return {
      $type: "org.hypercerts.defs#uri",
      uri: image.uri,
    };
  }

  const resolved = await toResolvedLegacyBlob(image.image ?? null, did);

  return {
    $type: "org.hypercerts.defs#smallImage",
    image: resolved
      ? {
          $type: "blob",
          uri: resolved.uri,
          cid: resolved.cid,
          mimeType: resolved.mimeType,
          size: resolved.size,
        }
      : null,
  };
}

async function normalizeActivityDescription(activity: ActivityNode): Promise<unknown> {
  const description = activity.description;
  if (description == null) return null;

  if (description.__typename === "OrgHypercertsDefsDescriptionString") {
    return {
      $type: "org.hypercerts.defs#descriptionString",
      value: description.value ?? null,
      facets: normalizeNullableBskyFacets(description.facets),
    };
  }

  if (description.__typename === "ComAtprotoRepoStrongRef") {
    return {
      $type: "com.atproto.repo.strongRef",
      uri: description.uri ?? null,
      cid: description.cid ?? null,
    };
  }

  if (description.__typename === "PubLeafletPagesLinearDocument") {
    return normalizeLinearDocument(description, activity.did);
  }

  return null;
}

function normalizeContributorIdentity(value: ActivityContributorIdentity | null | undefined): unknown | null {
  if (!value) return null;

  if (value.__typename === "OrgHypercertsClaimActivityContributorIdentity") {
    if (!value.identity) return null;

    return {
      $type: "org.hypercerts.claim.activity#contributorIdentity",
      identity: value.identity,
    };
  }

  if (value.__typename === "ComAtprotoRepoStrongRef") {
    return {
      $type: "com.atproto.repo.strongRef",
      uri: value.uri ?? null,
      cid: value.cid ?? null,
    };
  }

  return null;
}

function normalizeContributionDetails(value: ActivityContributionDetails | null | undefined): unknown | null {
  if (!value) return null;

  if (value.__typename === "OrgHypercertsClaimActivityContributorRole") {
    return {
      $type: "org.hypercerts.claim.activity#contributorRole",
      role: value.role ?? null,
    };
  }

  if (value.__typename === "ComAtprotoRepoStrongRef") {
    return {
      $type: "com.atproto.repo.strongRef",
      uri: value.uri ?? null,
      cid: value.cid ?? null,
    };
  }

  return null;
}

function normalizeContributors(contributors: ActivityNode["contributors"]): unknown {
  if (contributors == null) return null;

  return contributors.flatMap((contributor) => {
    if (!contributor) return [];

    const contributorIdentity = normalizeContributorIdentity(contributor.contributorIdentity);
    if (contributorIdentity == null) return [];

    const contributionDetails = normalizeContributionDetails(contributor.contributionDetails);

    return [
      {
        contributorIdentity,
        ...(contributor.contributionWeight != null ? { contributionWeight: contributor.contributionWeight } : {}),
        ...(contributionDetails != null ? { contributionDetails } : {}),
      },
    ];
  });
}

async function fetchFundingConfig(did: string, rkey: string): Promise<OrgActivity["fundingConfig"]> {
  const response = await requestGraphQL<FundingConfigResponse>(fundingConfigDocument, {
    uri: `at://${did}/app.gainforest.funding.config/${rkey}`,
  });

  const fundingConfig = response.appGainforestFundingConfigByUri;
  if (!fundingConfig) return null;

  return {
    receivingWallet: fundingConfig.receivingWallet?.uri
      ? {
          $type: "app.gainforest.funding.config#evmLinkRef",
          uri: fundingConfig.receivingWallet.uri,
        }
      : null,
    status: fundingConfig.status ?? null,
    goalInUSD: fundingConfig.goalInUSD ?? null,
    minDonationInUSD: fundingConfig.minDonationInUSD ?? null,
    maxDonationInUSD: fundingConfig.maxDonationInUSD ?? null,
    allowOversell: fundingConfig.allowOversell ?? null,
    createdAt: fundingConfig.createdAt ?? null,
    updatedAt: fundingConfig.updatedAt ?? null,
  };
}

async function normalizeOrg(node: OrgNode): Promise<OrgInfo> {
  const [logo, coverImage, longDescription] = await Promise.all([
    toResolvedLegacyBlob(node.logo?.image ?? null, node.did),
    toResolvedLegacyBlob(node.coverImage?.image ?? null, node.did),
    normalizeLinearDocument(node.longDescription, node.did),
  ]);
  const shortDescriptionFacets = normalizeNullableBskyFacets(node.shortDescription.facets);

  const orderedLogo = orderLegacyMediaObject(logo);
  const orderedCoverImage = orderLegacyMediaObject(coverImage);

  return {
    metadata: {
      did: node.did,
      uri: node.uri,
      rkey: node.rkey,
      cid: node.cid,
      createdAt: node.createdAt,
      indexedAt: null,
    },
    creatorInfo: {
      did: node.did,
      organizationName: node.displayName,
      organizationLogo: orderedLogo,
    },
    record: {
      displayName: node.displayName,
      shortDescription:
        shortDescriptionFacets == null
          ? {
              text: node.shortDescription.text,
            }
          : {
              text: node.shortDescription.text,
              facets: shortDescriptionFacets,
            },
      longDescription,
      logo: orderedLogo,
      coverImage: orderedCoverImage,
      objectives: node.objectives,
      country: node.country,
      website: node.website,
      startDate: node.startDate,
      visibility: node.visibility,
      createdAt: node.createdAt,
    },
  };
}

async function fetchOrgByDid(did: string): Promise<OrgInfo | null> {
  try {
    const response = await requestGraphQL<OrgResponse>(singleOrgDocument, { did });
    const node = pluckConnectionNodes(response.appGainforestOrganizationInfo)[0];
    return node ? normalizeOrg(node) : null;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (message.includes("AppGainforestCommonDefsRichtext.text")) {
      return null;
    }

    throw error;
  }
}

async function fetchActivitiesByDid(did: string, org: OrgInfo | null): Promise<OrgActivity[]> {
  const nodes: ActivityNode[] = [];
  let after: string | undefined;
  const seenCursors = new Set<string>();
  let exceededMaxPages = true;

  for (let pageIndex = 0; pageIndex < MAX_ACTIVITY_PAGES; pageIndex += 1) {
    const response = await requestGraphQL<ActivityResponse>(activitiesByDidDocument, {
      did,
      first: 100,
      after,
    });

    nodes.push(...pluckConnectionNodes(response.orgHypercertsClaimActivity));

    const endCursor = response.orgHypercertsClaimActivity?.pageInfo?.endCursor ?? undefined;
    const hasNextPage = response.orgHypercertsClaimActivity?.pageInfo?.hasNextPage ?? false;

    if (!hasNextPage) {
      exceededMaxPages = false;
      break;
    }

    if (!endCursor) {
      throw new Error("orgHypercertsClaimActivity reported hasNextPage without an endCursor for did-scoped fetch");
    }

    if (endCursor === after || seenCursors.has(endCursor)) {
      throw new Error(`orgHypercertsClaimActivity repeated cursor ${endCursor} for ${did}`);
    }

    seenCursors.add(endCursor);
    after = endCursor;
  }

  if (exceededMaxPages) {
    throw new Error(`orgHypercertsClaimActivity exceeded ${MAX_ACTIVITY_PAGES} pages for ${did}`);
  }

  return Promise.all(
    nodes.map(async (node) => {
      const [fundingConfig, recentLabelInfo, image, description] = await Promise.all([
        fetchFundingConfig(node.did, node.rkey),
        fetchHyperlabelForDid(node.did),
        normalizeActivityImage(node.image, node.did),
        normalizeActivityDescription(node),
      ]);

      const normalizedRecord = {
        title: node.title,
        shortDescription: node.shortDescription,
        shortDescriptionFacets: normalizeNullableBskyFacets(node.shortDescriptionFacets),
        description,
        image,
        workScope: node.workScope,
        contributors: normalizeContributors(node.contributors),
        startDate: node.startDate,
        endDate: node.endDate,
        createdAt: node.createdAt,
        locations: (node.locations ?? []).map((location) => ({
          uri: location?.uri ?? null,
          cid: location?.cid ?? null,
        })),
      } satisfies OrgActivity["record"];

      const labelInfo =
        recentLabelInfo ??
        (() => {
          const label = scoreActivity({
            $type: "org.hypercerts.claim.activity",
            title: normalizedRecord.title ?? undefined,
            shortDescription: normalizedRecord.shortDescription ?? undefined,
            shortDescriptionFacets: null,
            description: normalizedRecord.description,
            image: normalizedRecord.image,
            workScope: normalizedRecord.workScope,
            contributors: Array.isArray(normalizedRecord.contributors) ? normalizedRecord.contributors : undefined,
            startDate: normalizedRecord.startDate ?? undefined,
            endDate: normalizedRecord.endDate ?? undefined,
            locations: normalizedRecord.locations,
            createdAt: normalizedRecord.createdAt ?? undefined,
          });

          return {
            labelTier: label.tier,
            label: {
              tier: label.tier,
              labeler: LOCAL_LABELLER_SOURCE,
              labeledAt: null,
              syncedAt: null,
            },
          };
        })();

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
        creatorInfo: org?.creatorInfo ?? {
          did: node.did,
          organizationName: null,
          organizationLogo: null,
        },
        record: {
          title: normalizedRecord.title,
          shortDescription: normalizedRecord.shortDescription,
          shortDescriptionFacets: normalizedRecord.shortDescriptionFacets,
          description: normalizedRecord.description,
          image: normalizedRecord.image,
          workScope: normalizedRecord.workScope,
          contributors: normalizedRecord.contributors,
          startDate: normalizedRecord.startDate,
          endDate: normalizedRecord.endDate,
          createdAt: normalizedRecord.createdAt,
          locations: normalizedRecord.locations,
        },
      } satisfies OrgActivity;
    }),
  );
}

export async function fetch(params: SingleParams): Promise<SingleResult>;
export async function fetch(params: ListParams): Promise<ListResult>;
export async function fetch(params: Params): Promise<SingleResult | ListResult> {
  if ("did" in params) {
    const org = await fetchOrgByDid(params.did);
    const activities = await fetchActivitiesByDid(params.did, org);
    return { org, activities };
  }

  const response = await requestGraphQL<OrgResponse>(listOrgDocument, {
    first: params.limit,
    after: params.cursor,
  });
  const dids = pluckConnectionNodes(response.appGainforestOrganizationInfo).map((node) => node.did);
  const data = (await Promise.all(dids.map((did) => fetchOrgByDid(did)))).flatMap((org) => (org ? [org] : []));

  return {
    data,
    pageInfo: {
      ...connectionPageInfo(response.appGainforestOrganizationInfo),
      count: data.length,
    },
  };
}

export const defaultOptions = {
  staleTime: 60 * 1_000,
} satisfies QueryModule<Params, unknown>["defaultOptions"];

export function enabled(params: Params): boolean {
  if ("did" in params) return !!params.did;
  return true;
}
