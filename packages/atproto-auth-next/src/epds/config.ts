/**
 * ePDS endpoint resolution.
 *
 * Given an ePDS base URL (e.g. https://climateai.org), derives:
 *   - PAR endpoint:   {ePDS}/oauth/par
 *   - Auth endpoint:  {protocol}//auth.{host}/oauth/authorize
 *   - Token endpoint: {ePDS}/oauth/token
 *
 * Handles trailing slashes and URLs with ports.
 */

import { isLoopback } from "../utils/url";
import { DEFAULT_OAUTH_SCOPE } from "../oauth-client";

export type EpdsConfig = {
  /** ePDS base URL (e.g. https://climateai.org). */
  url: string;
};

export type EpdsEndpoints = {
  parEndpoint: string;
  authEndpoint: string;
  tokenEndpoint: string;
  /** The authorization server issuer (base URL). Used as `aud` in client_assertion JWTs. */
  issuer: string;
};

/**
 * Derives the three ePDS OAuth endpoints from the base URL.
 */
export function getEpdsEndpoints(config: EpdsConfig): EpdsEndpoints {
  const normalizedUrl = config.url.replace(/\/+$/, "");
  const url = new URL(normalizedUrl);
  const authHost = url.port
    ? `auth.${url.hostname}:${url.port}`
    : `auth.${url.hostname}`;

  return {
    issuer: normalizedUrl,
    parEndpoint: `${normalizedUrl}/oauth/par`,
    authEndpoint: `${url.protocol}//${authHost}/oauth/authorize`,
    tokenEndpoint: `${normalizedUrl}/oauth/token`,
  };
}

/**
 * Determines the OAuth client_id to use for ePDS requests.
 *
 * - Loopback (127.0.0.1/localhost): uses the RFC 8252 loopback client_id
 *   (same as the main OAuth client_id, which embeds redirect_uris in query params)
 * - Production: uses {publicUrl}/client-metadata.json
 */
export function getEpdsClientId(
  publicUrl: string,
  devClientId: string,
  scope = DEFAULT_OAUTH_SCOPE,
): string {
  if (isLoopback(publicUrl)) {
    return devClientId;
  }
  return `${publicUrl}/client-metadata.json`;
}

/**
 * Returns the redirect URI for the ePDS OAuth callback.
 */
export function getEpdsRedirectUri(publicUrl: string): string {
  return `${publicUrl}/api/oauth/epds/callback`;
}

export { DEFAULT_OAUTH_SCOPE };
