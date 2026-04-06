import { auth } from "@/lib/auth";
import { UploadDashboardClient } from "./_components/UploadDashboardClient";

/**
 * /upload — Organisation profile page (view + edit modes)
 *
 * Auth is enforced by the (upload) layout. Mode (?mode=edit) is managed
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

  return <UploadDashboardClient did={session.did} />;
}
