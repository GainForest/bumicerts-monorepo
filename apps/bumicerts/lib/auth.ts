/**
 * ATProto Authentication Setup
 *
 * Single-file auth configuration using @gainforest/atproto-auth-next.
 * Provides:
 * - OAuth route handlers (authorize, callback, logout, client-metadata, jwks, ePDS)
 * - Server actions (authorize, logout, checkSession, getProfile, checkSessionAndGetProfile)
 * - Session utilities (getSession, restoreSession, getAuthenticatedAgent)
 *
 * @example
 * ```ts
 * // In API routes:
 * import { auth } from "@/lib/auth";
 * export const { POST } = auth.handlers.authorize;
 *
 * // In server actions:
 * import { auth } from "@/lib/auth";
 * const session = await auth.actions.checkSession();
 *
 * // In server components:
 * import { auth } from "@/lib/auth";
 * const session = await auth.session.getSession();
 * ```
 */

import { createClient } from "@supabase/supabase-js";
import { createAuthSetup } from "@gainforest/atproto-auth-next";

// ─────────────────────────────────────────────────────────────────────────────
// Environment — validated at runtime, not at module load, so Next.js can
// collect page data without all env vars being present (e.g. in CI build).
// ─────────────────────────────────────────────────────────────────────────────

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const cookieSecret = process.env.COOKIE_SECRET ?? "";

// ATPROTO_JWK_PRIVATE is a JSON string; keep it as-is (may be "" at build time).
// createAuthSetup is called lazily below so JSON.parse only runs at request time.
const privateKeyJwk = process.env.ATPROTO_JWK_PRIVATE ?? "";

// ─────────────────────────────────────────────────────────────────────────────
// Supabase client (server-side with service role)
// ─────────────────────────────────────────────────────────────────────────────

const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseServiceKey || "placeholder"
);

// ─────────────────────────────────────────────────────────────────────────────
// Auth setup — lazy so JSON.parse(privateKeyJwk) only runs at request time
// ─────────────────────────────────────────────────────────────────────────────

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "";

let _auth: ReturnType<typeof createAuthSetup> | null = null;

function getAuth() {
  if (_auth) return _auth;
  _auth = createAuthSetup({
    privateKeyJwk,
    cookieSecret,
    supabase,
    appId: "bumicerts",
    clientName: "Bumicerts",
    cookieName: "bumicerts_session",
    defaultPdsDomain: process.env.NEXT_PUBLIC_DEFAULT_PDS_DOMAIN,
    epds: process.env.NEXT_PUBLIC_EPDS_URL
      ? { url: process.env.NEXT_PUBLIC_EPDS_URL }
      : undefined,
    onCallback: { redirectTo: "/" },
    logoUri: `${baseUrl}/assets/media/images/logo.png`,
    brandColor: "#2FCE8A",
    backgroundColor: "#FFFFFF",
    emailTemplateUri: `${baseUrl}/assets/email/otp-template.html`,
    emailSubjectTemplate: "{{code}} - Your {{app_name}} sign-in code",
    tosUri: `${baseUrl}/terms`,
    policyUri: `${baseUrl}/privacy`,
  });
  return _auth;
}

/**
 * The main auth instance for the bumicerts app.
 *
 * Contains everything needed for ATProto OAuth:
 * - `auth.handlers.*` — Route handlers for API routes
 * - `auth.actions.*` — Server actions for client components
 * - `auth.session.*` — Session utilities for server-side code
 */
export const auth = new Proxy({} as ReturnType<typeof createAuthSetup>, {
  get(_target, prop) {
    return (getAuth() as Record<string | symbol, unknown>)[prop];
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Re-export for convenience
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Default PDS domain used for handle normalization.
 * When set, "alice" becomes "alice.{defaultPdsDomain}".
 */
export const defaultPdsDomain = process.env.NEXT_PUBLIC_DEFAULT_PDS_DOMAIN;
