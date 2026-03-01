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
// Environment validation
// ─────────────────────────────────────────────────────────────────────────────

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
}
if (!process.env.ATPROTO_JWK_PRIVATE) {
  throw new Error("ATPROTO_JWK_PRIVATE is not set");
}
if (!process.env.COOKIE_SECRET) {
  throw new Error("COOKIE_SECRET is not set");
}

// ─────────────────────────────────────────────────────────────────────────────
// Supabase client (server-side with service role)
// ─────────────────────────────────────────────────────────────────────────────

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ─────────────────────────────────────────────────────────────────────────────
// Auth setup
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolve base URL for asset paths.
 * Uses NEXT_PUBLIC_BASE_URL if set, otherwise falls back to empty string
 * (relative paths work for same-origin assets).
 */
const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "";

/**
 * The main auth instance for the bumicerts app.
 *
 * Contains everything needed for ATProto OAuth:
 * - `auth.handlers.*` — Route handlers for API routes
 * - `auth.actions.*` — Server actions for client components
 * - `auth.session.*` — Session utilities for server-side code
 */
export const auth = createAuthSetup({
  // Required
  privateKeyJwk: process.env.ATPROTO_JWK_PRIVATE,
  cookieSecret: process.env.COOKIE_SECRET,
  supabase,
  appId: "bumicerts",

  // App configuration
  clientName: "Bumicerts",
  cookieName: "bumicerts_session",

  // Handle normalization (e.g., "alice" -> "alice.climateai.org")
  defaultPdsDomain: process.env.NEXT_PUBLIC_DEFAULT_PDS_DOMAIN,

  // ePDS (email-based authentication) — optional
  epds: process.env.NEXT_PUBLIC_EPDS_URL
    ? { url: process.env.NEXT_PUBLIC_EPDS_URL }
    : undefined,

  // Redirect after successful auth
  onCallback: { redirectTo: "/" },

  // Branding for OAuth consent screens
  logoUri: `${baseUrl}/assets/media/images/logo.png`,
  brandColor: "#2FCE8A",
  backgroundColor: "#FFFFFF",
  emailTemplateUri: `${baseUrl}/assets/email/otp-template.html`,
  emailSubjectTemplate: "{{code}} - Your {{app_name}} sign-in code",
  tosUri: `${baseUrl}/terms`,
  policyUri: `${baseUrl}/privacy`,
});

// ─────────────────────────────────────────────────────────────────────────────
// Re-export for convenience
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Default PDS domain used for handle normalization.
 * When set, "alice" becomes "alice.{defaultPdsDomain}".
 */
export const defaultPdsDomain = process.env.NEXT_PUBLIC_DEFAULT_PDS_DOMAIN;
