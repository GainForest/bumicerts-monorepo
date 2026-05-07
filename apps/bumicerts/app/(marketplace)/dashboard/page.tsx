import type { Metadata } from "next";
import { listOrganizationData } from "@/lib/account/server";
import { DashboardClient } from "./_components/DashboardClient";

export const metadata: Metadata = {
  title: "Donations Dashboard — Bumicerts",
  description:
    "Platform-wide donations analytics: total raised, unique donors, funding trends, and recent transactions.",
};

/**
 * Fetches every organization's DID → country code mapping server-side so the
 * dashboard can display geographic-reach stats without an extra client query.
 *
 * Returns a plain `Record<string, string>` (serialisable across the
 * server/client boundary). On failure the map is empty — the dashboard still
 * renders, just without geographic data.
 */
async function fetchOrgCountryMap(): Promise<Record<string, string>> {
  const map: Record<string, string> = {};
  try {
    const orgs = await listOrganizationData({ limit: 1000 });
    for (const org of orgs) {
      const did = org.did;
      const country = org.country;
      if (did && country) {
        map[did] = country;
      }
    }
  } catch (error) {
    console.error("Failed to fetch org country data for dashboard:", error);
  }
  return map;
}

export default async function DashboardPage() {
  const orgCountryMap = await fetchOrgCountryMap();
  return <DashboardClient orgCountryMap={orgCountryMap} />;
}
