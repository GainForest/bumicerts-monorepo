/**
 * TapSync — main orchestration class.
 *
 * Ties together:
 *   - TapConsumer  (WebSocket connection to Tap)
 *   - EventHandler (batching, validation, DB writes)
 *   - Seed DID management (add GainForest org DIDs on startup)
 *
 * Usage:
 *   const tap = new TapSync();
 *   await tap.start();
 *   // ... later on shutdown:
 *   await tap.stop();
 */

import { EventHandler } from "./handler.ts";
import { TapConsumer } from "./consumer.ts";
import { listReposForPdsList } from "./pds.ts";
import { discoverDidsByCollections } from "./discovery.ts";
import { scoreAndLabelActivities } from "@/labeller/scoring-worker.ts";
import type { HandlerStats } from "./handler.ts";
import type { TapStatus } from "./consumer.ts";

// ============================================================
// TYPES
// ============================================================

export interface TapSyncStats extends HandlerStats {
  status: TapStatus;
}

// ============================================================
// TAPSYNC CLASS
// ============================================================

export class TapSync {
  private readonly consumer: TapConsumer;
  private readonly handler: EventHandler;
  private readonly seedDids: string[];
  private readonly seedPdss: string[];
  private readonly discoveryCollections: string[];
  private readonly enableDiscovery: boolean;
  private readonly discoveryRelayUrl: string;
  private readonly discoveryBatchSize: number;
  private readonly blockedDids: string[];

  constructor(options: {
    tapUrl?: string;
    adminPassword?: string;
    batchSize?: number;
    batchTimeoutMs?: number;
    validateRecords?: boolean;
    logValidationErrors?: boolean;
    validationLogFilter?: string[];
    seedDids?: string[];
    seedPdss?: string[];
    discoveryCollections?: string[];
    enableDiscovery?: boolean;
    discoveryRelayUrl?: string;
    discoveryBatchSize?: number;
    blockedDids?: string[];
  } = {}) {
    const tapUrl = options.tapUrl ?? process.env["TAP_URL"] ?? "http://localhost:2480";
    const adminPassword = options.adminPassword ?? process.env["TAP_ADMIN_PASSWORD"];

    this.seedDids =
      options.seedDids ??
      (process.env["SEED_DIDS"]?.split(",").map((s) => s.trim()).filter(Boolean) ?? []);

    this.seedPdss =
      options.seedPdss ??
      (process.env["SEED_PDSS"]?.split(",").map((s) => s.trim()).filter(Boolean) ?? []);

    this.discoveryCollections =
      options.discoveryCollections ??
      (process.env["DISCOVERY_COLLECTIONS"]?.split(",").map((s) => s.trim()).filter(Boolean) ?? [
        "app.certified.actor.profile",
        "app.gainforest.organization.info",
        "org.hypercerts.claim.activity",
      ]);

    this.enableDiscovery =
      options.enableDiscovery ?? (process.env["ENABLE_DISCOVERY"] !== "false");

    this.discoveryRelayUrl =
      options.discoveryRelayUrl ??
      process.env["DISCOVERY_RELAY_URL"] ??
      "https://bsky.network";

    this.discoveryBatchSize =
      options.discoveryBatchSize ??
      (parseInt(process.env["DISCOVERY_BATCH_SIZE"] ?? "", 10) || 500);

    this.blockedDids =
      options.blockedDids ??
      (process.env["BLOCKED_DIDS"]?.split(",").map((s) => s.trim()).filter(Boolean) ?? []);

    this.handler = new EventHandler({
      batchSize: options.batchSize ?? (parseInt(process.env["BATCH_SIZE"] ?? "", 10) || undefined),
      batchTimeoutMs: options.batchTimeoutMs ?? (parseInt(process.env["BATCH_TIMEOUT_MS"] ?? "", 10) || undefined),
      validateRecords: options.validateRecords ?? (process.env["VALIDATE_RECORDS"] !== "false"),
      logValidationErrors: options.logValidationErrors ?? (process.env["LOG_VALIDATION_ERRORS"] !== "false"),
      validationLogFilter: options.validationLogFilter ?? (process.env["LOG_VALIDATION_FILTER"]?.split(",").map((s) => s.trim()).filter(Boolean) ?? []),
      onActivityUpserted: (records) => {
        scoreAndLabelActivities(records).catch((err) =>
          console.error("[labeller] Scoring failed:", err),
        );
      },
    });

    this.consumer = new TapConsumer({
      tapUrl,
      adminPassword,
      handler: this.handler,
    });
  }

  // ============================================================
  // LIFECYCLE
  // ============================================================

