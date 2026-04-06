import { auth } from "@/lib/auth";
import { SitesClient } from "./_components/SitesClient";

export default async function SitesPage() {
  const session = await auth.session.getSession();
  if (!session.isLoggedIn) return null;
  return <SitesClient did={session.did} />;
}
