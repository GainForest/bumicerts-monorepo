/**
 * Automatic backfill — scores existing activity records that don't yet have a label.
 *
 * Runs on server startup, non-blocking, throttled to avoid choking the server.
 * Processes in batches of 50 with 100ms delay between batches.
 * Idempotent (upsert) — safe to run on every restart, skips already-labeled records.
 */

import { scoreActivity } from "./scorer.ts";
import { extractDescriptionText } from "./lexicon-utils.ts";
import { enqueueClassification } from "./classifier.ts";
import { LOCAL_LABELLER_SOURCE } from "./index.ts";
import {
  getUnlabelledActivities,
  countActivityRecords,
  upsertActivityLabel,
} from "@/db/queries.ts";
import type { ActivityRecord } from "./types.ts";

const BATCH_SIZE = 50;
const BATCH_DELAY_MS = 100;
const LOG_INTERVAL = 500; // Log progress every N records

export async function backfillActivityLabels(): Promise<void> {
  const totalActivities = await countActivityRecords();
  if (totalActivities === 0) {
    console.log("[labeller] Backfill: no activity records to score");
    return;
  }

  console.log(
    `[labeller] Backfill: checking ${totalActivities} activity records for missing labels...`,
  );

  let scored = 0;
  let failed = 0;
  const tierCounts: Record<string, number> = {};

  while (true) {
    const batch = await getUnlabelledActivities(
      LOCAL_LABELLER_SOURCE,
      BATCH_SIZE,
      0, // Always offset 0 since we're labelling as we go — the LEFT JOIN filters out labelled ones
    );

    if (batch.length === 0) break;

    for (const row of batch) {
      try {
        const result = scoreActivity(row.record as unknown as ActivityRecord);

        await upsertActivityLabel({
          subject_did: row.did,
          subject_uri: row.uri,
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
          const rec = row.record as Record<string, unknown>;
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
          const text = parts.join("\n\n");
          if (text) enqueueClassification(text, row.did, row.rkey);
        }
      } catch (err) {
        failed++;
        if (process.env.LOG_LEVEL === "debug") {
          console.warn(
            `[labeller] Backfill: failed to score ${row.uri}:`,
            err instanceof Error ? err.message : err,
          );
        }
      }
    }

    // Log progress periodically
    const totalProcessed = scored + failed;
    if (totalProcessed % LOG_INTERVAL < BATCH_SIZE) {
      console.log(
        `[labeller] Backfill progress: ${scored} scored, ${failed} failed`,
      );
    }

    // Throttle to avoid choking the server
    await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
  }

  // Final summary
  const tierSummary = Object.entries(tierCounts)
    .map(([tier, count]) => `${tier}: ${count}`)
    .join(", ");
  console.log(
    `[labeller] Backfill complete: ${scored} scored (${tierSummary}), ${failed} failed`,
  );
}
