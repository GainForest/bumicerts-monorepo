import { auth } from "@/lib/auth";
import { ManageLayoutClient } from "./_components/UploadLayoutClient";
import { SignInPrompt } from "./_components/SignInPrompt";
import { ModalProvider } from "@/components/ui/modal/context";

/**
 * (MANAGE) layout
 *
 * Server component — reads session on every request.
 * If the user is not authenticated, renders a sign-in prompt.
 * Otherwise, passes the DID to the client layout shell.
 */
export default async function ManageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.session.getSession();

  if (!session.isLoggedIn) {
    // Unauthenticated: show sign-in prompt (needs ModalProvider for the auth modal)
    return (
      <ModalProvider>
        <SignInPrompt />
      </ModalProvider>
    );
  }

  return <ManageLayoutClient did={session.did}>{children}</ManageLayoutClient>;
}
