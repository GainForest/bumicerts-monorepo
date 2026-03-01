import { Suspense } from "react";
import { graphqlClient } from "@/lib/graphql/client";
import { ExploreActivitiesQuery } from "@/lib/graphql/queries";
import {
  activitiesToBumicertDataArray,
  type GraphQLHcActivity,
  type GraphQLOrgInfo,
} from "@/lib/adapters";
import type { BumicertData } from "@/lib/types";
import { ExploreClient } from "./_components/ExploreClient";

export const metadata = {
  title: "Explore Bumicerts — Verified Regenerative Impact Projects",
  description:
    "Browse verified environmental impact certificates from nature stewards around the world. Filter by country, organization, and impact area.",
};

export default async function ExplorePage() {
  let initialBumicerts: BumicertData[] = [];

  try {
    const response = await graphqlClient.request(ExploreActivitiesQuery, {
      limit: 1000,
      labelTier: "high-quality",
    });

    // Extract activities and org infos from the response
    const activities = (response.hypercerts?.activities?.records ?? []) as GraphQLHcActivity[];
    const orgInfos = (response.gainforest?.organization?.infos?.records ?? []) as GraphQLOrgInfo[];

    // Build a map of org info by DID for quick lookup
    const orgInfoByDid = new Map<string, GraphQLOrgInfo>();
    for (const org of orgInfos) {
      const did = org.meta?.did;
      if (did) {
        orgInfoByDid.set(did, org);
      }
    }

    // Transform to UI types
    initialBumicerts = activitiesToBumicertDataArray(activities, orgInfoByDid);
  } catch (error) {
    // On error, pass an empty array — the client will retry via GraphQL
    console.error("Failed to fetch initial bumicerts:", error);
  }

  // Structured data for search engines
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
