import { auth } from "@/lib/auth";
import { TreesManageClient } from "./_components/TreesManageClient";

export default async function TreesManagePage() {
  const session = await auth.session.getSession();
  if (!session.isLoggedIn) return null;
  return <TreesManageClient did={session.did} />;
}
