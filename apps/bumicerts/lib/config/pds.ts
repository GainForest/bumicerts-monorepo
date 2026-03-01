/**
 * PDS Configuration
 *
 * Defines the allowed PDS domains for this app.
 * Used for handle normalization and API routing.
 */

/**
 * Supported PDS domains based on environment.
 * - Production: gainforest.id
 * - Development/Preview: climateai.org
 */
const PRODUCTION_DOMAINS = ["gainforest.id"] as const;
const DEV_DOMAINS = ["climateai.org"] as const;

export const allowedPDSDomains =
  process.env.NEXT_PUBLIC_VERCEL_ENV === "production"
    ? PRODUCTION_DOMAINS
    : DEV_DOMAINS;

export type AllowedPDSDomain = (typeof allowedPDSDomains)[number];

/**
 * The default PDS domain (first entry in allowedPDSDomains).
 * Used for handle normalization when user enters just a username.
 */
export const defaultPdsDomain = allowedPDSDomains[0] as AllowedPDSDomain;

/**
 * Get the PDS service URL for a given domain.
 */
export function getPdsServiceUrl(domain: AllowedPDSDomain): string {
  return `https://${domain}`;
}
