import { SupabaseClient } from "@supabase/supabase-js";
import { debug } from "@/lib/logger";

export interface EpdsOAuthState {
  codeVerifier: string;
  dpopPrivateJwk: JsonWebKey;
}

/**
 * Creates a Supabase-backed ephemeral state store for the ePDS OAuth flow.
 *
 * This stores the code verifier and DPoP private JWK between the login and
 * callback requests. Uses delete-on-read semantics for one-time-use security.
 *
 * Reuses the existing `atproto_oauth_state` table with a namespaced app_id.
 */
export function createEpdsStateStore(
  supabase: SupabaseClient,
  appId: string
) {
  const compositeKey = (state: string) => `${appId}:${state}`;

  return {
    /**
     * Upserts a row into atproto_oauth_state with a 10-minute TTL.
     */
    async set(state: string, data: EpdsOAuthState): Promise<void> {
      const key = compositeKey(state);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      debug.log('[epds-state-store] SET', { key, hasCodeVerifier: !!data.codeVerifier, codeVerifierLength: data.codeVerifier?.length, hasPrivateJwk: !!data.dpopPrivateJwk, hasPrivateJwkD: !!(data.dpopPrivateJwk as JsonWebKey & { d?: string })?.d, expiresAt });

      const { error } = await supabase
        .from("atproto_oauth_state")
        .upsert(
          {
            id: key,
            app_id: appId,
            value: data,
            expires_at: expiresAt,
          },
          { onConflict: "id" }
        );

      if (error) {
        throw new Error(`ePDS state store set failed: ${error.message}`);
      }
    },

    /**
     * Delete-on-read: atomically deletes the row and returns its value in a
     * single round-trip using DELETE...RETURNING. Only one concurrent request
     * can win — the second gets PGRST116 (no rows) and returns undefined.
     */
    async get(state: string): Promise<EpdsOAuthState | undefined> {
      const key = compositeKey(state);

      // Atomic DELETE...RETURNING — single round-trip, no race condition
      const { data, error } = await supabase
        .from("atproto_oauth_state")
        .delete()
        .eq("id", key)
        .select("value, expires_at")
        .single();

      // If not found (PGRST116 = "no rows"), return undefined
      if (error) {
        if (error.code === "PGRST116") {
          debug.log('[epds-state-store] GET', { key, found: false, expired: null });
          return undefined;
        }
        throw new Error(`ePDS state store get failed: ${error.message}`);
      }

      const expired = data.expires_at ? new Date(data.expires_at) < new Date() : false;
      debug.log('[epds-state-store] GET', { key, found: true, expired, expiresAt: data.expires_at });

      // Row is already deleted — check expiry and throw if expired
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        throw new Error("ePDS OAuth state has expired");
      }

      const result = data.value as EpdsOAuthState;
      debug.log('[epds-state-store] GET result', { key, hasValue: !!result, hasCodeVerifier: !!result?.codeVerifier, hasPrivateJwk: !!result?.dpopPrivateJwk });

      return result;
    },

    /**
     * Deletes the row by composite key.
     */
    async del(state: string): Promise<void> {
      const key = compositeKey(state);

      debug.log('[epds-state-store] DEL', { key });

      const { error } = await supabase
        .from("atproto_oauth_state")
        .delete()
        .eq("id", key);

      if (error) {
        throw new Error(`ePDS state store del failed: ${error.message}`);
      }
    },
  };
}
