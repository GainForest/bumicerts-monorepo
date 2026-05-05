import { auth } from "@/lib/auth";
import type { AuthenticatedAccountState } from "@/lib/account";
import { ManageDashboardClient } from "./_components/UploadDashboardClient";
import { buildUploadAccountPageData } from "@/lib/account/server";
import ErrorPage from "@/components/error-page";
import { getIndexerCaller } from "@/lib/trpc/indexer/server";

/**
 * /upload — Organization profile page (view + edit modes)
 *
 * Auth is enforced by the (MANAGE) layout. Mode (?mode=edit) is managed
 * entirely client-side via nuqs — no searchParams needed here.
 *
 * SSR/SEO is intentionally not required for this route.
 */
export default async function UploadPage() {
  const session = await auth.session.getSession();

  // Layout already guards against unauthenticated access, but we need the
  // session data here. If somehow reached without auth, render nothing —
  // the layout's SignInPrompt covers this case.
  if (!session.isLoggedIn) return null;

  let account: AuthenticatedAccountState;
  let initialData: Awaited<ReturnType<typeof buildUploadAccountPageData>>;

  try {
    const indexer = await getIndexerCaller();
    account = await indexer.account.byDid({ did: session.did });
    initialData = await buildUploadAccountPageData(account);
  } catch (error) {
    console.error("[UploadPage] Failed to read account", session.did, error);
    return (
      <ErrorPage
        title="Couldn't load your account"
        description="We had trouble fetching your account data. Please try again."
        error={error}
      />
    );
  }

  return (
    <ManageDashboardClient
      did={session.did}
      initialAccount={account}
      initialData={initialData}
    />
  );
}
