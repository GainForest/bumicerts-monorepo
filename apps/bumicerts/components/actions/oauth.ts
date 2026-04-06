"use server";

/**
 * OAuth Server Actions
 *
 * These server actions wrap the auth package's actions for use in client components.
 * They provide the same functionality but are exported from a "use server" file
 * so they can be called from React client components.
 *
 * @example
 * ```tsx
 * "use client";
 * import { authorize, logout, checkSession } from "@/components/actions/oauth";
 *
 * // In a login form
 * const handleLogin = async (handle: string) => {
 *   const { authorizationUrl } = await authorize(handle);
 *   window.location.href = authorizationUrl;
 * };
 *
 * // In a logout button
 * const handleLogout = async () => {
 *   await logout();
 *   router.refresh();
 * };
 * ```
 */

import { auth } from "@/lib/auth";
import type { ProfileData, ProfileAuthError } from "@gainforest/atproto-auth-next/client";

/**
 * Initiates the OAuth authorization flow.
 *
 * @param handle - The user's ATProto handle (e.g., "alice.climateai.org" or just "alice")
 * @returns The authorization URL to redirect the user to
 */
export async function authorize(handle: string): Promise<{ authorizationUrl: string }> {
  return auth.actions.authorize(handle);
}

/**
 * Logs out the current user.
 *
 * Clears the session cookie and revokes OAuth tokens.
 *
 * @returns Success indicator
 */
export async function logout(): Promise<{ success: boolean }> {
  return auth.actions.logout();
}

/**
 * Checks the current session status.
 *
 * @returns Session status with user info if authenticated
 */
export async function checkSession(): Promise<
  | { authenticated: false }
  | { authenticated: true; did: string; handle?: string }
> {
  return auth.actions.checkSession();
}

/**
 * Fetches the user's ATProto profile.
 *
 * @param did - The user's DID
 * @returns Profile data, null if not found, or ProfileAuthError if unauthorized
 */
export async function getProfile(
  did: string
): Promise<ProfileData | ProfileAuthError | null> {
  return auth.actions.getProfile(did);
}

/**
 * Checks the current session and fetches the user's profile in a single call.
 *
 * This is more efficient than calling checkSession() then getProfile()
 * since it only restores the OAuth session once.
 *
 * @returns Combined session + profile data
 */
export async function checkSessionAndGetProfile(): Promise<{
  isLoggedIn: boolean;
  did?: string;
  handle?: string;
  profile?: ProfileData;
}> {
  return auth.actions.checkSessionAndGetProfile();
}
