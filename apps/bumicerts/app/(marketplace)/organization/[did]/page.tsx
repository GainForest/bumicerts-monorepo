import type { Metadata } from "next";
import { getOrgData, transformOrgData, type GraphQLOrgInfoItem } from "./_data";
import { OrgAbout } from "./_components/OrgAbout";
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
  if (error || !data?.org) return { title: "Organization — Bumicerts" };

  const orgInfo = data.org as GraphQLOrgInfoItem;
  const record = orgInfo.record;
  const displayName = record?.displayName ?? "Organization";

  const shortDescRaw = record?.shortDescription;
  const description: string =
    typeof shortDescRaw === "string"
      ? shortDescRaw
      : typeof shortDescRaw === "object" &&
          shortDescRaw !== null &&
          "text" in shortDescRaw &&
          typeof (shortDescRaw as Record<string, unknown>)["text"] === "string"
        ? ((shortDescRaw as Record<string, unknown>)["text"] as string)
        : `${displayName} on Bumicerts — verified regenerative impact organization.`;

  const coverImageUrl = record?.coverImage?.uri ?? null;
  const orgUrl = `${requirePublicUrl()}/organization/${encodedDid}`;

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
      ...(coverImageUrl
        ? {
            images: [
              {
                url: coverImageUrl,
                width: 1200,
                height: 630,
                alt: displayName,
              },
            ],
          }
        : {}),
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

  const { data, error } = await getOrgData(did);

  // Layout handles error and notFound states — guard defensively for edge races.
  if (error || !data?.org) return null;
  // data.org is non-null here — TypeScript needs the explicit variable to narrow
  const orgData = data as NonNullable<typeof data>;
  const orgInfo = orgData.org as GraphQLOrgInfoItem;
  const { organization } = transformOrgData(orgInfo, []);

  // ── JSON-LD structured data ───────────────────────────────────────────────

  const orgUrl = `${requirePublicUrl()}/organization/${encodedDid}`;
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": orgUrl,
    name: organization.displayName,
    description: organization.shortDescription ?? undefined,
    url: organization.website ?? orgUrl,
    ...(organization.startDate
      ? { foundingDate: organization.startDate?.slice(0, 10) }
      : {}),
    ...(organization.country
      ? {
          address: {
            "@type": "PostalAddress",
            addressCountry: organization.country,
          },
        }
      : {}),
    ...(organization.website ? { sameAs: [organization.website] } : {}),
    ...(organization.logoUrl
      ? { logo: { "@type": "ImageObject", url: organization.logoUrl } }
      : {}),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <OrgAbout organization={organization} />
    </>
  );
}
