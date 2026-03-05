import { Suspense } from "react";
import { graphqlClient } from "@/lib/graphql/client";
import { graphql } from "@/lib/graphql/tada";
import { HcActivityFragment } from "@/lib/graphql/fragments";
import {
  activitiesToBumicertDataArray,
  type GraphQLHcActivityItem,
} from "@/lib/adapters";
import type { BumicertData } from "@/lib/types";
import { ExploreClient } from "./_components/ExploreClient";

export const metadata = {
  title: "Explore Bumicerts — Verified Regenerative Impact Projects",
  description:
    "Browse verified environmental impact certificates from nature stewards around the world. Filter by country, organization, and impact area.",
};

/**
 * Combined activity query — org info comes from `creatorInfo` inline on each
 * activity item (resolved server-side by the indexer), so no separate
 * gainforest.organization.info sub-query is needed.
 *
 * Same query used by ExploreHydrator on the client for consistent data shape.
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

export default async function ExplorePage() {
  let initialBumicerts: BumicertData[] = [];

  try {
    const response = await graphqlClient.request(ExploreActivitiesQuery, {
      limit: 1000,
      where: { hasImage: true, hasOrganizationInfoRecord: true },
    });

    const activities = (response.hypercerts?.activity?.data ?? []) as GraphQLHcActivityItem[];
    initialBumicerts = activitiesToBumicertDataArray(activities);
  } catch (error) {
    // On error, pass empty array — the client will retry via GraphQL
    console.error("Failed to fetch initial bumicerts:", error);
  }

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Explore Bumicerts",
    description:
      "Verified environmental impact certificates from nature stewards around the world.",
    numberOfItems: initialBumicerts.length,
    url: "https://bumicerts.com/explore",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <Suspense>
        <ExploreClient initialData={initialBumicerts} />
      </Suspense>
    </>
  );
}