  async start(): Promise<void> {
    console.log("\n=== GainForest Indexer — Tap Sync Starting ===\n");

    // Collect all seed DIDs from three sources:
    // 1. DISCOVERY_COLLECTIONS (network-wide discovery by lexicon)
    // 2. SEED_PDSS (crawl specific PDS hosts)
    // 3. SEED_DIDS (explicit manual list)
    const allSeedDids = new Set<string>(this.seedDids);

    // 1. Network-wide discovery by collection NSID
    if (this.enableDiscovery && this.discoveryCollections.length > 0) {
      console.log(
        `  Discovering DIDs for ${this.discoveryCollections.length} collection(s)...`
      );
      const discoveredDids = await discoverDidsByCollections(
        this.discoveryRelayUrl,
        this.discoveryCollections
      );
      discoveredDids.forEach((did) => allSeedDids.add(did));
      console.log(`  Discovery complete — ${discoveredDids.length} DIDs found.`);
    }

    // 2. PDS crawling
    if (this.seedPdss.length > 0) {
      console.log(`  Crawling ${this.seedPdss.length} PDS host(s)...`);
      const pdssDids = await listReposForPdsList(this.seedPdss);
      pdssDids.forEach((did) => allSeedDids.add(did));
      console.log(`  PDS crawl complete — ${pdssDids.length} DIDs found.`);
    }

    // 3. Remove blocked DIDs from Tap (handles the case where they were added in a previous run)
    if (this.blockedDids.length > 0) {
      console.log(`  Removing ${this.blockedDids.length} blocked DID(s) from Tap...`);
      await this.consumer.removeRepos(this.blockedDids);
      console.log(`  Blocked DIDs removed.`);
    }

    // 4. Filter out blocked DIDs before adding to Tap
    const blockedSet = new Set(this.blockedDids);
    const filteredDids = Array.from(allSeedDids).filter((did) => !blockedSet.has(did));

    const skipped = allSeedDids.size - filteredDids.length;
    if (skipped > 0) {
      console.log(`  Skipped ${skipped} blocked DID(s) from discovery results.`);
    }

    // 5. Add all non-blocked DIDs to Tap in batches
    if (filteredDids.length > 0) {
      const didsArray = filteredDids;
      console.log(
        `  Adding ${didsArray.length} total DID(s) to Tap in batches of ${this.discoveryBatchSize}...`
      );

      for (let i = 0; i < didsArray.length; i += this.discoveryBatchSize) {
        const batch = didsArray.slice(i, i + this.discoveryBatchSize);
        await this.consumer.addRepos(batch);

        const batchNum = Math.floor(i / this.discoveryBatchSize) + 1;
        const totalBatches = Math.ceil(didsArray.length / this.discoveryBatchSize);
        console.log(
          `    Batch ${batchNum}/${totalBatches}: Added ${batch.length} DIDs (${i + batch.length}/${didsArray.length})`
        );

        // Brief delay between batches to avoid overwhelming Tap
        if (i + this.discoveryBatchSize < didsArray.length) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
      console.log(`  Seeding complete.`);
    }

    // Verify Tap connection status before starting consumer
    await this.verifyTapConnection();

    console.log();

    // Start consuming events (blocks until channel is destroyed)
    await this.consumer.start();
  }

  /**
   * Verify Tap is connected to the relay and log cursor status.
   * Helps diagnose issues where Tap isn't receiving live events.
   */
  private async verifyTapConnection(): Promise<void> {
    const tapUrl = process.env["TAP_URL"] ?? "http://localhost:2480";
    const adminPassword = process.env["TAP_ADMIN_PASSWORD"];

    console.log("  Verifying Tap firehose connection...");

    try {
      const headers: Record<string, string> = {};
      if (adminPassword) {
        headers["Authorization"] = `Basic ${Buffer.from(`admin:${adminPassword}`).toString("base64")}`;
      }

      const [cursorsRes, repoCountRes] = await Promise.all([
        fetch(`${tapUrl}/stats/cursors`, { headers, signal: AbortSignal.timeout(5000) }),
        fetch(`${tapUrl}/stats/repo-count`, { headers, signal: AbortSignal.timeout(5000) }),
      ]);

      if (cursorsRes.ok) {
        const cursors = await cursorsRes.json();
        console.log(`  Tap cursors: firehose=${cursors.firehose ?? "none"}, listRepos=${cursors.listRepos ?? "none"}`);
      } else {
        console.warn(`  Could not fetch Tap cursors: ${cursorsRes.status}`);
      }

      if (repoCountRes.ok) {
        const repoCount = await repoCountRes.json();
        console.log(`  Tap is tracking ${repoCount.count ?? repoCount} repos`);
      }
    } catch (err) {
      console.warn("  Could not verify Tap connection:", err instanceof Error ? err.message : err);
    }
  }

  async stop(): Promise<void> {
    console.log("\n[tap] Stopping...");
    await this.consumer.stop();
    await this.handler.flush();
    console.log("[tap] Stopped cleanly.");
  }

  // ============================================================
  // REPO MANAGEMENT (exposed for GraphQL mutations or admin)
  // ============================================================

  async addRepos(dids: string[]): Promise<void> {
    await this.consumer.addRepos(dids);
  }

  async removeRepos(dids: string[]): Promise<void> {
    await this.consumer.removeRepos(dids);
  }

  // ============================================================
  // STATS
  // ============================================================

  getStats(): TapSyncStats {
    return {
      status: this.consumer.status,
      ...this.handler.stats,
    };
  }
}
