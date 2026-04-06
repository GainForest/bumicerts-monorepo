import { auth } from "@/lib/auth";
import { BumicertsClient } from "./_components/BumicertsClient";

export default async function UploadBumicertsPage() {
  const session = await auth.session.getSession();
  if (!session.isLoggedIn) return null;
  return <BumicertsClient did={session.did} />;
}
