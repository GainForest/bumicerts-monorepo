import { AllOrgsShell } from "./_components/AllOrgsShell";
import { listOrganizationData } from "@/lib/account/server";
import ErrorPage from "@/components/error-page";
import type { OrganizationData } from "@/lib/types";

export const metadata = {
  title: "Organizations — Bumicerts",
  description:
    "Browse all nature steward organizations creating verified environmental impact on Bumicerts.",
};

export default async function AllOrganizationsPage() {
  let organizations: OrganizationData[] = [];
  let fetchError = false;

  try {
    organizations = await listOrganizationData({ limit: 1000 });
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
