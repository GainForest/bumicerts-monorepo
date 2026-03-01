"use server";

import { atprotoSDK } from "@/lib/atproto";
import {
  getAppSession,
  clearAppSession,
  AppSessionData,
} from "gainforest-sdk/oauth";
import { allowedPDSDomains } from "@/lib/config/gainforest-sdk";

/**
 * Initiates the OAuth authorization flow.
 *
 * This server action generates an authorization URL for the given handle.
 * The client should redirect to this URL to start the OAuth flow.
 *
 * @param handle - The user's ATProto handle (e.g., "alice.climateai.org" or just "alice")
 * @returns The authorization URL to redirect the user to
 *
 * @example
 * ```tsx
 * const { authorizationUrl } = await authorize("alice");
 * window.location.href = authorizationUrl;
 * ```
 */
export async function authorize(handle: string): Promise<{ authorizationUrl: string }> {
  // Normalize the handle - add domain if not present
  const normalizedHandle = handle.includes(".")
    ? handle
    : `${handle}.${allowedPDSDomains[0]}`;

  const authUrl = await atprotoSDK.authorize(normalizedHandle);

  return { authorizationUrl: authUrl.toString() };
}

/**
 * Logs out the current user.
 *
 * This server action clears the app session cookie, effectively logging
 * the user out. Note that this only clears the local session - the OAuth
 * tokens in Supabase may still be valid.
 *
 * @returns Success indicator
 *
 * @example
 * ```tsx
 * await logout();
 * // User is now logged out
 * ```
 */
export async function logout(): Promise<{ success: boolean }> {
  const session: AppSessionData = await getAppSession();
  try {
    if (session.did) {
      await atprotoSDK.revokeSession(session.did);
    }
  } catch (error) {
    console.error("Failed to revoke session:", error);
  } finally {
    await clearAppSession();
  }
  return { success: true };
}

/**
 * Checks the current session status.
 *
 * This server action reads the app session cookie and optionally verifies
 * that the OAuth session is still valid in Supabase.
 *
 * @returns Session status with user info if authenticated
 *
 * @example
 * ```tsx
 * const session = await checkSession();
 * if (session.authenticated) {
 *   console.log(`Logged in as ${session.did}`);
 * }
 * ```
 */
export async function checkSession(): Promise<
  | { authenticated: false }
  | { authenticated: true; did: string; handle?: string }
> {
  const session: AppSessionData = await getAppSession();

  if (!session.isLoggedIn || !session.did) {
    return { authenticated: false };
  }

  // Verify the OAuth session is still valid in Supabase.
  // This catches cases where the session was deleted by another process
  // (e.g. logging in from a different device/tab), preventing the UI from
  // showing the user as logged in when their tokens are actually gone.
  try {
    const oauthSession = await atprotoSDK.restoreSession(session.did);
    if (!oauthSession) {
      console.warn("[oauth] Could not restore session");
      await clearAppSession();
      return { authenticated: false };
    }
  } catch (e) {
    console.error("[oauth] Could not restore session:", e);
    // Session is dead — clear the stale cookie so the UI stays in sync
    await clearAppSession();
    return { authenticated: false };
  }

  return {
    authenticated: true,
    did: session.did,
    handle: session.handle,
  };
}

/**
 * Profile data returned from ATProto
 */
export type ProfileData = {
  handle: string;
  displayName?: string;
  description?: string;
  avatar?: string;
};

/**
 * Typed error returned by getProfile() when the caller is not authorized
 * to fetch the requested DID's profile. Distinct from null ("not found" /
 * session error) so callers can surface the right message.
 */
export type ProfileAuthError = { error: "unauthorized" };

