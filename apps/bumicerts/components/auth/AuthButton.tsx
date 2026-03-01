"use client";

/**
 * AuthButton
 *
 * A thin wrapper around UserMenu that exposes auth state as a single
 * import. Use this in navbars/sidebars — it handles all three states
 * (RESUMING → skeleton, AUTHENTICATED → user dropdown, UNAUTHENTICATED → sign-in/sign-up buttons)
 * internally via the Zustand atproto store.
 */
export { UserMenu as AuthButton } from "./UserMenu";
