/**
 * Canonical data shapes used throughout bumicerts-2 UI.
 *
 * These are serialization-safe (no Date objects, no class instances)
 * so they travel cleanly from server components → client components
 * via JSON serialization.
 */

// ── Bumicert ────────────────────────────────────────────────────────────────

export type BumicertContributor = {
  /** Raw identity string — DID or free-text name */
  identity: string;
};

export type BumicertData = {
  /** "{did}-{rkey}" — used as the route param */
  id: string;
  /** Organisation DID that owns this bumicert */
  organizationDid: string;
  /** ATProto record key */
  rkey: string;

  title: string;
  shortDescription: string;
  description: string;

  /** Resolved blob URL or null */
  coverImageUrl: string | null;
  /** Resolved logo URL for the owning org or null */
  logoUrl: string | null;
  /** Organisation display name */
  organizationName: string;

  /** ISO 3166-1 alpha-2 */
  country: string;
  /** Free-form objective strings */
  objectives: string[];

  /** Contributors extracted from the activity record */
  contributors: BumicertContributor[];

  startDate: string | null;
  endDate: string | null;
  createdAt: string;
};

// ── Funding Config ────────────────────────────────────────────────────────────

/**
 * Serialisation-safe shape of a BumicertsFundingConfigRecord.
 * Mirrors the indexer's `BumicertsFundingConfigRecord` GraphQL type
 * and can be passed server → client without JSON issues.
 */
export type FundingConfigData = {
  /**
   * The receiving wallet — either an EvmLinkRef { $type, uri } or null.
   * Stored as `unknown` since the lexicon uses an open union.
   */
  receivingWallet: { uri: string } | null;
  status: "open" | "coming-soon" | "paused" | "closed" | null;
  goalInUSD: string | null;
  minDonationInUSD: string | null;
  maxDonationInUSD: string | null;
  allowOversell: boolean | null;
  createdAt: string | null;
  updatedAt: string | null;
};

// ── Organization ─────────────────────────────────────────────────────────────

export type OrganizationData = {
  did: string;
  displayName: string;
  shortDescription: string;
  longDescription: string;

  logoUrl: string | null;
  coverImageUrl: string | null;

  objectives: string[];
  /** ISO 3166-1 alpha-2 */
  country: string;
  website: string | null;
  startDate: string | null;
  visibility: "Public" | "Unlisted";
  createdAt: string;

  bumicertCount: number;
};
