/**
 * Hyperlabel labeller client.
 *
 * Fetches quality labels for org.hypercerts.claim.activity records from the
 * Hyperlabel AT Protocol labeller (einstein.climateai.org).
 *
 * Labels are stored in the local `labels` table so they can be attached to
 * activity records in GraphQL responses without blocking the query.
 *
 * The public AT Protocol label endpoint is:
 *   GET /xrpc/com.atproto.label.queryLabels
 *     ?uriPatterns=<did>&sources=<labeller-did>
 *
 * Label values (tiers):
 *   "high-quality"  → score 75–100
 *   "standard"      → score 50–74
 *   "draft"         → score 20–49
 *   "likely-test"   → score 0–19 or test signals
 */

import { upsertLabels } from "@/db/queries.ts";
import type { LabelInsert } from "@/db/types.ts";

// ---------------------------------------------------------------
// Config — read from env, fall back to known defaults
// ---------------------------------------------------------------

export const HYPERLABEL_URL =
  process.env.HYPERLABEL_URL ?? "https://hyperlabel-production.up.railway.app";

export const HYPERLABEL_DID =
  process.env.HYPERLABEL_DID ?? "did:plc:5rw6of6lry7ihmyhm323ycwn";

/** All valid label tier values issued by Hyperlabel. */
export const LABEL_TIERS = [
  "high-quality",
  "standard",
  "draft",
  "likely-test",
] as const;

export type LabelTier = (typeof LABEL_TIERS)[number];

// ---------------------------------------------------------------
// AT Protocol queryLabels response shape
// ---------------------------------------------------------------

interface AtLabel {
  /** Labeller DID (src) */
  src: string;
  /** Subject URI — for DID-level labels this is just the DID */
  uri: string;
  /** Label value, e.g. "high-quality" */
  val: string;
  /** ISO timestamp when the label was created */
  cts?: string;
  /** When the label was negated (if set, label is no longer active) */
  exp?: string;
  /** True means this label negates a previous one */
  neg?: boolean;
}

interface QueryLabelsResponse {
  labels: AtLabel[];
  cursor?: string;
}

// ---------------------------------------------------------------
// Max DIDs per request — the queryLabels endpoint accepts many
// uriPatterns params but we batch to stay safe.
// ---------------------------------------------------------------

const BATCH_SIZE = 25;

/**
 * Fetch active (non-negated) labels for the given DIDs from Hyperlabel.
 * Returns only labels whose `src` matches HYPERLABEL_DID.
 *
 * The AT Protocol queryLabels endpoint accepts multiple `uriPatterns`
 * query params. We pass each DID directly (exact match, no wildcard)
 * alongside `sources` to restrict to our labeller.
 *
 * Returns a flat array of { did, value, labeledAt } objects.
 */
export async function fetchLabelsForDids(
  dids: string[],
): Promise<{ did: string; value: string; labeledAt: Date | null }[]> {
  if (dids.length === 0) return [];

  const results: { did: string; value: string; labeledAt: Date | null }[] = [];

  // Process in batches to avoid overly-long URLs
  for (let i = 0; i < dids.length; i += BATCH_SIZE) {
    const batch = dids.slice(i, i + BATCH_SIZE);

    // Build query string with one uriPatterns param per DID + sources filter
    const params = new URLSearchParams();
    for (const did of batch) params.append("uriPatterns", did);
    params.append("sources", HYPERLABEL_DID);

    const url = `${HYPERLABEL_URL}/xrpc/com.atproto.label.queryLabels?${params.toString()}`;

    let res: Response;
    try {
      res = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(8000),
      });
    } catch (err) {
      console.warn(
        `[hyperlabel] Failed to reach labeller API (${(err as Error).message}) — skipping batch`,
      );
      continue;
    }

    if (!res.ok) {
      console.warn(
        `[hyperlabel] queryLabels returned HTTP ${res.status} — skipping batch`,
      );
      continue;
    }

    let body: QueryLabelsResponse;
    try {
      body = (await res.json()) as QueryLabelsResponse;
    } catch {
      console.warn("[hyperlabel] Invalid JSON from queryLabels — skipping batch");
      continue;
    }

    for (const label of body.labels ?? []) {
      // Skip negation labels and labels from other sources
      if (label.neg) continue;
      if (label.src !== HYPERLABEL_DID) continue;
      // Skip expired labels
      if (label.exp && new Date(label.exp) < new Date()) continue;

      results.push({
        did: label.uri,
        value: label.val,
        labeledAt: label.cts ? new Date(label.cts) : null,
      });
    }
  }

  return results;
}

/**
 * Fire-and-forget: fetch labels for the given DIDs and persist them to the DB.
 *
 * This is called AFTER returning query results to the GraphQL caller so it
 * never adds latency. Errors are logged but never thrown.
 */
export function refreshLabelsAsync(dids: string[]): void {
  if (dids.length === 0) return;

  // Kick off asynchronously — do not await
  (async () => {
    try {
      const fetched = await fetchLabelsForDids(dids);
      if (fetched.length === 0) return;

      const inserts: LabelInsert[] = fetched.map((l) => ({
        subject_did: l.did,
        source_did: HYPERLABEL_DID,
        label_value: l.value,
        labeled_at: l.labeledAt,
      }));

      await upsertLabels(inserts);
    } catch (err) {
      // Never let background errors surface to the caller
      console.warn(
        `[hyperlabel] Background label refresh failed: ${(err as Error).message}`,
      );
    }
  })();
}
