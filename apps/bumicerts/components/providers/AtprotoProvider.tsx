"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAtprotoStore } from "@/components/stores/atproto";
import { checkSessionAndGetProfile } from "@/components/actions/oauth";

/**
 * Provider component that initializes ATProto session state.
 *
 * This component handles session initialization in a useEffect to avoid the
 * "Server Functions cannot be called during initial render" error that occurs
 * when calling server actions during module evaluation or initial render.
 *
 * Must be placed in the component tree before any components that use
 * useAtprotoStore.
 *
 * @example
 * ```tsx
 * // In your layout.tsx
 * <AtprotoProvider>
 *   {children}
 * </AtprotoProvider>
 * ```
 */
export function AtprotoProvider({ children }: { children: React.ReactNode }) {
  const initialized = useRef(false);
  const setAuth = useAtprotoStore((state) => state.setAuth);
  const router = useRouter();

  useEffect(() => {
    // Prevent double initialization in React Strict Mode
    if (initialized.current) return;
    initialized.current = true;

    const initSession = async () => {
      try {
        // Single server action that restores the session once and returns
        // both session status and profile data, eliminating the sequential
        // checkSession() + getProfile() waterfall.
        const result = await checkSessionAndGetProfile();
        if (result.isLoggedIn && result.did) {
          const profile = result.profile;

          // Use handle from session cookie if profile returns invalid handle
          const validHandle =
            profile?.handle && profile.handle !== "handle.invalid"
              ? profile.handle
              : result.handle;

          // Profile data is optional — a missing profile doesn't mean logged out.
          // The session cookie is the source of truth for auth state.
          setAuth({
            did: result.did,
            handle: validHandle,
            displayName: profile?.displayName,
            avatar: profile?.avatar,
          });

          // Redirect back to the page the user was on before login
          const authRedirect = localStorage.getItem("auth_redirect");
          if (authRedirect) {
            localStorage.removeItem("auth_redirect");
            router.replace(authRedirect);
          }
        } else {
          setAuth(null);
        }
      } catch (error) {
        console.error("Error checking session:", error);
        setAuth(null);
      }
    };

    initSession();
  }, [setAuth]);

  return <>{children}</>;
}
