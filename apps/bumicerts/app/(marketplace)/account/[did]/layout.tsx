import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import {
  buildOrganizationDataFromOrganizationAccount,
} from "@/lib/account/server";
import { getIndexerCaller } from "@/lib/trpc/indexer/server";
import { OrgHero } from "./_components/OrgHero";
import { OrgTabBar } from "./_components/OrgTabBar";
import { OrganizationLayoutClient } from "./_components/OrganizationLayoutClient";
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
      <OrganizationLayoutClient did={did}>
        <Container className="pt-4">
          <ErrorPage
            title="Couldn't load this account"
            description="We had trouble fetching this account's data. Please try again."
            error={error}
          />
        </Container>
      </OrganizationLayoutClient>
    );
  }

  const isOwner = session.isLoggedIn && session.did === did;

  if (account.kind === "unknown") {
    if (!isOwner) {
      notFound();
    }

    return (
      <OrganizationLayoutClient did={did}>
        <main className="w-full">
          <AccountOnboardingRequired />
        </main>
      </OrganizationLayoutClient>
    );
  }

  if (account.kind === "user") {
    return (
      <OrganizationLayoutClient did={did}>
        <main className="w-full">{children}</main>
      </OrganizationLayoutClient>
    );
  }
  const organization = buildOrganizationDataFromOrganizationAccount(account);

  return (
    <OrganizationLayoutClient did={did}>
      <main className="w-full">
        <Container className="pt-4 pb-8">
          <OrgHero organization={organization} showEditButton={isOwner} />
          <OrgTabBar did={organization.did} />
          {children}
        </Container>
      </main>
    </OrganizationLayoutClient>
  );
}
