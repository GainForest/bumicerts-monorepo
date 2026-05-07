/**
 * Shared server-side data helpers for all org sub-pages (home, bumicerts, …).
 *
 * `cache()` from React deduplicates calls within a single render pass, so
 * both layout.tsx and page.tsx can call getOrgData(did) independently and
 * only one network request is made.
 */

import { cache } from "react";
import {
  orgInfoToOrganizationData,
  activitiesToBumicertDataArray,
  type GraphQLOrgInfoItem,
  type GraphQLHcActivityItem,
} from "@/lib/adapters";
import type { OrganizationData, BumicertData } from "@/lib/types";
import { getIndexerCaller } from "@/lib/trpc/indexer/server";

export const getOrgData = cache(async (did: string) => {
  try {
    const caller = await getIndexerCaller();
    const data = await caller.organization.byDid({ did });
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
});

/** Transform raw GraphQL org data → UI-ready OrganizationData + BumicertData[]. */
export function transformOrgData(
  orgInfo: GraphQLOrgInfoItem,
  rawActivities: GraphQLHcActivityItem[]
): { organization: OrganizationData; bumicerts: BumicertData[] } {
  const organization = orgInfoToOrganizationData(orgInfo, rawActivities.length);
  const bumicerts = activitiesToBumicertDataArray(rawActivities);
  return { organization, bumicerts };
}

export type { GraphQLOrgInfoItem, GraphQLHcActivityItem };
