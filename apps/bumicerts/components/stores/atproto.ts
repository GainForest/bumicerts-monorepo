import { create } from "zustand";

export type User = {
  did: string;
  handle?: string;
  displayName?: string;
  avatar?: string;
};

export type AtprotoAuthCatalog = {
  unauthenticated: {
    status: "UNAUTHENTICATED";
    authenticated: false;
    user: null;
  };
  authenticated: {
    status: "AUTHENTICATED";
    authenticated: true;
    user: User;
  };
  resuming: {
    status: "RESUMING";
    authenticated: false;
    user: null;
  };
};

export type AtprotoStoreState = {
  isReady: boolean;
  auth: AtprotoAuthCatalog[keyof AtprotoAuthCatalog];
};

export type AtprotoStoreActions = {
  setAuth: (user: User | null) => void;
  setResuming: () => void;
};

/**
 * Zustand store for managing ATProto authentication state.
 *
 * Note: Session initialization is handled by the AtprotoProvider component,
 * which calls checkSession() in a useEffect after mount. This avoids the
 * "Server Functions cannot be called during initial render" error.
 *
 * @example
 * ```tsx
 * const auth = useAtprotoStore((state) => state.auth);
 *
 * if (auth.authenticated) {
 *   console.log(`Logged in as ${auth.user.did}`);
 * }
 * ```
 */
export const useAtprotoStore = create<AtprotoStoreState & AtprotoStoreActions>(
  (set) => ({
    isReady: false,
    auth: {
      status: "RESUMING",
      authenticated: false,
      user: null,
    },

    /**
     * Updates the authentication state.
     * Call this after OAuth callback to set the authenticated user,
     * or with null to log out.
     */
    setAuth: (user: User | null) => {
      if (user) {
        set({
          isReady: true,
          auth: {
            status: "AUTHENTICATED",
            authenticated: true,
            user,
          },
        });
      } else {
        set({
          isReady: true,
          auth: {
            status: "UNAUTHENTICATED",
            authenticated: false,
            user: null,
          },
        });
      }
    },

    /**
     * Sets the auth state to resuming (checking session).
     * Used by AtprotoProvider when refreshing session.
     */
    setResuming: () => {
      set({
        isReady: false,
        auth: {
          status: "RESUMING",
          authenticated: false,
          user: null,
        },
      });
    },
  })
);
