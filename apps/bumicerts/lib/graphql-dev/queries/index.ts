/**
 * `queries` — the central tRPC-like registry for all data fetching.
 *
 * Every leaf exposes:
 *   .fetch(params)               plain async fn — safe in server components
 *   .useQuery(params, options?)  React Query hook with auto-derived key
 *   .key(params?)                queryKey for precise or namespace invalidation
 *
 * Namespace keys (for broad invalidation):
 *   queries.organization.key()   → ["organization"]
 *   queries.activities.key()     → ["activities"]
 *   queries.locations.key()      → ["locations"]
 *   queries.actor.key()          → ["actor"]
 *
 * Usage examples:
 *   // Client component
 *   const { data } = queries.organization.logo.useQuery({ did });
 *   const { data } = queries.activities.useQuery({ did });
 *   const { data } = queries.activities.useQuery({ limit: 100, labelTier: "high-quality" });
 *
 *   // Server component / route handler
 *   const result = await queries.organization.fetch({ did });
 *   const logo   = await queries.organization.logo.fetch({ did });
 *
 *   // Invalidation after mutation
 *   queryClient.invalidateQueries({ queryKey: queries.organization.logo.key({ did }) });
 *   queryClient.invalidateQueries({ queryKey: queries.organization.key() });
 */

import { createQuery } from "../create-query";
import * as organization from "./organization";
import * as organizationLogo from "./organization/logo";
import * as activities from "./activities";
import * as locations from "./locations";
import * as audio from "./audio";
import * as actor from "./actor";
import * as fundingReceipts from "./fundingReceipts";
import * as leaderboard from "./leaderboard";
import * as linkEvm from "./linkEvm";
import * as cartBumicert from "./cartBumicert";
import * as attachments from "./attachments";
import * as occurrences from "./occurrences";
import * as multimedia from "./multimedia";

export const queries = {
  organization: {
    ...createQuery(["organization"], organization),
    logo: createQuery(["organization", "logo"], organizationLogo),
    /** Invalidates ALL organization queries (info + logo). */
    key: () => ["organization"] as const,
  },

  activities: {
    ...createQuery(["activities"], activities),
    /** Invalidates ALL activity queries. */
    key: () => ["activities"] as const,
  },

  locations: {
    ...createQuery(["locations"], locations),
    /** Invalidates ALL location queries. */
    key: () => ["locations"] as const,
  },

  audio: {
    ...createQuery(["audio"], audio),
    /** Invalidates ALL audio recording queries. */
    key: () => ["audio"] as const,
  },

  multimedia: {
    ...createQuery(["multimedia"], multimedia),
    /** Invalidates ALL multimedia queries. */
    key: () => ["multimedia"] as const,
  },

  actor: {
    ...createQuery(["actor"], actor),
    /** Invalidates ALL actor profile queries. */
    key: () => ["actor"] as const,
  },

  fundingReceipts: {
    ...createQuery(["fundingReceipts"], fundingReceipts),
    /** Invalidates ALL funding receipt queries. */
    key: () => ["fundingReceipts"] as const,
  },

  leaderboard: {
    ...createQuery(["leaderboard"], leaderboard),
    /** Invalidates ALL leaderboard queries. */
    key: () => ["leaderboard"] as const,
  },

  linkEvm: createQuery(["linkEvm"], linkEvm),

  /** Single bumicert card data for the cart modal. Keyed by bumicert ID ("{did}-{rkey}"). */
  cartBumicert: createQuery(["cartBumicert"], cartBumicert),

  /**
   * Evidence attachments for a bumicert — fetches all context.attachment records
   * authored by a DID. Filter by activityUri client-side to scope to one bumicert.
   */
  attachments: {
    ...createQuery(["attachments"], attachments),
    /** Invalidates ALL attachment queries. */
    key: () => ["attachments"] as const,
  },

  /**
   * DWC occurrence records authored by a DID.
   * Used in the evidence picker to link tree/species records as evidence.
   */
  occurrences: {
    ...createQuery(["occurrences"], occurrences),
    /** Invalidates ALL occurrence queries. */
    key: () => ["occurrences"] as const,
  },
};

// Re-export types that consumers commonly need
export type { OrgInfo, OrgActivity, SingleParams as OrgSingleParams, ListParams as OrgListParams } from "./organization";
export type { Activity, ActivityOrgInfo, ByDidParams as ActivityByDidParams, ByDidAndOrgParams as ActivityByDidAndOrgParams, ListParams as ActivityListParams } from "./activities";
export type { CertifiedLocation } from "./locations";
export type { AudioRecordingItem } from "./audio";
export type { ActorProfile } from "./actor";
export type { FundingReceiptItem } from "./fundingReceipts";
export type { LeaderboardEntry, LeaderboardResult, Period as LeaderboardPeriod } from "./leaderboard";
export type { EvmLink } from "./linkEvm";
export type { CartBumicertItem } from "./cartBumicert";
export type { AttachmentItem } from "./attachments";
export type { OccurrenceItem } from "./occurrences";
export type { MultimediaItem } from "./multimedia";
