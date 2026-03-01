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
  } = {}) {
    const tapUrl = options.tapUrl ?? process.env["TAP_URL"] ?? "http://localhost:2480";
    const adminPassword = options.adminPassword ?? process.env["TAP_ADMIN_PASSWORD"];

    this.seedDids =
      options.seedDids ??
      (process.env["SEED_DIDS"]?.split(",").map((s) => s.trim()).filter(Boolean) ?? []);

    this.seedPdss =
      options.seedPdss ??
      (process.env["SEED_PDSS"]?.split(",").map((s) => s.trim()).filter(Boolean) ?? []);

    this.handler = new EventHandler({
      batchSize: options.batchSize ?? (parseInt(process.env["BATCH_SIZE"] ?? "", 10) || undefined),
      batchTimeoutMs: options.batchTimeoutMs ?? (parseInt(process.env["BATCH_TIMEOUT_MS"] ?? "", 10) || undefined),
      validateRecords: options.validateRecords ?? (process.env["VALIDATE_RECORDS"] !== "false"),
      logValidationErrors: options.logValidationErrors ?? (process.env["LOG_VALIDATION_ERRORS"] !== "false"),
      validationLogFilter: options.validationLogFilter ?? (process.env["LOG_VALIDATION_FILTER"]?.split(",").map((s) => s.trim()).filter(Boolean) ?? []),
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

    // Collect all seed DIDs: explicit SEED_DIDS + DIDs crawled from SEED_PDSS
    const allSeedDids = new Set<string>(this.seedDids);

    if (this.seedPdss.length > 0) {
      console.log(`  Crawling ${this.seedPdss.length} PDS host(s) for seed DIDs...`);
      const pdssDids = await listReposForPdsList(this.seedPdss);
      pdssDids.forEach((did) => allSeedDids.add(did));
      console.log(`  PDS crawl complete — ${pdssDids.length} DIDs found.`);
    }

    if (allSeedDids.size > 0) {
      console.log(`  Seeding ${allSeedDids.size} DID(s) into Tap...`);
      await this.consumer.addRepos(Array.from(allSeedDids));
      console.log(`  Seeding complete.`);
    }

    console.log();

    // Start consuming events (blocks until channel is destroyed)
    await this.consumer.start();
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
