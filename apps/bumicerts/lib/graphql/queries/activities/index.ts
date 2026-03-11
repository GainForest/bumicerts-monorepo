/**
 * Activities query module.
 *
 * Params determine what is returned:
 *   { did }                                      → ActivityItem[]  (by author DID — "my activities")
 *   { did, rkey }                                → ActivityItem | null  (single bumicert detail)
 *   { limit?, cursor?, labelTier? }              → ActivityItem[]  (explore feed / paginated list)
 *
 * Leaf: queries.activities
 *
 * Schema shape (post-redesign):
 *   hypercerts.claim.activity(...) { data { metadata { ... } creatorInfo { ... } record { ... } } pageInfo { ... } }
 */

import { graphqlClient } from "@/lib/graphql/client";
import { graphql } from "@/lib/graphql/tada";
import { HcActivityFragment, OrgInfoFragment } from "@/lib/graphql/fragments";
import type { ResultOf } from "@/lib/graphql/tada";
import type { QueryModule } from "@/lib/graphql/create-query";

// ── Documents ─────────────────────────────────────────────────────────────────

/** Activities authored by a given DID (my bumicerts). */
const byDidDocument = graphql(
  `
    query ActivitiesByDid($did: String!) {
      hypercerts {
        claim {
          activity(where: { did: $did }, order: DESC, sortBy: CREATED_AT) {
            data {
              ...HcActivityFields
            }
          }
        }
      }
    }
  `,
  [HcActivityFragment]
);

/** Single activity lookup — fetches all activities for a DID then the caller filters by rkey. */
const byDidAndOrgDocument = graphql(
  `
    query ActivityByDidAndOrg($did: String!, $orgDid: String!) {
      hypercerts {
        claim {
          activity(where: { did: $did }, limit: 100, order: DESC, sortBy: CREATED_AT) {
            data {
              ...HcActivityFields
            }
          }
        }
      }
      gainforest {
        organization {
          info(where: { did: $orgDid }, limit: 1) {
            data {
              ...OrgInfoFields
            }
          }
        }
      }
    }
  `,
  [HcActivityFragment, OrgInfoFragment]
);

/** Paginated explore feed. */
const listDocument = graphql(
  `
    query ActivitiesList($limit: Int, $cursor: String, $where: ActivityWhereInput) {
      hypercerts {
        claim {
          activity(limit: $limit, cursor: $cursor, where: $where, order: DESC, sortBy: CREATED_AT) {
            data {
              ...HcActivityFields
            }
            pageInfo {
              endCursor
              hasNextPage
              count
            }
          }
        }
      }
    }
  `,
  [HcActivityFragment]
);

// ── Types ─────────────────────────────────────────────────────────────────────

type _ByDidResult = ResultOf<typeof byDidDocument>;
type _ActivityData = NonNullable<NonNullable<NonNullable<NonNullable<_ByDidResult["hypercerts"]>["claim"]>["activity"]>["data"]>;
export type Activity = NonNullable<_ActivityData[number]>;

type _ByDidAndOrgResult = ResultOf<typeof byDidAndOrgDocument>;
type _OrgInfoData = NonNullable<NonNullable<NonNullable<NonNullable<_ByDidAndOrgResult["gainforest"]>["organization"]>["info"]>["data"]>;
export type ActivityOrgInfo = NonNullable<_OrgInfoData[number]>;

/** Fetch all activities by author DID. */
export type ByDidParams = { did: string };

/** Fetch a single activity by author DID and rkey, along with its org info. */
export type ByDidAndOrgParams = { did: string; orgDid: string };

/** Paginated explore feed. */
export type ListParams = {
  limit?: number;
  cursor?: string;
  labelTier?: string;
  /** Only return activities that have an image set. */
  hasImage?: boolean;
  /** Only return activities whose author has an indexed organization.info record. */
  hasOrganizationInfoRecord?: boolean;
};

export type Params = ByDidParams | ByDidAndOrgParams | ListParams;

export type Result<P extends Params> =
  P extends ByDidAndOrgParams
    ? { activities: Activity[]; org: ActivityOrgInfo | null }
    : P extends ByDidParams
    ? Activity[]
    : { data: Activity[]; pageInfo: { endCursor: string | null; hasNextPage: boolean; count: number } };

// ── Fetch ─────────────────────────────────────────────────────────────────────

export async function fetch<P extends Params>(params: P): Promise<Result<P>> {
  // ByDidAndOrg — must check before ByDid because it also has `did`
  if ("orgDid" in params) {
    const res = await graphqlClient.request(byDidAndOrgDocument, {
      did: params.did,
      orgDid: params.orgDid,
    });
    const activities = (res.hypercerts?.claim?.activity?.data ?? []) as Activity[];
    const org = (res.gainforest?.organization?.info?.data?.[0] ?? null) as ActivityOrgInfo | null;
    return { activities, org } as Result<P>;
  }

  // ByDid
  if ("did" in params) {
    const res = await graphqlClient.request(byDidDocument, { did: params.did });
    return ((res.hypercerts?.claim?.activity?.data ?? []) as Activity[]) as Result<P>;
  }

  // List (explore)
  const where: Record<string, unknown> = {};
  if (params.hasImage != null) where["hasImage"] = params.hasImage;
  if (params.hasOrganizationInfoRecord != null) where["hasOrganizationInfoRecord"] = params.hasOrganizationInfoRecord;
  if (params.labelTier != null) where["labelTier"] = params.labelTier;

  const res = await graphqlClient.request(listDocument, {
    limit: params.limit,
    cursor: params.cursor,
    where: Object.keys(where).length > 0 ? where : undefined,
  });
  const data = (res.hypercerts?.claim?.activity?.data ?? []) as Activity[];
  const pageInfo = res.hypercerts?.claim?.activity?.pageInfo ?? { endCursor: null, hasNextPage: false, count: 0 };
  return { data, pageInfo } as Result<P>;
}

// ── Default options ───────────────────────────────────────────────────────────

export const defaultOptions = {
  staleTime: 60 * 1_000,
} satisfies QueryModule<Params, unknown>["defaultOptions"];

// ── Enabled ───────────────────────────────────────────────────────────────────

export function enabled(params: Params): boolean {
  if ("did" in params) return !!params.did;
  return true;
}
