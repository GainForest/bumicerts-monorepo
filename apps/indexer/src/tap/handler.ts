/**
 * Tap event handler.
 *
 * Simplified from the Jetstream handler:
 *   - No cursor management (Tap handles this internally)
 *   - Same batching logic for DB writes
 *   - Same validation logic
 *
 * Responsibilities:
 *   1. Filter events to only indexed collections
 *   2. Optionally validate records with @atproto/lex generated schemas
 *   3. Buffer creates/updates/deletes in memory
 *   4. Flush the buffer to PostgreSQL in batches (by count or timeout)
 *   5. Handle account deactivations/deletions
 */

import type { RecordEvent, IdentityEvent } from "@atproto/tap";
import { isIndexedCollection } from "./collections.ts";
import { upsertRecords, deleteRecords, deleteRecordsByDid } from "@/db/queries.ts";
import type { RecordInsert } from "@/db/types.ts";
import { validateRecord } from "./validation.ts";
import { normalizeBlobsInRecord, prepareBlobsForValidation } from "./blobs.ts";

// ============================================================
// INTERNAL TYPES
// ============================================================

interface PendingUpsert {
  kind: "upsert";
  record: RecordInsert;
}

interface PendingDelete {
  kind: "delete";
  uri: string;
}

type PendingOp = PendingUpsert | PendingDelete;

export interface HandlerStats {
  processed: number;
  errors: number;
  skipped: number;
  batchesFlushed: number;
  lastEventAt: Date | null;
}

// ============================================================
// EVENT HANDLER CLASS
// ============================================================

export class EventHandler {
  private readonly batchSize: number;
  private readonly batchTimeoutMs: number;
  private readonly validateRecords: boolean;
  /** When false, validation errors are suppressed unless the collection is in validationLogFilter */
  private readonly logValidationErrors: boolean;
  /** Set of NSIDs to log validation errors for when logValidationErrors is false. Empty = log none. */
  private readonly validationLogFilter: Set<string>;
  /** Callback fired after activity records are flushed to DB — used for scoring. */
  private readonly onActivityUpserted?: (records: RecordInsert[]) => void;

