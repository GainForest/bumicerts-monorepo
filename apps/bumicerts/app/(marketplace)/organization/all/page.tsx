import {
  orgInfoToOrganizationData,
  type GraphQLOrgInfoItem,
} from "@/lib/adapters";
import { AllOrgsShell } from "./_components/AllOrgsShell";
import { getIndexerCaller } from "@/lib/trpc/indexer/server";

export const metadata = {
  title: "Organizations — Bumicerts",
  description:
    "Browse all nature steward organizations creating verified environmental impact on Bumicerts.",
};

export default async function AllOrganizationsPage() {
  let organizations: ReturnType<typeof orgInfoToOrganizationData>[] = [];
  let fetchError = false;

  try {
    const caller = await getIndexerCaller();
    const response = await caller.organization.list({ limit: 1000 });
    const orgInfos = (
      "data" in response ? response.data : []
    ) as GraphQLOrgInfoItem[];

    organizations = orgInfos.map((item) => orgInfoToOrganizationData(item, 0));
  } catch (error) {
    console.error("Failed to fetch organizations:", error);
    fetchError = true;
  }

  if (fetchError) {
    return (
      <div className="w-full pt-20 flex items-center justify-center">
        <div className="text-center space-y-3 max-w-md px-6">
          <p className="text-muted-foreground text-sm leading-relaxed">
            We couldn&apos;t load organizations right now. Please try again in a
            moment.
          </p>
        </div>
      </div>
    );
  }

  return <AllOrgsShell organizations={organizations} animate={false} />;
}
