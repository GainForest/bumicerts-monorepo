/**
 * GraphQL Queries for the bumicerts app
 *
 * These queries fetch data from the indexer and are typed via gql.tada.
 */

import { graphql } from "./tada";

// ── Organization Fragments ───────────────────────────────────────────────────

export const OrgInfoFragment = graphql(`
  fragment OrgInfoFields on OrgInfo @_unmask {
    meta {
      did
      uri
      rkey
      cid
      createdAt
      indexedAt
    }
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
`);

// ── Activity Fragments ───────────────────────────────────────────────────────

export const HcActivityFragment = graphql(`
  fragment HcActivityFields on HcActivity @_unmask {
    meta {
      did
      uri
      rkey
      cid
      createdAt
      indexedAt
    }
    title
    shortDescription
    description
    image
    workScope
    startDate
    endDate
    createdAt
    locations {
      uri
      cid
    }
  }
`);

// ── Explore Page Queries ─────────────────────────────────────────────────────

/**
 * Query to fetch all public activities with their organization info.
 * Used on the explore page to display all bumicerts.
 */
export const ExploreActivitiesQuery = graphql(
  `
    query ExploreActivities($limit: Int, $cursor: String, $labelTier: String) {
      hypercerts {
        activities(limit: $limit, cursor: $cursor, labelTier: $labelTier, order: DESC, sortBy: CREATED_AT) {
          records {
            ...HcActivityFields
          }
          pageInfo {
            endCursor
            hasNextPage
          }
        }
      }
      gainforest {
        organization {
          infos(limit: 1000, order: DESC, sortBy: CREATED_AT) {
            records {
              ...OrgInfoFields
            }
          }
        }
      }
    }
  `,
  [HcActivityFragment, OrgInfoFragment]
);

/**
 * Query to fetch all public organization infos.
 * Used on the organizations list page.
 */
export const AllOrganizationsQuery = graphql(
  `
    query AllOrganizations($limit: Int, $cursor: String) {
      gainforest {
        organization {
          infos(limit: $limit, cursor: $cursor, order: DESC, sortBy: CREATED_AT) {
            records {
              ...OrgInfoFields
            }
            pageInfo {
              endCursor
              hasNextPage
            }
          }
        }
      }
    }
  `,
  [OrgInfoFragment]
);

/**
 * Query to fetch a single organization by DID with its activities.
 * Used on the organization detail page.
 */
export const OrganizationByDidQuery = graphql(
  `
    query OrganizationByDid($did: String!) {
      gainforest {
        organization {
          infos(where: { did: $did }, limit: 1) {
            records {
              ...OrgInfoFields
            }
          }
        }
      }
      hypercerts {
        activities(where: { did: $did }, order: DESC, sortBy: CREATED_AT) {
          records {
            ...HcActivityFields
          }
        }
      }
    }
  `,
  [OrgInfoFragment, HcActivityFragment]
);

/**
 * Query to fetch a single activity by DID and rkey.
 * Used on the bumicert detail page.
 */
export const ActivityByUriQuery = graphql(
  `
    query ActivityByUri($did: String!, $orgDid: String!) {
      hypercerts {
        activities(where: { did: $did }, limit: 100, order: DESC, sortBy: CREATED_AT) {
          records {
            ...HcActivityFields
          }
        }
      }
      gainforest {
        organization {
          infos(where: { did: $orgDid }, limit: 1) {
            records {
              ...OrgInfoFields
            }
          }
        }
      }
    }
  `,
  [HcActivityFragment, OrgInfoFragment]
);

// ── Type exports for convenience ─────────────────────────────────────────────

export type { ResultOf, VariablesOf } from "./tada";
