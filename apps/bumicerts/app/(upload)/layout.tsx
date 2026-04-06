import { auth } from "@/lib/auth";
import { UploadLayoutClient } from "./_components/UploadLayoutClient";
import { SignInPrompt } from "./_components/SignInPrompt";
import { ModalProvider } from "@/components/ui/modal/context";

/**
 * (upload) layout
 *
 * Server component — reads session on every request.
 * If the user is not authenticated, renders a sign-in prompt.
 * Otherwise, passes the DID to the client layout shell.
 */
export default async function UploadLayout({
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

  return (
    <UploadLayoutClient did={session.did}>
      {children}
    </UploadLayoutClient>
  );
}
