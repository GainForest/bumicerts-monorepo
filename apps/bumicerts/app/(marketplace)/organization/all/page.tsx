import { queries, type OrgInfo } from "@/lib/graphql/queries/index";
import {
  orgInfoToOrganizationData,
  type GraphQLOrgInfoItem,
} from "@/lib/adapters";
import { AllOrgsClient } from "./_components/AllOrgsClient";

export const metadata = {
  title: "Organizations — Bumicerts",
  description:
    "Browse all nature steward organizations creating verified environmental impact on Bumicerts.",
};

export default async function AllOrganizationsPage() {
  try {
    // Fetch all organizations
    const response = await queries.organization.fetch({ limit: 1000 }) as { data: OrgInfo[]; pageInfo: unknown };

    const orgInfos = response.data as GraphQLOrgInfoItem[];

    // Convert each org info item to OrganizationData — bumicertCount not available here, default to 0
    const organizations = orgInfos.map((item) => orgInfoToOrganizationData(item, 0));

    return (
      <div className="w-full">
        <AllOrgsClient organizations={organizations} />
      </div>
    );
  } catch (error) {
    console.error("Failed to fetch organizations:", error);
    return (
      <div className="w-full pt-20 flex items-center justify-center">
        <div className="text-center space-y-3 max-w-md px-6">
          <p className="text-muted-foreground text-sm leading-relaxed">
            We couldn&apos;t load organizations right now. Please try again in a moment.
          </p>
        </div>
      </div>
    );
  }
}
