/**
 * Scoring worker — receives batches of activity records from the TAP handler,
 * scores each one, upserts labels to PostgreSQL, and optionally enqueues
 * for HuggingFace classification.
 *
 * Logs a batch summary instead of per-record output.
 */

import { scoreActivity } from "./scorer.ts";
import { extractDescriptionText } from "./lexicon-utils.ts";
import { enqueueClassification } from "./classifier.ts";
import { LOCAL_LABELLER_SOURCE } from "./index.ts";
import { upsertActivityLabel } from "@/db/queries.ts";
import type { RecordInsert } from "@/db/types.ts";
import type { ActivityRecord } from "./types.ts";

export async function scoreAndLabelActivities(
  records: RecordInsert[],
): Promise<void> {
  const tierCounts: Record<string, number> = {};
  let scored = 0;
  let failed = 0;

  for (const rec of records) {
    try {
      const result = scoreActivity(rec.record as unknown as ActivityRecord);

      await upsertActivityLabel({
        subject_did: rec.did,
        subject_uri: rec.uri,
        source_did: LOCAL_LABELLER_SOURCE,
        label_value: result.tier,
        score: result.totalScore,
        breakdown: result.breakdown,
        test_signals: result.testSignals,
      });

      tierCounts[result.tier] = (tierCounts[result.tier] ?? 0) + 1;
      scored++;

      // Enqueue for HF classification if not obviously test data
      if (result.totalScore > 19) {
        const text = buildClassificationText(rec.record);
        if (text) {
          enqueueClassification(text, rec.did, rec.rkey);
        }
      }
    } catch (err) {
      failed++;
      if (process.env.LOG_LEVEL === "debug") {
        console.warn(
          `[labeller] Failed to score ${rec.uri}:`,
          err instanceof Error ? err.message : err,
        );
      }
    }
  }

  // Log batch summary
  if (scored > 0 || failed > 0) {
    const tierSummary = Object.entries(tierCounts)
      .map(([tier, count]) => `${tier}: ${count}`)
      .join(", ");
    console.log(
      `[labeller] Scored ${scored} activities (${tierSummary})${failed > 0 ? `, ${failed} failed` : ""}`,
    );
  }
}

/**
 * Build a combined text string for HF classification from an activity record.
 */
function buildClassificationText(record: unknown): string {
  const rec = record as Record<string, unknown>;
  const parts: string[] = [];

  const title = rec.title;
  if (typeof title === "string" && title.trim()) parts.push(title.trim());

  const shortDesc = rec.shortDescription;
  if (typeof shortDesc === "string" && shortDesc.trim())
    parts.push(shortDesc.trim());

  const desc = extractDescriptionText(
    rec.description as Parameters<typeof extractDescriptionText>[0],
  );
  if (desc.trim()) parts.push(desc.trim());

  return parts.join("\n\n");
}
