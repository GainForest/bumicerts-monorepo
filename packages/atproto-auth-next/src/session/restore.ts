/**
 * Session restoration utilities.
 *
 * These functions restore a stored OAuth session from Supabase and optionally
 * return an authenticated @atproto/api Agent for making API calls.
 */

import { Agent } from "@atproto/api";
import type { NodeOAuthClient } from "@atproto/oauth-client-node";
import { debug } from "../utils/debug";

/**
 * Restores a stored OAuth session for the given DID.
 *
 * Returns the restored session object (which can be passed to `new Agent(session)`)
 * or `null` if the session does not exist or has been revoked.
 *
 * @example
 * ```typescript
 * const oauthSession = await restoreSession(oauthClient, did);
 * if (!oauthSession) {
 *   // Session gone — user needs to re-authenticate
 * }
 * ```
 */
export async function restoreSession(
  client: NodeOAuthClient,
  did: string,
): Promise<Awaited<ReturnType<NodeOAuthClient["restore"]>> | null> {
  try {
    const session = await client.restore(did);
    debug.log("[restore-session] Restored", { did, found: !!session });
    return session;
  } catch (error) {
    console.log("ERROR_SESSION_RESTORE========", error);
    debug.warn("[restore-session] Failed to restore session", {
      did,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Restores an OAuth session and returns an authenticated Agent ready for API calls.
 *
 * Returns `null` if the session does not exist or restoration fails.
 *
 * @example
 * ```typescript
 * const agent = await getAuthenticatedAgent(oauthClient, did);
 * if (agent) {
 *   const profile = await agent.getProfile({ actor: did });
 * }
 * ```
 */
export async function getAuthenticatedAgent(
  client: NodeOAuthClient,
  did: string,
): Promise<Agent | null> {
  const session = await restoreSession(client, did);
  if (!session) return null;
  return new Agent(session);
}
