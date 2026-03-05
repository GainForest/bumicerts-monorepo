"use client";

import React, { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { graphqlClient } from "@/lib/graphql/client";
import { graphql } from "@/lib/graphql/tada";
import { HcActivityFragment } from "@/lib/graphql/fragments";
import { useExploreStore } from "../store";
import {
  activitiesToBumicertDataArray,
  orgInfosToOrganizationDataArray,
  type GraphQLHcActivityItem,
} from "@/lib/adapters";

/**
 * Activities-only query — org info comes from `creatorInfo` inline on each
 * activity item (resolved server-side by the indexer). No separate
 * gainforest.organization.info sub-query needed.
 *
 * Same combined query shape used by ExplorePage (server) for SSR.
 */
const ExploreActivitiesQuery = graphql(
  `
    query ExploreActivities($limit: Int, $cursor: String, $labelTier: String, $where: ActivityWhereInput) {
      hypercerts {
        activity(limit: $limit, cursor: $cursor, labelTier: $labelTier, where: $where, order: DESC, sortBy: CREATED_AT) {
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
  `,
  [HcActivityFragment]
);

/**
 * ExploreHydrator fetches data from the GraphQL indexer and populates
 * the explore store. It renders its children while the query runs.
 */
const ExploreHydrator = ({ children }: { children?: React.ReactNode }) => {
  const { data, isLoading, error, isPlaceholderData } = useQuery({
    queryKey: ["explore-activities"],
    queryFn: () =>
      graphqlClient.request(ExploreActivitiesQuery, {
        limit: 1000,
        where: { hasImage: true, hasOrganizationInfoRecord: true },
      }),
    staleTime: 60 * 1000,
  });

  useEffect(() => {
    // Read update directly from the store singleton so it never appears in deps.
    // Adding it via useExploreStore((s) => s.update) would cause an infinite loop:
    //   store write → re-render → new update ref → effect fires → store write → ...
    const update = useExploreStore.getState().update;

    if (isPlaceholderData) return;

    if (isLoading || data === undefined) {
      // Guard: don't write if already in loading state — avoids a redundant
      // store write → re-render → effect cycle while the query is in-flight.
      if (!useExploreStore.getState().loading) {
        update(null);
      }
      return;
    }

    if (error) {
      update(new Error(error instanceof Error ? error.message : "Failed to fetch data"));
      return;
    }

    try {
      const activities = (data.hypercerts?.activity?.data ?? []) as GraphQLHcActivityItem[];

      // Build organizations list from the creatorInfo on each activity item.
      // The indexer resolves org name + logo inline — no separate org query needed.
      const bumicerts = activitiesToBumicertDataArray(activities);
      const organizations = orgInfosToOrganizationDataArray(activities);

      update({ organizations, bumicerts });
    } catch (transformError) {
      update(
        new Error(
          transformError instanceof Error
            ? transformError.message
            : "Failed to transform data"
        )
      );
    }
  }, [data, isLoading, error, isPlaceholderData]); // `update` intentionally omitted — see comment above

  return children;
};

export default ExploreHydrator;
