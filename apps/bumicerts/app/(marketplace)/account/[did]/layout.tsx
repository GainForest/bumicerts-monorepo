import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import {
  buildOrganizationDataFromUserAccount,
  buildOrganizationDataFromOrganizationAccount,
} from "@/lib/account/server";
import { getIndexerCaller } from "@/lib/trpc/indexer/server";
import { OrgHero } from "./_components/OrgHero";
import { OrgTabBar } from "./_components/OrgTabBar";
import ErrorPage from "@/components/error-page";
import Container from "@/components/ui/container";
import { AccountOnboardingRequired } from "../_components/AccountOnboardingRequired";

export default async function AccountLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ did: string }>;
}) {
  const { did: encodedDid } = await params;
  const did = decodeURIComponent(encodedDid);

  const session = await auth.session.getSession();
  let account;

  try {
    const indexer = await getIndexerCaller();
    account = await indexer.account.byDid({ did });
  } catch (error) {
    console.error("[AccountLayout] Failed to read account", did, error);
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

  const isOwner = session.isLoggedIn && session.did === did;

  if (account.kind === "unknown") {
    if (!isOwner) {
      notFound();
    }

    return (
      <main className="w-full">
        <AccountOnboardingRequired />
      </main>
    );
  }

  if (account.kind === "user") {
    const userProfile = buildOrganizationDataFromUserAccount(account, {
      displayNameFallback: did,
    });

    return (
      <main className="w-full">
        <Container className="pt-4 pb-8">
          <OrgHero organization={userProfile} showEditButton={isOwner} />
          <OrgTabBar did={did} accountKind="user" />
          {children}
        </Container>
      </main>
    );
  }
  const organization = buildOrganizationDataFromOrganizationAccount(account);

  return (
    <main className="w-full">
      <Container className="pt-4 pb-8">
        <OrgHero organization={organization} showEditButton={isOwner} />
        <OrgTabBar did={organization.did} accountKind="organization" />
        {children}
      </Container>
    </main>
  );
}
