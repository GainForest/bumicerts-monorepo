import { auth } from "@/lib/auth";
import { TreeUploadWizard } from "./_components/TreeUploadWizard";

/**
 * /upload/trees — Tree biodiversity upload wizard
 *
 * Auth is enforced by the (upload) layout. If somehow reached without
 * auth, render nothing — the layout's SignInPrompt covers this case.
 */
export default async function TreesUploadPage() {
  const session = await auth.session.getSession();
  if (!session.isLoggedIn) return null;
  return <TreeUploadWizard />;
}