/**
 * Fetches the user's ATProto profile using the hypercerts SDK.
 *
 * This server action restores the OAuth session and uses the repository
 * pattern to fetch the user's profile data including handle, display name,
 * and avatar.
 *
 * @param did - The user's DID
 * @returns Profile data, null if the profile doesn't exist or the session is
 *   invalid, or a {@link ProfileAuthError} if the caller's session DID does
 *   not match the requested DID (unauthorized).
 *
 * @example
 * ```tsx
 * const result = await getProfile("did:plc:abc123");
 * if (result && "error" in result) {
 *   // Unauthorized — session DID does not match requested DID
 * } else if (result) {
 *   console.log(`Hello, ${result.displayName ?? result.handle}!`);
 * }
 * ```
 */
export async function getProfile(
  did: string
): Promise<ProfileData | ProfileAuthError | null> {
  const appSession = await getAppSession();
  if (!appSession.isLoggedIn || appSession.did !== did) {
    return { error: "unauthorized" };
  }

  try {
    // Restore the OAuth session for this DID. getProfile() performs its own
    // session check above and does not assume checkSession() was called first.
    const session = await atprotoSDK.restoreSession(did);
    if (!session) {
      console.error("Could not restore session for profile fetch");
      return null;
    }

    // Get repository and fetch profile
    // repository() is now async and returns Promise<Repository>
    const repo = await atprotoSDK.repository(session);

    // Fetch both profiles in parallel — certified is often null so no need to waterfall
    const [certifiedProfile, bskyProfile] = await Promise.all([
      repo.profile.getCertifiedProfile().catch(() => null),
      repo.profile.getBskyProfile().catch(() => null),
    ]);
    const profile = certifiedProfile ?? bskyProfile;

    // Avatar is already a string URL in both CertifiedProfile and BskyProfile
    const avatarUrl: string | undefined = profile?.avatar ?? undefined;

    return {
      handle: profile?.handle ?? did,
      displayName: profile?.displayName,
      description: profile?.description,
      avatar: avatarUrl,
    };
  } catch (error) {
    console.error("Error fetching profile:", error);
    // Don't clear the session here — restoreSession may fail for ePDS sessions
    // due to SDK version mismatch, but the session is still valid in Supabase.
    // The user stays logged in, just without profile data.
    return null;
  }
}

/**
 * Checks the current session and fetches the user's profile in a single
 * server action, restoring the OAuth session only once.
 *
 * This replaces the pattern of calling `checkSession()` followed by
 * `getProfile()`, which would restore the session twice.
 *
 * @returns Combined session + profile data
 *
 * @example
 * ```tsx
 * const result = await checkSessionAndGetProfile();
 * if (result.isLoggedIn) {
 *   console.log(`Logged in as ${result.did}, profile:`, result.profile);
 * }
 * ```
 */
export async function checkSessionAndGetProfile(): Promise<{
  isLoggedIn: boolean;
  did?: string;
  handle?: string;
  profile?: ProfileData;
}> {
  const session = await getAppSession();
  if (!session.isLoggedIn || !session.did) {
    return { isLoggedIn: false };
  }

  try {
    const oauthSession = await atprotoSDK.restoreSession(session.did);
    if (!oauthSession) {
      console.warn("[oauth] Could not restore session");
      await clearAppSession();
      return { isLoggedIn: false };
    }

    const repo = await atprotoSDK.repository(oauthSession);

    // Fetch both profiles in parallel — certified is often null so no need to waterfall
    const [certifiedProfile, bskyProfile] = await Promise.all([
      repo.profile.getCertifiedProfile().catch(() => null),
      repo.profile.getBskyProfile().catch(() => null),
    ]);
    const rawProfile = certifiedProfile ?? bskyProfile;

    const profile: ProfileData | undefined = rawProfile
      ? {
          handle: rawProfile.handle ?? session.did,
          displayName: rawProfile.displayName,
          description: rawProfile.description,
          avatar: rawProfile.avatar ?? undefined,
        }
      : undefined;

    return {
      isLoggedIn: true,
      did: session.did,
      handle: session.handle,
      profile,
    };
  } catch (e) {
    console.error("[oauth] Could not restore session:", e);
    // Session is dead — clear the stale cookie so the UI stays in sync
    await clearAppSession();
    return { isLoggedIn: false };
  }
}
