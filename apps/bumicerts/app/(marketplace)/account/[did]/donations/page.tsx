import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getIndexerCaller } from "@/lib/trpc/indexer/server";
import { requirePublicUrl } from "@/lib/url";
import ErrorPage from "@/components/error-page";
import { DonationHistory } from "../../../user/[did]/_components/DonationHistory";

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
    return { title: "Donation History — Bumicerts" };
  }

  if (account.kind !== "user") {
    return { title: "Donation History — Bumicerts" };
  }

  const displayName = account.profile.displayName ?? did;

  return {
    title: `${displayName} Donation History — Bumicerts`,
    description: `Browse the public donation history for ${displayName}.`,
    alternates: {
      canonical: `${requirePublicUrl()}/account/${encodedDid}/donations`,
    },
  };
}

export default async function AccountDonationsPage({
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
    console.error("[AccountDonationsPage] Failed to read account", did, error);
    return (
      <ErrorPage
        title="Couldn't load this account"
        description="We had trouble fetching this account's data. Please try again."
        error={error}
      />
    );
  }

  if (account.kind !== "user") {
    notFound();
  }

  return (
    <section className="py-6">
      <DonationHistory userDid={did} />
    </section>
  );
}
