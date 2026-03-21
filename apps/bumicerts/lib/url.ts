/**
 * Public base URL resolution — single source of truth.
 *
 * This is the ONLY place in the app that reads URL-related environment
 * variables. Everywhere else must import from here.
 *
 * Priority (highest → lowest):
 *   1. NEXT_PUBLIC_BASE_URL          — explicit override. Set this in:
 *                                       • .env.local for local dev (e.g. http://127.0.0.1:3001
 *                                         or an ngrok tunnel URL)
 *                                       • Vercel "Production" env vars to pin a specific
 *                                         custom domain (e.g. https://alpha.fund.gainforest.app)
 *   2. VERCEL_PROJECT_PRODUCTION_URL — Vercel system variable. Always the shortest
 *                                      production custom domain, even when running on a
 *                                      preview deployment. Never the raw *.vercel.app alias.
 *   3. VERCEL_URL                    — Vercel system variable. The raw deployment alias
 *                                      (e.g. bumicerts-r3f59v16y-gainforest.vercel.app).
 *                                      Last resort — used for preview deploys that have no
 *                                      custom domain.
 *
 * Why not derive the URL from the incoming request?
 *   The OAuth client (NodeOAuthClient) is initialised once at startup with a fixed
 *   client_id and redirect_uris. These must be stable across all requests — they
 *   cannot be derived per-request. The URL must therefore be known at init time.
 *
 * Server-only: this file imports serverEnv which must never be bundled into the
 * browser. Only import from server components, API routes, server actions, and
 * other server-only modules (e.g. lib/auth.ts).
 */

import { serverEnv } from "@/lib/env/server";
import { clientEnv } from "@/lib/env/client";

/**
 * Returns the app's canonical public base URL, or `undefined` if none can be
 * resolved (e.g. during `next build` before any env vars are available).
 *
 * Strips trailing slashes. Never includes a path segment.
 */
export function getPublicUrl(): string | undefined {
  const raw =
    clientEnv.NEXT_PUBLIC_BASE_URL ??
    (serverEnv.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${serverEnv.VERCEL_PROJECT_PRODUCTION_URL}`
      : undefined) ??
    (serverEnv.VERCEL_URL
      ? `https://${serverEnv.VERCEL_URL}`
      : undefined);

  return raw?.replace(/\/$/, "");
}

/**
 * Like getPublicUrl() but throws a descriptive error if no URL can be resolved.
 *
 * Use this wherever the URL is required at runtime — OAuth setup, metadata
 * generation, structured data, absolute asset URIs, etc.
 */
export function requirePublicUrl(): string {
  const url = getPublicUrl();
  if (!url) {
    throw new Error(
      "[bumicerts] Could not resolve the app's public base URL.\n" +
      "Set one of the following in your environment:\n" +
      "  • NEXT_PUBLIC_BASE_URL=http://127.0.0.1:3001  (local dev)\n" +
      "  • NEXT_PUBLIC_BASE_URL=https://your-tunnel.ngrok.io  (local dev with tunnel)\n" +
      "  • NEXT_PUBLIC_BASE_URL=https://alpha.fund.gainforest.app  (Vercel Production env var)\n" +
      "On Vercel, VERCEL_PROJECT_PRODUCTION_URL and VERCEL_URL are auto-injected as fallbacks.",
    );
  }
  return url;
}
