export type ActivityContributor = {
  contributionWeight?: string | null;
  contributionDetails?: unknown | null;
};

export type ActivityRecord = {
  $type?: string;
  title?: string | null;
  shortDescription?: string | null;
  shortDescriptionFacets?: unknown;
  description?: unknown;
  image?: unknown;
  workScope?: unknown;
  contributors?: Array<ActivityContributor | null> | null;
  locations?: Array<{ uri?: string | null; cid?: string | null } | null> | null;
  startDate?: string | null;
  endDate?: string | null;
  rights?: unknown;
  createdAt?: string | null;
};

// Scoring
export type LabelTier =
  | "pending"
  | "high-quality"
  | "standard"
  | "draft"
  | "likely-test";

export interface ScoreResult {
  totalScore: number; // 0-100 normalized
  tier: LabelTier;
  breakdown: ScoreBreakdown;
  testSignals: string[]; // reasons flagged as test data
}

export interface ScoreBreakdown {
  titleQuality: number; // 0-15
  shortDescQuality: number; // 0-15
  descriptionQuality: number; // 0-20
  hasImage: number; // 0-10
  hasWorkScope: number; // 0-10
  contributorQuality: number; // 0-15
  hasLocations: number; // 0-5
  hasDateRange: number; // 0-5
  hasRights: number; // 0-5
  repetitionFlags: number; // 0 = clean, negative penalty (-5 per signal, min -15)
}

export interface LabelDefinition {
  identifier: string;
  locales: Array<{ lang: string; name: string; description: string }>;
}
