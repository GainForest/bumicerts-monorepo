import { graphqlClient } from "@/lib/graphql/client";
import { graphql } from "@/lib/graphql/tada";
import { HcActivityFragment } from "@/lib/graphql/fragments";
import {
  activitiesToBumicertDataArray,
  type GraphQLHcActivityItem,
} from "@/lib/adapters";
import type { BumicertData } from "@/lib/types";
import { ExploreShell } from "./_components/ExploreShell";

export const metadata = {
  title: "Explore Bumicerts — Verified Regenerative Impact Projects",
  description:
    "Browse verified environmental impact certificates from nature stewards around the world. Filter by country, organization, and impact area.",
};

const ExploreActivitiesQuery = graphql(
  `
    query ExploreActivities($limit: Int, $cursor: String, $where: ActivityWhereInput) {
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

export default async function ExplorePage() {
  let bumicerts: BumicertData[] = [];

  try {
    const response = await graphqlClient.request(ExploreActivitiesQuery, {
      limit: 1000,
      where: { hasImage: true, hasOrganizationInfoRecord: true },
    });
    const activities = (response.hypercerts?.claim?.activity?.data ?? []) as GraphQLHcActivityItem[];
    bumicerts = activitiesToBumicertDataArray(activities);
  } catch (error) {
    console.error("Failed to fetch bumicerts:", error);
  }

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Explore Bumicerts",
    description: "Verified environmental impact certificates from nature stewards around the world.",
    numberOfItems: bumicerts.length,
    url: "https://bumicerts.com/explore",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      {/*
        ExploreShell renders the static chrome (heading, search, sort, filter chips).
        bumicerts is fetched once here and passed to the Shell — it uses it for both
        filter chip options and the grid (no duplicate fetches).

        No children passed → Shell renders the real filtered BumicertGrid itself.
        loading.tsx passes a skeleton as children instead.
      */}
      <ExploreShell bumicerts={bumicerts} animate={false} />
    </>
  );
}
