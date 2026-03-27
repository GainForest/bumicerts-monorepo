import {
  activitiesToBumicertDataArray,
  type GraphQLHcActivityItem,
} from "@/lib/adapters";
import type { BumicertData } from "@/lib/types";
import { ExploreShell } from "./_components/ExploreShell";
import { requirePublicUrl } from "@/lib/url";
import { getIndexerCaller } from "@/lib/trpc/indexer/server";

export const metadata = {
  title: "Explore Bumicerts — Verified Regenerative Impact Projects",
  description:
    "Browse verified environmental impact certificates from nature stewards around the world. Filter by country, organization, and impact area.",
};

export default async function ExplorePage() {
  let bumicerts: BumicertData[] = [];

  try {
    const caller = await getIndexerCaller();
    const response = await caller.activities.list({
      limit: 1000,
      hasImage: true,
      hasOrganizationInfoRecord: true,
      labelTier: "high-quality",
    });
    // list() with no `did` returns { data, pageInfo }
    const activities = ("data" in response ? response.data : []) as GraphQLHcActivityItem[];
    bumicerts = activitiesToBumicertDataArray(activities);
  } catch (error) {
    console.error("Failed to fetch bumicerts:", error);
  }

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Explore Bumicerts",
    description:
      "Verified environmental impact certificates from nature stewards around the world.",
    numberOfItems: bumicerts.length,
    url: `${requirePublicUrl()}/explore`,
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
