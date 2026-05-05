import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  buildOrganizationDataFromOrganizationAccount,
} from "@/lib/account/server";
import { OrgBumicertsGrid } from "./_components/OrgBumicertsGrid";
import ErrorPage from "@/components/error-page";
import Container from "@/components/ui/container";
import { getIndexerCaller } from "@/lib/trpc/indexer/server";
import { requirePublicUrl } from "@/lib/url";
import { activitiesToBumicertDataArray } from "@/lib/adapters";
import type { BumicertData } from "@/lib/types";
import * as activitiesModule from "@/lib/graphql-dev/queries/activities";
import { OrgTabBar } from "../_components/OrgTabBar";

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
    return { title: "Bumicerts — Bumicerts" };
  }

  if (account.kind === "unknown") {
    return { title: "Bumicerts — Bumicerts" };
  }

  const displayName =
    account.kind === "organization"
      ? (() => {
          const organization = buildOrganizationDataFromOrganizationAccount(account);
          return organization.displayName.trim().length > 0
            ? organization.displayName
            : (account.profile.displayName ?? "Account");
        })()
      : (account.profile.displayName ?? did);

  return {
    title: `${displayName} Bumicerts — Bumicerts`,
    description: `Browse all Bumicerts created by ${displayName}.`,
    alternates: {
      canonical: `${requirePublicUrl()}/account/${encodedDid}/bumicerts`,
    },
  };
}

export default async function AccountBumicertsPage({
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
    console.error("[AccountBumicertsPage] Failed to read account", did, error);
    return (
      <Container className="pt-4">
        <ErrorPage
          title="Couldn't load this account"
          description="We had trouble fetching this account's data. Please try again."
          error={error}
        />
      </Container>
    );
  }

  if (account.kind === "unknown") {
    notFound();
  }

  let bumicerts: BumicertData[];

  try {
    const activities = await activitiesModule.fetch({ did });
    bumicerts = activitiesToBumicertDataArray(activities);
  } catch (error) {
    console.error("[AccountBumicertsPage] Error fetching activities", did, error);
    return (
      <Container className="pt-4">
        <ErrorPage
          title="Couldn't load this account's Bumicerts"
          description="We had trouble fetching this account's Bumicerts. Please try again."
          error={error}
        />
      </Container>
    );
  }

  if (account.kind === "user") {
    return (
      <>
        <Container className="pt-4">
          <OrgTabBar did={did} />
        </Container>
        <Container className="pb-8">
          <OrgBumicertsGrid bumicerts={bumicerts} />
        </Container>
      </>
    );
  }

  return <OrgBumicertsGrid bumicerts={bumicerts} />;
}
