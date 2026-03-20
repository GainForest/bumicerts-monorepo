// Activity record — re-exported from indexer's generated lexicon types
export type { Main as ActivityRecord } from "@/generated/org/hypercerts/claim/activity.defs.ts";
export type { Contributor as ActivityContributor } from "@/generated/org/hypercerts/claim/activity.defs.ts";

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
