/**
 * Shared GraphQL fragments.
 *
 * Import from here whenever a query needs OrgInfoItem or HcActivityItem fields.
 * Using @_unmask so the result type is inlined directly rather than wrapped
 * in FragmentOf<...>, which keeps consumer types simple.
 *
 * Schema shape (post-redesign):
 *   Every leaf returns { data: [XxxItem!]!, pageInfo: { endCursor, hasNextPage, count } }
 *   Each item: { metadata, creatorInfo, record }
 *     metadata        – standard AT Protocol envelope (RecordMeta)
 *     specialMetadata – per-collection extras (labelTier/label for activities)
 *     creatorInfo     – org name + logo resolved inline by the indexer
 *     record          – pure lexicon payload fields
 *     fundingConfig   – joined GainforestFundingConfigRecord (activities only)
 */

import { graphql } from "./tada";

// ── OrgInfo ───────────────────────────────────────────────────────────────────

export const OrgInfoFragment = graphql(`
  fragment OrgInfoFields on GainforestOrganizationInfoItem @_unmask {
    metadata {
      did
      uri
      rkey
      cid
      createdAt
      indexedAt
    }
    creatorInfo {
      did
      organizationName
      organizationLogo {
        cid
        mimeType
        size
        uri
      }
    }
    record {
      displayName
      shortDescription
      longDescription
      logo {
        cid
        mimeType
        size
        uri
      }
      coverImage {
        cid
        mimeType
        size
        uri
      }
      objectives
      country
      website
      startDate
      visibility
      createdAt
    }
  }
`);

// ── HcActivity ────────────────────────────────────────────────────────────────

export const HcActivityFragment = graphql(`
  fragment HcActivityFields on HypercertsClaimActivityItem @_unmask {
    metadata {
      did
      uri
      rkey
      cid
      createdAt
      indexedAt
    }
    specialMetadata {
      labelTier
      label {
        tier
        labeler
        labeledAt
        syncedAt
      }
    }
    fundingConfig {
      receivingWallet
      status
      goalInUSD
      minDonationInUSD
      maxDonationInUSD
      allowOversell
      createdAt
      updatedAt
    }
    creatorInfo {
      did
      organizationName
      organizationLogo {
        cid
        mimeType
        size
        uri
      }
    }
    record {
      title
      shortDescription
      shortDescriptionFacets
      description
      image
      workScope
      contributors
      startDate
      endDate
      createdAt
      locations {
        uri
        cid
      }
    }
  }
`);
