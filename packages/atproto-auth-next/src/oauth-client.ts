import { NodeOAuthClient } from "@atproto/oauth-client-node";
import type { NodeOAuthClientOptions } from "@atproto/oauth-client-node";
import { JoseKey } from "@atproto/jwk-jose";
import { isLoopback } from "./utils/url";

export const DEFAULT_OAUTH_SCOPE = "atproto transition:generic";

export type OAuthClientConfig = {
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
export function createOAuthClient({
  publicUrl,
  privateKeyJwk,
  stateStore,
  sessionStore,
  scope = DEFAULT_OAUTH_SCOPE,
  extraRedirectUris = [],
  clientName = "Gainforest",
}: OAuthClientConfig): NodeOAuthClient {
  const url = publicUrl.replace(/\/$/, "");
  // Must be a non-empty tuple [string, ...string[]] for the OAuth client type
  const redirectUris: [string, ...string[]] = [
    `${url}/api/oauth/callback`,
    ...extraRedirectUris,
  ];
  const loopback = isLoopback(url);

  // The stored JWK may be a single key object OR a keyset ({ keys: [...] }).
  // Extract the raw key object either way, then wrap it in a JoseKey instance
  // so the Keyset constructor gets a real Key object (with isActive, matches,
  // etc.) rather than a plain object. Passing a plain object works in Bun/dev
  // but fails on Vercel's webpack bundle.
  const parsed = JSON.parse(privateKeyJwk);
  const rawJwk = Array.isArray(parsed?.keys) ? parsed.keys[0] : parsed;
  const key = new JoseKey(rawJwk);

  if (loopback) {
    // RFC 8252 loopback client — client_id embeds scope + all redirect_uris
    const params = new URLSearchParams();
    params.set("scope", scope);
    for (const uri of redirectUris) {
      params.append("redirect_uri", uri);
    }
    const clientId = `http://localhost?${params.toString()}`;

    return new NodeOAuthClient({
      clientMetadata: {
        client_id: clientId,
        client_name: clientName,
        client_uri: url,
        redirect_uris: redirectUris,
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
        scope,
        token_endpoint_auth_method: "none",
        application_type: "native",
        dpop_bound_access_tokens: true,
      },
      keyset: [key],
      stateStore,
      sessionStore,
    });
  }

  // Production web client
  return new NodeOAuthClient({
    clientMetadata: {
      client_id: `${url}/client-metadata.json`,
      client_name: clientName,
      client_uri: url,
      redirect_uris: redirectUris,
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      scope,
      token_endpoint_auth_method: "private_key_jwt",
      token_endpoint_auth_signing_alg: "ES256",
      application_type: "web",
      dpop_bound_access_tokens: true,
      jwks_uri: `${url}/.well-known/jwks.json`,
    },
    keyset: [key],
    stateStore,
    sessionStore,
  });
}

export { NodeOAuthClient };
export type { NodeOAuthClientOptions };
