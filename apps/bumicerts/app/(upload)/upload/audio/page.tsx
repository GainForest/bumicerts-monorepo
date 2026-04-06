import { auth } from "@/lib/auth";
import { AudioClient } from "./_components/AudioClient";

export default async function AudioPage() {
  const session = await auth.session.getSession();
  if (!session.isLoggedIn) return null;
  return <AudioClient did={session.did} />;
}
