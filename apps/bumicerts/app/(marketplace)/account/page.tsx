import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { links } from "@/lib/links";
import { AccountOnboardingRequired } from "./_components/AccountOnboardingRequired";
import ErrorPage from "@/components/error-page";
import { getIndexerCaller } from "@/lib/trpc/indexer/server";

export default async function AccountPage() {
  const session = await auth.session.getSession();

  if (!session.isLoggedIn || !session.did) {
    redirect(links.home);
  }

  let account;
  try {
    const indexer = await getIndexerCaller();
    account = await indexer.account.byDid({ did: session.did });
  } catch (error) {
    console.error("[AccountPage] Failed to read account", session.did, error);
    return (
      <ErrorPage
        title="Couldn't load your account"
        description="We had trouble fetching your account data. Please try again."
        error={error}
      />
    );
  }

  if (account.kind === "organization" || account.kind === "user") {
    redirect(links.account.byDid(session.did));
  }

  return <AccountOnboardingRequired />;
}
