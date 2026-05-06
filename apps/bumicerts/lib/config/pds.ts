/**
 * PDS Configuration
 *
 * Two separate concerns:
 *
 * 1. SIGN-UP domains  — PDSes we control; we can mint invite codes for these.
 *    - Production:        gainforest.id
 *    - Non-prod (dev/staging/preview): gainforest.id, climateai.org
 *
 * 2. SIGN-IN domains  — dropdown options shown in the login modal.
 *    Users may authenticate from any ATProto PDS; we show the most common ones
 *    and also allow a custom "type your own" entry.
 *    - Production:        gainforest.id, certified.app, bsky.social
 *    - Non-prod:          same + climateai.org (for internal testing accounts)
 *
 * Rule: "climateai.org" is NEVER shown to production users in any dropdown.
 * However it is a valid PDS domain and will work fine if a user types it.
 */

import { clientEnv as env } from "@/lib/env/client";

const isProduction = env.NEXT_PUBLIC_VERCEL_ENV === "production";

// ─── Sign-up (invite-code PDSes we own) ──────────────────────────────────────

const PRODUCTION_SIGNUP_DOMAINS = ["gainforest.id"] as const;
const DEV_SIGNUP_DOMAINS = ["climateai.org"] as const;

export const signupPDSDomains = isProduction
  ? PRODUCTION_SIGNUP_DOMAINS
  : DEV_SIGNUP_DOMAINS;

export type SignupPDSDomain = (typeof signupPDSDomains)[number];

/** The PDS we create new accounts on by default (always gainforest.id). */
export const defaultSignupPdsDomain: string = signupPDSDomains[0];

// ─── Sign-in (dropdown options shown in the login modal) ─────────────────────

const COMMON_LOGIN_DOMAINS = [
  "gainforest.id",
  "certified.app",
  "bsky.social",
] as const;

const DEV_LOGIN_DOMAINS = [
  "gainforest.id",
  "climateai.org",
  "certified.app",
  "bsky.social",
] as const;

export const loginPDSDomains = isProduction
  ? COMMON_LOGIN_DOMAINS
  : DEV_LOGIN_DOMAINS;

export type LoginPDSDomain = (typeof loginPDSDomains)[number];

// ─── Deprecated shims (kept so existing imports don't break immediately) ──────

/**
 * @deprecated Use `signupPDSDomains` for sign-up, or `loginPDSDomains` for
 * the sign-in dropdown. Will be removed once all callsites are migrated.
 */
export const allowedPDSDomains = signupPDSDomains;

/** @deprecated Use `SignupPDSDomain` instead. */
export type AllowedPDSDomain = SignupPDSDomain;

/** @deprecated Use `defaultSignupPdsDomain` instead. */
export const defaultPdsDomain: string = defaultSignupPdsDomain;

// ─── Utility ──────────────────────────────────────────────────────────────────

/** Returns true when running in a non-production environment. */
export const isDevEnvironment = !isProduction;

/**
 * Validates a custom PDS domain string entered by the user.
 * Must be of the form `something.tld` — at least one dot, no spaces,
 * only valid hostname characters.
 */
export function isValidPdsDomain(domain: string): boolean {
  return /^[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)+$/.test(domain.trim());
}
