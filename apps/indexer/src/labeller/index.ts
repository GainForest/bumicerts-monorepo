/**
 * Local labeller module.
 *
 * Scores org.hypercerts.claim.activity records on 9 quality criteria
 * and labels them into tiers (high-quality, standard, draft, likely-test).
 *
 * Ported from the standalone hyperlabel service to run inline within the indexer.
 */

export {
  scoreActivity,
  tierForScore,
  labelIdentifierForTier,
} from "./scorer.ts";
export { extractDescriptionText } from "./lexicon-utils.ts";
export { enqueueClassification, isLowQualityContent } from "./classifier.ts";
export type {
  ScoreResult,
  ScoreBreakdown,
  LabelTier,
  ActivityRecord,
} from "./types.ts";
export {
  SCORE_THRESHOLDS,
  TEST_PATTERNS,
  LABELS,
  QUALITY_LABEL_IDENTIFIERS,
} from "./constants.ts";

/**
 * Source DID used for locally-generated labels.
 * This replaces the external Hyperlabel labeller DID.
 */
export const LOCAL_LABELLER_SOURCE = "local";
