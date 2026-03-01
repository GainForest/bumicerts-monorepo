"use client";

import { useEffect, useRef } from "react";
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
          if (!profile) {
            setAuth(null);
            return;
          }

          // Use handle from session cookie if profile.get() returns invalid handle
          const validHandle =
            profile.handle && profile.handle !== "handle.invalid"
              ? profile.handle
              : result.handle;

          setAuth({
            did: result.did,
            handle: validHandle,
            displayName: profile.displayName,
            avatar: profile.avatar,
          });
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
