import {
  orgInfoToOrganizationData,
  type GraphQLOrgInfoItem,
} from "@/lib/adapters";
import { AllOrgsShell } from "./_components/AllOrgsShell";
import { getIndexerCaller } from "@/lib/trpc/indexer/server";
import ErrorPage from "@/components/error-page";

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
      <ErrorPage
        title="Something went wrong"
        description="We were unable to load the organizations. Please try refreshing the page."
        showRefreshButton
        showHomeButton={false}
      />
    );
  }

  return <AllOrgsShell organizations={organizations} animate={false} />;
}
