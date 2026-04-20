import { auth } from "@/lib/auth";
import { TreesPageClient } from "./_components/TreesPageClient";

/**
 * /upload/trees — Tree manager by default, upload wizard in `?mode=upload`
 *
 * Auth is enforced by the (MANAGE) layout. If somehow reached without
 * auth, render nothing — the layout's SignInPrompt covers this case.
 */
export default async function TreesPage() {
  const session = await auth.session.getSession();
  if (!session.isLoggedIn) return null;
  return <TreesPageClient did={session.did} />;
}
