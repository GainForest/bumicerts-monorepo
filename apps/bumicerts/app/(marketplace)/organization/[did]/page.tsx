import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getOrgData, transformOrgData, type GraphQLOrgInfoItem } from "./_data";
import ErrorPage from "@/components/error-page";
import { OrgHero } from "./_components/OrgHero";
import { OrgTabBar } from "./_components/OrgTabBar";
import { OrgAbout } from "./_components/OrgAbout";
import { OrgSetupPage } from "./_components/OrgSetupPage";
import { auth } from "@/lib/auth";
import Container from "@/components/ui/container";

const BASE_URL = "https://bumicerts.com";

// ── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ did: string }>;
}): Promise<Metadata> {
  const { did: encodedDid } = await params;
  const did = decodeURIComponent(encodedDid);

  const { data, error } = await getOrgData(did);
  if (error || !data?.org) return { title: "Organization — Bumicerts" };

  const orgInfo = data.org as GraphQLOrgInfoItem;
  const record = orgInfo.record;
  const displayName = record?.displayName ?? "Organization";

  const shortDescRaw = record?.shortDescription;
  const description: string =
    typeof shortDescRaw === "string"
      ? shortDescRaw
      : typeof shortDescRaw === "object" && shortDescRaw?.text
        ? shortDescRaw.text
        : `${displayName} on Bumicerts — verified regenerative impact organization.`;

  const coverImageUrl = record?.coverImage?.uri ?? null;
  const orgUrl = `${BASE_URL}/organization/${encodedDid}`;

  return {
    title: `${displayName} — Bumicerts`,
    description,
    alternates: { canonical: orgUrl },
    openGraph: {
      title: displayName,
      description,
      url: orgUrl,
      siteName: "Bumicerts",
      type: "profile",
      ...(coverImageUrl ? { images: [{ url: coverImageUrl, width: 1200, height: 630, alt: displayName }] } : {}),
    },
    twitter: {
      card: coverImageUrl ? "summary_large_image" : "summary",
      title: displayName,
      description,
    },
  };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function OrganizationPage({
  params,
}: {
  params: Promise<{ did: string }>;
}) {
  const { did: encodedDid } = await params;
  const did = decodeURIComponent(encodedDid);

  const [{ data, error }, session] = await Promise.all([
    getOrgData(did),
    auth.session.getSession(),
  ]);

  if (error) {
    console.error("[OrganizationPage] Error fetching org", did, error);
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

  const orgInfo = data?.org as GraphQLOrgInfoItem | undefined;

  if (!orgInfo && session.isLoggedIn && session.did === did) {
    return (
      <Container className="pt-4">
        <OrgSetupPage did={did} />
      </Container>
    );
  }

  if (!orgInfo) notFound();

  const { organization } = transformOrgData(orgInfo, []);

  // ── JSON-LD structured data ───────────────────────────────────────────────

  const orgUrl = `${BASE_URL}/organization/${encodedDid}`;
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": orgUrl,
    name: organization.displayName,
    description: organization.shortDescription || undefined,
    url: organization.website || orgUrl,
    ...(organization.startDate ? { foundingDate: organization.startDate.slice(0, 10) } : {}),
    ...(organization.country ? { address: { "@type": "PostalAddress", addressCountry: organization.country } } : {}),
    ...(organization.website ? { sameAs: [organization.website] } : {}),
    ...(organization.logoUrl ? { logo: { "@type": "ImageObject", url: organization.logoUrl } } : {}),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <main className="w-full">
        <Container className="pt-4 pb-8">
          <OrgHero organization={organization} />
          <OrgTabBar did={organization.did} />
          <OrgAbout organization={organization} />
        </Container>
      </main>
    </>
  );
}
