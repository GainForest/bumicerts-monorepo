import { queries, type OrgInfo } from "@/lib/graphql/queries/index";
import {
  orgInfoToOrganizationData,
  type GraphQLOrgInfoItem,
} from "@/lib/adapters";
import { AllOrgsShell } from "./_components/AllOrgsShell";
import { serverEnv } from "@/lib/env/server";
import { productionOrganizations } from "./_data/organizations";

export const metadata = {
  title: "Organizations — Bumicerts",
  description:
    "Browse all nature steward organizations creating verified environmental impact on Bumicerts.",
};

export default async function AllOrganizationsPage() {
  const isProduction = serverEnv.VERCEL_ENV === "production";

  let organizations: ReturnType<typeof orgInfoToOrganizationData>[] = [];
  let fetchError = false;

  try {
    const response = await queries.organization.fetch({ limit: 1000 }) as { data: OrgInfo[]; pageInfo: unknown };
    const orgInfos = response.data as GraphQLOrgInfoItem[];

    const filtered = isProduction
      ? orgInfos.filter((item) => {
          const did = item.metadata?.did;
          return did !== null && did !== undefined && productionOrganizations.includes(did);
        })
      : orgInfos;

    organizations = filtered.map((item) => orgInfoToOrganizationData(item, 0));
  } catch (error) {
    console.error("Failed to fetch organizations:", error);
    fetchError = true;
  }

  if (fetchError) {
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

  return <AllOrgsShell organizations={organizations} animate={false} />;
}
