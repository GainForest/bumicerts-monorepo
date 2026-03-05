/**
 * Query key factories for non-GraphQL queries.
 *
 * GraphQL query keys are auto-derived by the `queries.*` registry
 * (see lib/graphql/queries/index.ts) and do not belong here.
 *
 * Only REST / Supabase fetch-based queries live here.
 */

export const queryKeys = {
  /** Bumicert drafts stored in Supabase, fetched via the Next.js API route. */
  drafts: {
    all: () => ["drafts"] as const,
    byDid: (did: string | undefined) => ["drafts", did] as const,
  },

  /** ATProto handle availability check (onboarding). */
  handle: {
    availability: (handle: string | undefined) => ["handle", "availability", handle] as const,
  },

  /** Location preview URL fetch (Step3 sub-query inside SiteItem). */
  locationPreview: (url: string | null | undefined) => ["location-preview", url] as const,
} as const;
