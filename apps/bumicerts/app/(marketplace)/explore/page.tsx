import { Suspense } from "react";
import { gainforestSdk } from "@/lib/config/gainforest-sdk.server";
import { allowedPDSDomains } from "@/lib/config/gainforest-sdk";
import { tryCatch } from "@/lib/tryCatch";
import { claimsToBumicertDataArray } from "@/lib/adapters";
import { serialize, type SerializedSuperjson } from "gainforest-sdk/utilities/transform";
import type { BumicertData } from "@/lib/types";
import { ExploreClient } from "./_components/ExploreClient";

export const metadata = {
  title: "Explore Bumicerts — Verified Regenerative Impact Projects",
  description:
    "Browse verified environmental impact certificates from nature stewards around the world. Filter by country, organization, and impact area.",
};

export default async function ExplorePage() {
  const caller = gainforestSdk.getServerCaller();

  const [data, error] = await tryCatch(
    caller.hypercerts.claim.activity.getAllAcrossOrgs({
      pdsDomain: allowedPDSDomains[0],
    })
  );

  // Build initial bumicerts for SSR (SEO + first paint)
  // On error, we pass an empty array — the client will retry via tRPC
  const initialBumicerts = error ? [] : claimsToBumicertDataArray(data as Parameters<typeof claimsToBumicertDataArray>[0]);

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

  const serialized: SerializedSuperjson<BumicertData[]> = serialize(initialBumicerts);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <Suspense>
        <ExploreClient initialData={serialized} />
      </Suspense>
    </>
  );
}
