/**
 * Organization query module.
 *
 * Params determine what is returned:
 *   { did }                      → single OrgInfoItem | null  (org exists check / full profile)
 *   { limit?, cursor? }          → OrgInfoItem[]              (paginated list)
 *
 * Both shapes are handled by one fetch function with a discriminated param union,
 * keeping the leaf as the data type ("organization") rather than an adjective.
 *
 * Schema shape (post-redesign):
 *   gainforest.organization.info(...) { data { metadata creatorInfo record } pageInfo }
 */

import { graphqlClient } from "@/lib/graphql/client";
import { graphql } from "@/lib/graphql/tada";
import { OrgInfoFragment, HcActivityFragment } from "@/lib/graphql/fragments";
import type { ResultOf } from "@/lib/graphql/tada";
import type { QueryModule } from "@/lib/graphql/create-query";

// ── Documents ─────────────────────────────────────────────────────────────────

const singleDocument = graphql(
  `
    query OrganizationByDid($did: String!) {
      gainforest {
        organization {
          info(where: { did: $did }, limit: 1) {
            data {
              ...OrgInfoFields
            }
          }
        }
      }
      hypercerts {
        activity(where: { did: $did }, order: DESC, sortBy: CREATED_AT) {
          data {
            ...HcActivityFields
          }
        }
      }
    }
  `,
  [OrgInfoFragment, HcActivityFragment]
);

const listDocument = graphql(
  `
    query AllOrganizations($limit: Int, $cursor: String) {
      gainforest {
        organization {
          info(limit: $limit, cursor: $cursor, order: DESC, sortBy: CREATED_AT) {
            data {
              ...OrgInfoFields
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
  [OrgInfoFragment]
);

// ── Types ─────────────────────────────────────────────────────────────────────

type _SingleResult = ResultOf<typeof singleDocument>;
type _GainforestOrg = NonNullable<NonNullable<_SingleResult["gainforest"]>["organization"]>;
type _InfoData = NonNullable<NonNullable<_GainforestOrg["info"]>["data"]>;
type _ActivityData = NonNullable<NonNullable<NonNullable<_SingleResult["hypercerts"]>["activity"]>["data"]>;

export type OrgInfo = NonNullable<_InfoData[number]>;
export type OrgActivity = NonNullable<_ActivityData[number]>;

/** Fetch one org by DID — returns null if not found. */
export type SingleParams = { did: string };

/** Fetch a list of orgs. */
export type ListParams = { limit?: number; cursor?: string };

export type Params = SingleParams | ListParams;

export type Result<P extends Params> = P extends SingleParams
  ? { org: OrgInfo | null; activities: OrgActivity[] }
  : { data: OrgInfo[]; pageInfo: { endCursor: string | null; hasNextPage: boolean; count: number } };

// ── Fetch ─────────────────────────────────────────────────────────────────────

export async function fetch<P extends Params>(params: P): Promise<Result<P>> {
  if ("did" in params) {
    const res = await graphqlClient.request(singleDocument, { did: params.did });
    const org = (res.gainforest?.organization?.info?.data?.[0] ?? null) as OrgInfo | null;
    const activities = (res.hypercerts?.activity?.data ?? []) as OrgActivity[];
    return { org, activities } as Result<P>;
  }

  const res = await graphqlClient.request(listDocument, {
    limit: params.limit,
    cursor: params.cursor,
  });
  const data = (res.gainforest?.organization?.info?.data ?? []) as OrgInfo[];
  const pageInfo = res.gainforest?.organization?.info?.pageInfo ?? {
    endCursor: null,
    hasNextPage: false,
    count: 0,
  };
  return { data, pageInfo } as Result<P>;
}

// ── Default options ───────────────────────────────────────────────────────────

export const defaultOptions = {
  staleTime: 60 * 1_000, // 1 minute
} satisfies QueryModule<Params, unknown>["defaultOptions"];

// ── Enabled ───────────────────────────────────────────────────────────────────

export function enabled(params: Params): boolean {
  if ("did" in params) return !!params.did;
  return true;
}
