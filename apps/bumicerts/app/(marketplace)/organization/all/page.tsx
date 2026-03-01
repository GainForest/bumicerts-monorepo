import { gainforestSdk } from "@/lib/config/gainforest-sdk.server";
import { allowedPDSDomains } from "@/lib/config/gainforest-sdk";
import { tryCatch } from "@/lib/tryCatch";
import { claimsToOrganizationDataArray } from "@/lib/adapters";
import { AllOrgsClient } from "./_components/AllOrgsClient";

export const metadata = {
  title: "Organizations — Bumicerts",
  description:
    "Browse all nature steward organizations creating verified environmental impact on Bumicerts.",
};

export default async function AllOrganizationsPage() {
  const caller = gainforestSdk.getServerCaller();

  const [data, error] = await tryCatch(
    caller.hypercerts.claim.activity.getAllAcrossOrgs({
      pdsDomain: allowedPDSDomains[0],
    })
  );

  if (error) {
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

  const organizations = claimsToOrganizationDataArray(
    data as Parameters<typeof claimsToOrganizationDataArray>[0]
  );

  return (
    <div className="w-full">
      <AllOrgsClient organizations={organizations} />
    </div>
  );
}
