import { auth } from "@/lib/auth";
import { TreeUploadWizard } from "./_components/TreeUploadWizard";

/**
 * /manage/trees — Tree biodiversity upload wizard
 *
 * Auth is enforced by the (MANAGE) layout. If somehow reached without
 * auth, render nothing — the layout's SignInPrompt covers this case.
 */
export default async function TreesUploadPage() {
  const session = await auth.session.getSession();
  if (!session.isLoggedIn) return null;
  return <TreeUploadWizard />;
}
