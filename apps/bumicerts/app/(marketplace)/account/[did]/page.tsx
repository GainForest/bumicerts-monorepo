import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  buildOrganizationDataFromOrganizationAccount,
} from "@/lib/account/server";
import { getIndexerCaller } from "@/lib/trpc/indexer/server";
import { OrgAbout } from "./_components/OrgAbout";
import { OrgTabBar } from "./_components/OrgTabBar";
import { requirePublicUrl } from "@/lib/url";
import ErrorPage from "@/components/error-page";
import LegacyUserProfilePage from "../../user/[did]/page";
import Container from "@/components/ui/container";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ did: string }>;
}): Promise<Metadata> {
  const { did: encodedDid } = await params;
  const did = decodeURIComponent(encodedDid);
  let account;

  try {
    const indexer = await getIndexerCaller();
    account = await indexer.account.byDid({ did });
  } catch {
    return { title: "Account — Bumicerts" };
  }

  if (account.kind === "unknown") {
    return { title: "Account — Bumicerts" };
  }

  const accountUrl = `${requirePublicUrl()}/account/${encodedDid}`;

  if (account.kind === "user") {
    const displayName = account.profile.displayName ?? did;
    const description = account.profile.description ?? `${displayName} on Bumicerts`;

    return {
      title: `${displayName} — Bumicerts`,
      description,
      alternates: { canonical: accountUrl },
      openGraph: {
        title: displayName,
        description,
        url: accountUrl,
        siteName: "Bumicerts",
        type: "profile",
      },
      twitter: {
        card: "summary",
        title: displayName,
        description,
      },
    };
  }

  const organization = buildOrganizationDataFromOrganizationAccount(account);
  const displayName =
    organization.displayName.trim().length > 0
      ? organization.displayName
      : (account.profile.displayName ?? "Account");
  const description =
    organization.shortDescription.trim().length > 0
      ? organization.shortDescription
      : `${displayName} on Bumicerts.`;
  const coverImageUrl = organization.coverImageUrl;

  return {
    title: `${displayName} — Bumicerts`,
    description,
    alternates: { canonical: accountUrl },
    openGraph: {
      title: displayName,
      description,
      url: accountUrl,
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

export default async function AccountByDidPage({
  params,
}: {
  params: Promise<{ did: string }>;
}) {
  const { did: encodedDid } = await params;
  const did = decodeURIComponent(encodedDid);

  let account;

  try {
    const indexer = await getIndexerCaller();
    account = await indexer.account.byDid({ did });
  } catch (error) {
    console.error("[AccountByDidPage] Failed to read account", did, error);
    return (
      <ErrorPage
        title="Couldn't load this account"
        description="We had trouble fetching this account's data. Please try again."
        error={error}
      />
    );
  }

  if (account.kind === "unknown") {
    notFound();
  }

  if (account.kind === "user") {
    return (
      <>
        <Container className="pt-4">
          <OrgTabBar did={did} />
        </Container>
        <LegacyUserProfilePage params={Promise.resolve({ did: encodedDid })} />
      </>
    );
  }

  const organization = buildOrganizationDataFromOrganizationAccount(account);

  const accountUrl = `${requirePublicUrl()}/account/${encodedDid}`;
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": accountUrl,
    name: organization.displayName,
    description: organization.shortDescription ?? undefined,
    url: organization.website ?? accountUrl,
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
