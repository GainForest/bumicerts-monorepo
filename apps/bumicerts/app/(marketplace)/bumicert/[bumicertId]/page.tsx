import { cache } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { queries, type Activity, type ActivityOrgInfo } from "@/lib/graphql/queries/index";
import { activityToBumicertData } from "@/lib/adapters";
import type { FundingConfigData } from "@/lib/types";
import { BumicertDetail } from "./_components/BumicertDetail";
import ErrorPage from "@/components/error-page";
import Container from "@/components/ui/container";
import { auth } from "@/lib/auth";

const BASE_URL = "https://bumicerts.com";

const getActivityData = cache(async (did: string) => {
  try {
    const data = await queries.activities.fetch({ did, orgDid: did }) as { activities: Activity[]; org: ActivityOrgInfo | null };
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
});

// ── Metadata ──────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ bumicertId: string }>;
}): Promise<Metadata> {
  const { bumicertId } = await params;
  const id = decodeURIComponent(bumicertId);
  const parsed = id.includes("-") ? id.split("-") : null;
  if (!parsed) return { title: "Bumicert Not Found" };

  const [did, rkey] = parsed;
  const { data, error } = await getActivityData(did);
  if (error || !data) return { title: "Bumicert Not Found" };

  const activity = (data.activities ?? []).find((a) => a.metadata?.rkey === rkey);
  if (!activity) return { title: "Bumicert Not Found" };

  const bumicert = activityToBumicertData(activity);
  const pageUrl = `${BASE_URL}/bumicert/${encodeURIComponent(id)}`;
  const description = bumicert.shortDescription ?? bumicert.description.slice(0, 160) ?? "";

  return {
    title: `${bumicert.title} — Bumicerts`,
    description,
    alternates: { canonical: pageUrl },
    openGraph: {
      title: bumicert.title,
      description,
      url: pageUrl,
      siteName: "Bumicerts",
      type: "article",
      ...(bumicert.coverImageUrl
        ? { images: [{ url: bumicert.coverImageUrl, width: 1200, height: 630, alt: bumicert.title }] }
        : {}),
    },
    twitter: {
      card: bumicert.coverImageUrl ? "summary_large_image" : "summary",
      title: bumicert.title,
      description,
    },
  };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function BumicertDetailPage({
  params,
}: {
  params: Promise<{ bumicertId: string }>;
}) {
  const { bumicertId } = await params;
  const id = decodeURIComponent(bumicertId);

  const parsed = id.includes("-") ? id.split("-") : null;
  if (!parsed) notFound();

  const [did, rkey] = parsed;

  // Fetch activity data and session in parallel
  const [{ data, error }, session] = await Promise.all([
    getActivityData(did),
    auth.session.getSession(),
  ]);

  if (error) {
    console.error("Error fetching Bumicert", did, rkey, error);
    return (
      <Container className="pt-4">
        <ErrorPage
          title="Couldn't load this bumicert"
          description="We had trouble fetching this bumicert's data. Please try again or go back to the homepage."
          error={error}
        />
      </Container>
    );
  }

  const activity = (data?.activities ?? []).find((a) => a.metadata?.rkey === rkey);
  if (!activity) notFound();

  const bumicert = activityToBumicertData(activity);
  const pageUrl = `${BASE_URL}/bumicert/${encodeURIComponent(id)}`;

  // ── Ownership check ─────────────────────────────────────────────────────────
  const isOwner = session.isLoggedIn && session.did === bumicert.organizationDid;

  // ── Extract funding config from the joined activity data ────────────────────
  // The indexer joins funding.config onto the activity via shared rkey.
  // Cast to FundingConfigData (shapes match the fragment we query).
  const rawFc = activity.fundingConfig;
  const fundingConfig: FundingConfigData | null = rawFc
    ? {
        receivingWallet: (() => {
          const rw = rawFc.receivingWallet;
          if (rw && typeof rw === "object" && "uri" in (rw as object)) {
            return { uri: (rw as { uri: string }).uri };
          }
          return null;
        })(),
        status: (rawFc.status ?? null) as FundingConfigData["status"],
        goalInUSD: rawFc.goalInUSD ?? null,
        minDonationInUSD: rawFc.minDonationInUSD ?? null,
        maxDonationInUSD: rawFc.maxDonationInUSD ?? null,
        allowOversell: rawFc.allowOversell ?? null,
        createdAt: rawFc.createdAt
          ? String(rawFc.createdAt)
          : null,
        updatedAt: rawFc.updatedAt
          ? String(rawFc.updatedAt)
          : null,
      }
    : null;

  // ── JSON-LD structured data ─────────────────────────────────────────────────
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": pageUrl,
    headline: bumicert.title,
    description: bumicert.shortDescription ?? bumicert.description.slice(0, 160) ?? undefined,
    author: {
      "@type": "Organization",
      name: bumicert.organizationName,
      url: `${BASE_URL}/organization/${encodeURIComponent(bumicert.organizationDid)}`,
    },
    ...(bumicert.coverImageUrl
      ? { image: { "@type": "ImageObject", url: bumicert.coverImageUrl } }
      : {}),
    ...(bumicert.startDate ? { datePublished: bumicert.startDate } : {}),
    ...(bumicert.createdAt ? { dateCreated: bumicert.createdAt } : {}),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <main className="w-full">
        <Container className="pt-3 pb-12">
          <BumicertDetail
            bumicert={bumicert}
            isOwner={isOwner}
            fundingConfig={fundingConfig}
          />
        </Container>
      </main>
    </>
  );
}
