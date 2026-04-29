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
 * Result of authorize() - either a success with the authorization URL,
 * or an error with a message that can be displayed to the user.
 */
export type AuthorizeResult =
  | { authorizationUrl: string }
  | { error: string; errorType: "identity" | "server" };

/**
 * Initiates the OAuth authorization flow.
 *
 * @param handle - The user's ATProto handle (e.g., "alice.climateai.org" or just "alice")
 * @returns The authorization URL on success, or an error with type information
 */
export async function authorize(handle: string): Promise<AuthorizeResult> {
  try {
    const { authorizationUrl } = await auth.actions.authorize(handle);
    return { authorizationUrl };
  } catch (err) {
    // Categorize the error for appropriate user messaging
    const message = err instanceof Error ? err.message : String(err);
    const lowerMessage = message.toLowerCase();

    // Identity/username resolution failures (user's handle doesn't exist)
    const isIdentityError =
      lowerMessage.includes("does not resolve to a did") ||
      lowerMessage.includes("failed to resolve identity") ||
      lowerMessage.includes("does not include the handle") ||
      lowerMessage.includes("invalid handle");

    // Server/PDS/network failures
    const isServerError =
      lowerMessage.includes("authorization server") ||
      lowerMessage.includes("pds") ||
      lowerMessage.includes("server metadata") ||
      lowerMessage.includes("fetch failed") ||
      lowerMessage.includes("network") ||
      lowerMessage.includes("econnrefused") ||
      lowerMessage.includes("timeout");

    // Log for debugging
    console.error("[authorize] OAuth flow failed:", {
      message,
      isIdentityError,
      isServerError,
    });

    // Return error in serializable format
    if (isIdentityError) {
      return {
        error: "Username not found. Please check your username and server.",
        errorType: "identity",
      };
    }

    if (isServerError) {
      return {
        error: "Unable to connect to the server. Please check your server address or try again later.",
        errorType: "server",
      };
    }

    return {
      error: "Unable to start sign-in. Please try again.",
      errorType: "server",
    };
  }
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