  private pending: PendingOp[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private flushing = false;
  /** Accumulated validation failures since last flush — aggregated into a single log. */
  private validationFailures: Map<string, number> = new Map();

  readonly stats: HandlerStats = {
    processed: 0,
    errors: 0,
    skipped: 0,
    batchesFlushed: 0,
    lastEventAt: null,
  };

  constructor(options: {
    batchSize?: number;
    batchTimeoutMs?: number;
    validateRecords?: boolean;
    logValidationErrors?: boolean;
    validationLogFilter?: string[];
    onActivityUpserted?: (records: RecordInsert[]) => void;
  } = {}) {
    this.batchSize = options.batchSize ?? 20;
    this.batchTimeoutMs = options.batchTimeoutMs ?? 200;
    this.validateRecords = options.validateRecords ?? true;
    this.logValidationErrors = options.logValidationErrors ?? true;
    this.validationLogFilter = new Set(options.validationLogFilter ?? []);
    this.onActivityUpserted = options.onActivityUpserted;
  }

  // ============================================================
  // EVENT ENTRY POINTS
  // ============================================================

  /**
   * Handle a record create event from Tap.
   */
  handleCreate(event: RecordEvent): void {
    const { did, collection, rkey, record, cid } = event;

    if (!isIndexedCollection(collection)) {
      this.stats.skipped++;
      return;
    }

    this.stats.lastEventAt = new Date();

    // Log event processing for debugging
    const isLive = "live" in event ? (event as { live?: boolean }).live : undefined;
    if (process.env.LOG_LEVEL === "debug") {
      console.log(`[handler] Create: ${collection}/${rkey} (live: ${isLive ?? "unknown"})`);
    }

    if (this.validateRecords) {
      // Prepare blobs as proper BlobRef objects (CID instances) for validation
      const recordForValidation = prepareBlobsForValidation(record);
      const result = this.validate(collection, recordForValidation);
      if (!result.ok) {
        // Aggregate validation failures — log summary during flush
        this.validationFailures.set(
          collection,
          (this.validationFailures.get(collection) ?? 0) + 1,
        );
        if (process.env.LOG_LEVEL === "debug" && this.shouldLogValidationError(collection)) {
          console.debug(
            `[handler] Validation failed for ${collection} (${did}/${rkey}): ${result.error}`
          );
        }
        this.stats.errors++;
        return;
      }
    }

    const uri = `at://${did}/${collection}/${rkey}`;
    // Normalize blobs to compact CID-string form for DB storage
    const normalizedRecord = normalizeBlobsInRecord(record);
    const createdAt = tryParseDate(
      (normalizedRecord as Record<string, unknown>)?.["createdAt"]
    );

    this.pending.push({
      kind: "upsert",
      record: { uri, did, collection, rkey, record: normalizedRecord, cid: cid ?? "", created_at: createdAt },
    });

    this.stats.processed++;
    this.maybeFlush();
  }

  /**
   * Handle a record update event from Tap.
   * Identical to create — upsert handles both.
   */
  handleUpdate(event: RecordEvent): void {
    const { did, collection, rkey, record, cid } = event;

    if (!isIndexedCollection(collection)) {
      this.stats.skipped++;
      return;
    }

    this.stats.lastEventAt = new Date();

    // Log event processing for debugging
    const isLive = "live" in event ? (event as { live?: boolean }).live : undefined;
    if (process.env.LOG_LEVEL === "debug") {
      console.log(`[handler] Update: ${collection}/${rkey} (live: ${isLive ?? "unknown"})`);
    }

    if (this.validateRecords) {
      // Prepare blobs as proper BlobRef objects (CID instances) for validation
      const recordForValidation = prepareBlobsForValidation(record);
      const result = this.validate(collection, recordForValidation);
      if (!result.ok) {
        // Aggregate validation failures — log summary during flush
        this.validationFailures.set(
          collection,
          (this.validationFailures.get(collection) ?? 0) + 1,
        );
        if (process.env.LOG_LEVEL === "debug" && this.shouldLogValidationError(collection)) {
          console.debug(
            `[handler] Validation failed for ${collection} (${did}/${rkey}): ${result.error}`
          );
        }
        this.stats.errors++;
        return;
      }
    }

    const uri = `at://${did}/${collection}/${rkey}`;
    // Normalize blobs to compact CID-string form for DB storage
    const normalizedRecord = normalizeBlobsInRecord(record);
    const createdAt = tryParseDate(
      (normalizedRecord as Record<string, unknown>)?.["createdAt"]
    );

    this.pending.push({
      kind: "upsert",
      record: { uri, did, collection, rkey, record: normalizedRecord, cid: cid ?? "", created_at: createdAt },
    });

    this.stats.processed++;
    this.maybeFlush();
  }

  /**
   * Handle a record delete event from Tap.
   */
  handleDelete(event: RecordEvent): void {
    const { did, collection, rkey } = event;

    if (!isIndexedCollection(collection)) {
      this.stats.skipped++;
      return;
    }

    this.stats.lastEventAt = new Date();

    // Log event processing for debugging
    const isLive = "live" in event ? (event as { live?: boolean }).live : undefined;
    if (process.env.LOG_LEVEL === "debug") {
      console.log(`[handler] Delete: ${collection}/${rkey} (live: ${isLive ?? "unknown"})`);
    }

    const uri = `at://${did}/${collection}/${rkey}`;
    this.pending.push({ kind: "delete", uri });

    this.stats.processed++;
    this.maybeFlush();
  }

  /**
   * Handle an account deactivation or deletion.
   * Removes ALL records for the affected DID from the index.
   */
  async handleAccountTombstone(event: IdentityEvent): Promise<void> {
    // Only act on non-active accounts (deactivated, deleted, suspended, takendown)
    if (event.isActive) return;

    const { did, status } = event;
    try {
      await deleteRecordsByDid(did);
      console.log(
        `[handler] Removed all records for ${status ?? "deactivated"} account: ${did}`
      );
    } catch (err) {
      console.error(`[handler] Failed to remove records for ${did}:`, err);
      this.stats.errors++;
    }
  }

  // ============================================================
  // BATCHING & FLUSHING
  // ============================================================

  /**
   * Flush buffered operations to the database immediately.
   * Called automatically when batch thresholds are met, or on shutdown.
   */
  async flush(): Promise<void> {
    if (this.flushTimer !== null) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    // Prevent concurrent flushes — if one is already in flight, skip.
    // The next maybeFlush() call (or the next event) will pick up any
    // records that accumulated while we were waiting.
    if (this.flushing) return;
    if (this.pending.length === 0) return;

    this.flushing = true;

    // Log aggregated validation failures from this cycle
    if (this.validationFailures.size > 0) {
      const summary = Array.from(this.validationFailures.entries())
        .map(([col, count]) => `${col}: ${count}`)
        .join(", ");
      console.warn(`[handler] Validation failures since last flush (${summary})`);
      this.validationFailures.clear();
    }

    // Drain the buffer atomically
    const batch = this.pending.splice(0, this.pending.length);

    const upserts = batch
      .filter((op): op is PendingUpsert => op.kind === "upsert")
      .map((op) => op.record);

    const deletes = batch
      .filter((op): op is PendingDelete => op.kind === "delete")
      .map((op) => op.uri);

    try {
      await Promise.all([
        upserts.length > 0 ? upsertRecords(upserts) : Promise.resolve(),
        deletes.length > 0 ? deleteRecords(deletes) : Promise.resolve(),
      ]);

      this.stats.batchesFlushed++;

      if (process.env.LOG_LEVEL === "debug") {
        console.debug(
          `[handler] Flushed: ${upserts.length} upserts, ${deletes.length} deletes`
        );
      }

      // Fire scoring callback for activity records (async, fire-and-forget)
      if (this.onActivityUpserted) {
        const activities = upserts.filter(
          (r) => r.collection === "org.hypercerts.claim.activity"
        );
        if (activities.length > 0) {
          this.onActivityUpserted(activities);
        }
      }
    } catch (err) {
      console.error(`[handler] Batch flush failed:`, err);
      this.stats.errors++;
      // Re-queue failed ops so they're not silently lost
      this.pending.unshift(...batch);
    } finally {
      this.flushing = false;
    }
  }

  // ============================================================
  // INTERNAL HELPERS
  // ============================================================

  private maybeFlush(): void {
    if (this.pending.length >= this.batchSize) {
      void this.flush();
      return;
    }
    if (this.flushTimer === null) {
      this.flushTimer = setTimeout(() => {
        this.flushTimer = null;
        void this.flush();
      }, this.batchTimeoutMs);
    }
  }

  private validate(
    collection: string,
    record: unknown
  ): { ok: true } | { ok: false; error: string } {
    return validateRecord(collection, record);
  }

  /**
   * Returns true if a validation error for the given collection should be logged.
   *
   * - logValidationErrors=true  → always log (validationLogFilter has no effect)
   * - logValidationErrors=false → only log if collection is in validationLogFilter
   */
  private shouldLogValidationError(collection: string): boolean {
    if (this.logValidationErrors) return true;
    return this.validationLogFilter.has(collection);
  }
}

// ============================================================
// UTILS
// ============================================================

function tryParseDate(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}
