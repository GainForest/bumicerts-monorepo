/**
 * HuggingFace zero-shot classifier for activity records.
 *
 * Optional — gracefully disabled when HF_TOKEN is not set.
 * Classifies activity text against candidate labels to detect
 * test/spam/junk content that the deterministic scorer missed.
 */

import { tierForScore } from "./scorer.ts";
import {
  getLabelByDidSource,
  updateHfClassification,
} from "@/db/queries.ts";
import { LOCAL_LABELLER_SOURCE } from "./index.ts";

export interface ContentClassification {
  label: string;
  score: number;
  allScores: Record<string, number>;
}

const CANDIDATE_LABELS = [
  "meaningful project description",
  "test or placeholder data",
  "song lyrics or copypasta",
  "spam or gibberish",
];

const HF_MODEL = process.env.HF_MODEL ?? "facebook/bart-large-mnli";
const DELAY_MS = 2000; // 2s between calls to avoid rate limits

interface QueueItem {
  text: string;
  did: string;
  rkey: string;
}

const queue: QueueItem[] = [];
let processing = false;

export function enqueueClassification(
  text: string,
  did: string,
  rkey: string,
): void {
  queue.push({ text, did, rkey });
  if (!processing) processQueue();
}

export function getQueueLength(): number {
  return queue.length;
}

async function processQueue(): Promise<void> {
  processing = true;
  let processed = 0;
  let skipped = 0;
  let failed = 0;

  while (queue.length > 0) {
    const item = queue.shift()!;
    try {
      const classification = await classifyContent(item.text);
      if (classification) {
        await reclassifyWithHfSignal(item.did, item.rkey, classification);
        processed++;
      } else {
        skipped++;
      }
    } catch (err) {
      failed++;
      if (process.env.LOG_LEVEL === "debug") {
        console.warn(
          "[hf-classifier] queue item failed:",
          err instanceof Error ? err.message : err,
        );
      }
    }
    // Wait between calls to avoid rate limiting
    if (queue.length > 0) {
      await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
    }
  }

  if (processed > 0 || failed > 0) {
    console.log(
      `[hf-classifier] Queue complete: ${processed} classified, ${skipped} skipped, ${failed} failed`,
    );
  }
  processing = false;
}

async function reclassifyWithHfSignal(
  did: string,
  _rkey: string,
  classification: ContentClassification,
): Promise<void> {
  const row = await getLabelByDidSource(did, LOCAL_LABELLER_SOURCE);
  if (!row) return;

  let existingSignals: string[] = [];
  try {
    existingSignals = (row.test_signals as string[]) ?? [];
  } catch {
    existingSignals = [];
  }

  const label = classification.label;
  const scorePct = (classification.score * 100).toFixed(0);
  const updatedSignals = [
    ...existingSignals,
    `hf-flagged: ${label} (${scorePct}%)`,
  ];
  const newTier = tierForScore(row.score ?? 0, updatedSignals);

  await updateHfClassification(
    did,
    LOCAL_LABELLER_SOURCE,
    classification.label,
    classification.score,
    newTier,
    updatedSignals,
  );
}

// Lazy-init HfInference to avoid import error when @huggingface/inference isn't installed
let hf: unknown = null;
let _noTokenLogged = false;
let _noPackageLogged = false;

function getHfToken(): string {
  return process.env.HF_TOKEN ?? "";
}

async function getHfInstance(): Promise<unknown> {
  if (!hf) {
    try {
      const { HfInference } = await import("@huggingface/inference");
      hf = new HfInference(getHfToken());
    } catch {
      if (!_noPackageLogged) {
        console.log(
          "[hf-classifier] @huggingface/inference not installed — classification disabled",
        );
        _noPackageLogged = true;
      }
      return null;
    }
  }
  return hf;
}

async function classifyContent(
  text: string,
): Promise<ContentClassification | null> {
  if (!getHfToken()) {
    if (!_noTokenLogged) {
      console.log("[hf-classifier] HF_TOKEN not set — classification disabled");
      _noTokenLogged = true;
    }
    return null;
  }
  if (!text.trim()) return null;

  const instance = await getHfInstance();
  if (!instance) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    const results = await (
      instance as {
        zeroShotClassification: (
          args: {
            model: string;
            inputs: string;
            parameters: { candidate_labels: string[] };
          },
          options: { signal: AbortSignal },
        ) => Promise<Array<{ label: string; score: number }>>;
      }
    ).zeroShotClassification(
      {
        model: HF_MODEL,
        inputs: text,
        parameters: { candidate_labels: CANDIDATE_LABELS },
      },
      { signal: controller.signal },
    );

    const allScores: Record<string, number> = {};
    for (const item of results) {
      allScores[item.label] = item.score;
    }

    const winner = results[0];
    if (!winner) return null;
    return {
      label: winner.label,
      score: winner.score,
      allScores,
    };
  } catch (err) {
    if (process.env.LOG_LEVEL === "debug") {
      console.warn(
        "[hf-classifier] classification failed:",
        err instanceof Error ? err.message : err,
      );
    }
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export function isLowQualityContent(
  classification: ContentClassification,
): boolean {
  return classification.label !== "meaningful project description";
}
