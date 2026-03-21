export { A as AuthActions, a as AuthSetup, b as AuthSetupConfig, c as createAuthSetup } from './setup-DXpNZorY.cjs';
export { A as AnySession, E as EmptySession, P as ProfileAuthError, a as ProfileData, S as SessionData } from './client-BzoqfpZM.cjs';
import { NodeOAuthClientOptions, NodeOAuthClient } from '@atproto/oauth-client-node';
export { NodeOAuthClient } from '@atproto/oauth-client-node';
import '@supabase/supabase-js';
import 'next/server';
import '@atproto/api';

declare const DEFAULT_OAUTH_SCOPE = "atproto transition:generic";
type OAuthClientConfig = {
    publicUrl: string;
    privateKeyJwk: string;
    stateStore: NodeOAuthClientOptions["stateStore"];
    sessionStore: NodeOAuthClientOptions["sessionStore"];
    /** OAuth scope string. Defaults to "atproto transition:generic". */
    scope?: string;
    /** Extra redirect URIs to include (e.g. ePDS callback). */
    extraRedirectUris?: string[];
    /** App name shown in OAuth consent screen. Defaults to "Gainforest". */
    clientName?: string;
};
/**
 * Creates a NodeOAuthClient configured for either loopback (local dev) or
 * production (web) based on the resolved public URL.
 *
 * Loopback (127.0.0.1 / localhost):
 *   - Uses RFC 8252 native app client_id: http://localhost?scope=...&redirect_uri=...
 *   - No client authentication (token_endpoint_auth_method: "none")
 *   - application_type: "native"
 *
 * Production:
 *   - Uses web client_id: {publicUrl}/client-metadata.json
 *   - Private key JWT authentication
 *   - application_type: "web"
 */
declare function createOAuthClient({ publicUrl, privateKeyJwk, stateStore, sessionStore, scope, extraRedirectUris, clientName, }: OAuthClientConfig): NodeOAuthClient;

/**
 * Normalize the public URL provided at setup time.
 *
 * Returns the PLACEHOLDER_URL sentinel when no URL is provided. This is
 * intentional: `next build` runs setup code at module-evaluation time before
 * any real URL is known. The sentinel is recognised by createAuthSetup() and
 * turned into a clear runtime error if the app is actually served without a
 * valid publicUrl.
 *
 * @param explicitUrl - The URL resolved by the consuming app (e.g. from VERCEL_URL).
 */
declare function resolvePublicUrl(explicitUrl?: string): string;
/**
 * Returns true if the given URL is a loopback address (127.0.0.1 or localhost).
 *
 * Used to select between the loopback OAuth client (RFC 8252 native app)
 * and the production web OAuth client.
 */
declare function isLoopback(url: string): boolean;

export { DEFAULT_OAUTH_SCOPE, type OAuthClientConfig, createOAuthClient, isLoopback, resolvePublicUrl };
