"use client";

import React, { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { graphqlClient } from "@/lib/graphql/client";
import { ExploreActivitiesQuery } from "@/lib/graphql/queries";
import { useExploreStore } from "../store";
import {
  activitiesToBumicertDataArray,
  orgInfosToOrganizationDataArray,
  type GraphQLHcActivity,
  type GraphQLOrgInfo,
} from "@/lib/adapters";

/**
 * ExploreHydrator fetches data from the GraphQL indexer and populates
 * the explore store. It renders its children while the query runs.
 */
const ExploreHydrator = ({ children }: { children?: React.ReactNode }) => {
  const { data, isLoading, error, isPlaceholderData } = useQuery({
    queryKey: ["explore-activities"],
    queryFn: async () => {
      const response = await graphqlClient.request(ExploreActivitiesQuery, {
        limit: 1000,
        labelTier: "high-quality",
      });
      return response;
    },
    staleTime: 60 * 1000, // 1 minute
  });

  const update = useExploreStore((state) => state.update);

  useEffect(() => {
    if (isPlaceholderData) return;

    if (isLoading || data === undefined) {
      update(null);
      return;
    }

    if (error) {
      update(new Error(error instanceof Error ? error.message : "Failed to fetch data"));
      return;
    }

    try {
      // Extract activities and org infos from the response
      const activities = (data.hypercerts?.activities?.records ?? []) as GraphQLHcActivity[];
      const orgInfos = (data.gainforest?.organization?.infos?.records ?? []) as GraphQLOrgInfo[];

      // Build a map of org info by DID for quick lookup
      const orgInfoByDid = new Map<string, GraphQLOrgInfo>();
      for (const org of orgInfos) {
        const did = org.meta?.did;
        if (did) {
          orgInfoByDid.set(did, org);
        }
      }

      // Count activities per organization
      const activityCountByDid = new Map<string, number>();
      for (const activity of activities) {
        const did = activity.meta?.did;
        if (did) {
          activityCountByDid.set(did, (activityCountByDid.get(did) ?? 0) + 1);
        }
      }

      // Transform to UI types
      const bumicerts = activitiesToBumicertDataArray(activities, orgInfoByDid);
      const organizations = orgInfosToOrganizationDataArray(orgInfos, activityCountByDid);

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
  }, [data, isLoading, error, isPlaceholderData, update]);

  return children;
};

export default ExploreHydrator;
