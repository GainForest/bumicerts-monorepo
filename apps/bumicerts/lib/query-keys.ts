/**
 * Centralised React Query key factory.
 *
 * Rules:
 *  - Every key is a function so call-sites never build arrays by hand.
 *  - Hierarchical structure: broader keys are prefixes of narrower ones, so
 *    invalidating a parent automatically covers all children.
 *  - `all` on each namespace lets you wipe the whole entity in one call.
 *
 * Usage:
 *   queryKey: queryKeys.org.logo(did)
 *   queryClient.invalidateQueries({ queryKey: queryKeys.org.all() })
 */

export const queryKeys = {
  /** Organisation profile & logo queries */
  org: {
    all: () => ["org"] as const,
    info: (did: string | undefined) => ["org", "info", did] as const,
    logo: (did: string | undefined) => ["org", "logo", did] as const,
  },

  /** Certified location / site queries */
  locations: {
    all: () => ["locations"] as const,
    byDid: (did: string | undefined) => ["locations", did] as const,
    preview: (url: string | null | undefined) => ["locations", "preview", url] as const,
  },

  /** Draft bumicert queries */
  drafts: {
    all: () => ["drafts"] as const,
    byDid: (did: string | undefined) => ["drafts", did] as const,
  },

  /** Published bumicert (claim.activity) queries */
  activities: {
    all: () => ["activities"] as const,
    byDid: (did: string | undefined) => ["activities", did] as const,
    explore: () => ["activities", "explore"] as const,
  },

  /** ATProto actor / profile lookups */
  actor: {
    profile: (handle: string | undefined) => ["actor", "profile", handle] as const,
  },

  /** Handle availability check (onboarding) */
  handle: {
    availability: (handle: string | undefined) => ["handle", "availability", handle] as const,
  },

  /** Blob URL fetching */
  blob: (ref: unknown) => ["blob", ref] as const,

  /** Adaptive colour palette derived from an image */
  adaptiveColors: (src: string | null | undefined) => ["adaptive-colors", src] as const,
} as const;
