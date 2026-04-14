/**
 * Public base URL resolution — single source of truth.
 *
 * This is the ONLY place in the app that reads URL-related environment
 * variables. Everywhere else must import from here.
 *
 * Priority (highest → lowest):
 *   1. VERCEL_URL (preview only)     — On preview deployments, ALWAYS use the raw
 *                                      deployment alias so OAuth redirects go back to
 *                                      the preview, not the production custom domain.
 *                                      This overrides NEXT_PUBLIC_BASE_URL intentionally.
 *   2. NEXT_PUBLIC_BASE_URL          — explicit override. Set this in:
 *                                       • .env.local for local dev (e.g. http://127.0.0.1:3001
 *                                         or an ngrok tunnel URL)
 *                                       • Vercel "Production" env vars to pin a specific
 *                                         custom domain (e.g. https://alpha.fund.gainforest.app)
 *   3. VERCEL_PROJECT_PRODUCTION_URL — Vercel system variable. The shortest production
 *                                      custom domain. Used for production deployments.
 *   4. VERCEL_URL                    — Vercel system variable. The raw deployment alias
 *                                      (e.g. bumicerts-r3f59v16y-gainforest.vercel.app).
 *                                      Last resort fallback.
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
  // 1. On Vercel preview deployments, ALWAYS use VERCEL_URL (the actual
  //    preview deployment alias). This MUST come before the NEXT_PUBLIC_BASE_URL
  //    check — otherwise a globally-set NEXT_PUBLIC_BASE_URL (e.g. set for
  //    "All Environments" in the Vercel dashboard) would override the preview
  //    URL. That causes OAuth redirect_uris to point to the production domain,
  //    so after login the user is sent to production instead of the preview.
  if (serverEnv.VERCEL_ENV === "preview" && serverEnv.VERCEL_URL) {
    return `https://${serverEnv.VERCEL_URL.trim()}`;
  }

  // 2. Explicit override (local dev, ngrok, production custom domain, etc.)
  if (clientEnv.NEXT_PUBLIC_BASE_URL) {
    return clientEnv.NEXT_PUBLIC_BASE_URL.trim().replace(/\/$/, "");
  }

  // 3. Production: prefer the shortest custom domain, fall back to raw alias.
  const raw =
    (serverEnv.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${serverEnv.VERCEL_PROJECT_PRODUCTION_URL.trim()}`
      : undefined) ??
    (serverEnv.VERCEL_URL
      ? `https://${serverEnv.VERCEL_URL.trim()}`
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

/**
 * Client-safe version of getPublicUrl() that only uses NEXT_PUBLIC_* env vars.
 *
 * Safe to use in "use client" components. Uses the canonical public URL from
 * environment variables instead of window.location.origin, ensuring share links
 * always use the production domain even when accessed from preview/alpha URLs.
 *
 * Falls back to window.location.origin only if no env var is set (local dev).
 */
export function getPublicUrlClient(): string {
  // 1. Explicit override (production custom domain, ngrok, etc.)
  //    This is the canonical URL and should be used for all share links.
  if (clientEnv.NEXT_PUBLIC_BASE_URL) {
    return clientEnv.NEXT_PUBLIC_BASE_URL.trim().replace(/\/$/, "");
  }

  // 2. Vercel preview: use the preview URL (NEXT_PUBLIC_VERCEL_URL)
  //    Note: On preview, we want share links to use the preview URL so
  //    recipients can see the same preview deployment.
  if (clientEnv.NEXT_PUBLIC_VERCEL_ENV === "preview" && clientEnv.NEXT_PUBLIC_VERCEL_URL) {
    return `https://${clientEnv.NEXT_PUBLIC_VERCEL_URL.trim()}`;
  }

  // 3. Production: use NEXT_PUBLIC_VERCEL_URL if available
  if (clientEnv.NEXT_PUBLIC_VERCEL_URL) {
    return `https://${clientEnv.NEXT_PUBLIC_VERCEL_URL.trim()}`;
  }

  // 4. Fallback to window.location.origin (local dev without env vars)
  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  // 5. Last resort: empty string (SSR without env vars — should not happen)
  return "";
}
