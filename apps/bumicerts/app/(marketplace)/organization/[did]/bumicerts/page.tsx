import type { Metadata } from "next";
import { getOrgData, transformOrgData, type GraphQLOrgInfoItem, type GraphQLHcActivityItem } from "../_data";
import { OrgBumicertsGrid } from "./_components/OrgBumicertsGrid";
import ErrorPage from "@/components/error-page";
import Container from "@/components/ui/container";
import { requirePublicUrl } from "@/lib/url";

// ── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ did: string }>;
}): Promise<Metadata> {
  const { did: encodedDid } = await params;
  const did = decodeURIComponent(encodedDid);

  const { data, error } = await getOrgData(did);
  if (error || !data?.org) return { title: "Bumicerts — Bumicerts" };

  const record = (data.org as GraphQLOrgInfoItem).record;
  const displayName = record?.displayName ?? "Organization";

  return {
    title: `${displayName} Bumicerts — Bumicerts`,
    description: `Browse all Bumicerts created by ${displayName}.`,
    alternates: { canonical: `${requirePublicUrl()}/organization/${encodedDid}/bumicerts` },
  };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function OrgBumicertsPage({
  params,
}: {
  params: Promise<{ did: string }>;
}) {
  const { did: encodedDid } = await params;
  const did = decodeURIComponent(encodedDid);

  const { data, error } = await getOrgData(did);

  if (error) {
    console.error("[OrgBumicertsPage] Error fetching org", did, error);
    return (
      <Container className="pt-4">
        <ErrorPage
          title="Couldn't load this organization"
          description="We had trouble fetching this organization's data. Please try again."
          error={error}
        />
      </Container>
    );
  }

  // Layout handles notFound — guard defensively for edge races.
  if (!data?.org) return null;

  const orgInfo = data.org as GraphQLOrgInfoItem;
  const rawActivities = (data.activities ?? []) as GraphQLHcActivityItem[];
  const { bumicerts } = transformOrgData(orgInfo, rawActivities);

  return <OrgBumicertsGrid bumicerts={bumicerts} />;
}
