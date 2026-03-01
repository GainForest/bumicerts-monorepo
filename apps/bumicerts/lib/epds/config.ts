import "server-only";

import { DEV_OAUTH_CONFIG, resolvePublicUrl, isLoopback } from "@/lib/atproto";

/**
 * Returns the ePDS OAuth endpoints derived from NEXT_PUBLIC_EPDS_URL.
 *
 * Given NEXT_PUBLIC_EPDS_URL = 'https://climateai.org':
 *   - parEndpoint:   'https://climateai.org/oauth/par'
 *   - authEndpoint:  'https://auth.climateai.org/oauth/authorize'
 *   - tokenEndpoint: 'https://climateai.org/oauth/token'
 *
 * Handles trailing slashes (strips them).
 * Handles URLs with ports (auth.hostname:port).
 *
 * @throws {Error} if NEXT_PUBLIC_EPDS_URL is not set
 */
export function getEpdsEndpoints(): {
  parEndpoint: string;
  authEndpoint: string;
  tokenEndpoint: string;
} {
  const epdsUrl = process.env.NEXT_PUBLIC_EPDS_URL;
  if (!epdsUrl) {
    throw new Error(
      "NEXT_PUBLIC_EPDS_URL is not set. " +
        "This environment variable is required for ePDS login. " +
        "Set it to the ePDS base URL, e.g. https://climateai.org"
    );
  }

  const normalizedUrl = epdsUrl.replace(/\/+$/, "");
  const url = new URL(normalizedUrl);
  const authHost = url.port
    ? `auth.${url.hostname}:${url.port}`
    : `auth.${url.hostname}`;

  return {
    parEndpoint: `${normalizedUrl}/oauth/par`,
    authEndpoint: `${url.protocol}//${authHost}/oauth/authorize`,
    tokenEndpoint: `${normalizedUrl}/oauth/token`,
  };
}

/**
 * Returns the OAuth client_id for ePDS login.
 *
 * Uses the resolved public URL to determine whether to use the loopback client_id
 * (for local dev with 127.0.0.1/localhost) or the production client_id
 * (for ngrok tunnels, Vercel deployments, or any non-loopback URL).
 *
 * This means ngrok URLs in development correctly get the production-style client_id
 * even when NODE_ENV is 'development'.
 *
 * This matches the client_id used in client-metadata.json.
 */
export function getEpdsClientId(): string {
  const publicUrl = resolvePublicUrl();
  if (isLoopback()) {
    return DEV_OAUTH_CONFIG.clientId;
  }
  return `${publicUrl}/client-metadata.json`;
}

/**
 * Returns the redirect URI for the ePDS OAuth callback.
 * Returns '{PUBLIC_URL}/api/oauth/epds/callback'.
 */
export function getEpdsRedirectUri(): string {
  const publicUrl = resolvePublicUrl();
  return `${publicUrl}/api/oauth/epds/callback`;
}

/**
 * Simple getter for NEXT_PUBLIC_EPDS_URL.
 * Used by client components to check if ePDS is enabled.
 * Returns undefined if not set.
 */
export function getEpdsUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_EPDS_URL;
}
