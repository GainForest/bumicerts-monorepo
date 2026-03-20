/**
 * TypeScript types for database operations.
 * These represent rows as they exist in PostgreSQL.
 */

/**
 * A row in the `records` table.
 * The `record` field is the raw JSONB content from the PDS.
 */
export interface RecordRow {
  /** Full AT-URI: at://did/collection/rkey */
  uri: string;
  /** DID of the author: did:plc:xxx or did:web:xxx */
  did: string;
  /** Lexicon collection ID: e.g. app.gainforest.dwc.occurrence */
  collection: string;
  /** Record key: tid (e.g. 3jzfcijpj2z2a) or literal (e.g. "self") */
  rkey: string;
  /** Full record content as parsed from JSONB */
  record: unknown;
  /** CID content hash */
  cid: string;
  /** When the indexer stored this record */
  indexed_at: Date;
  /** Parsed from record.createdAt — may be null if not present */
  created_at: Date | null;
}

/**
 * Input shape for inserting or upserting a record.
 * Omits `indexed_at` (set by DB default).
 */
export type RecordInsert = Omit<RecordRow, "indexed_at">;

/** Sort field for record queries. */
export type SortField = "createdAt" | "indexedAt";

/** Sort direction. */
export type SortOrder = "desc" | "asc";

/**
 * Pagination and filtering parameters for list queries.
 */
export interface PaginationParams {
  /**
   * Opaque cursor for keyset pagination.
   * For desc: return records BEFORE this timestamp.
   * For asc:  return records AFTER  this timestamp.
   */
  cursor?: string;
  /** Max records to return. Defaults to 50, max 100. */
  limit?: number;
  /**
   * Filter by author DID.
   * When set, only records from this DID are returned.
   */
  did?: string;
  /**
   * Filter by record key (rkey).
   * Useful for fetching a specific record when combined with `did`.
   */
  rkey?: string;
  /**
   * Which timestamp column to sort/page on.
   * - "createdAt"  → `created_at`  column (default)
   * - "indexedAt"  → `indexed_at`  column
   */
  sortField?: SortField;
  /**
   * Sort direction.
   * - "desc" → newest first (default)
   * - "asc"  → oldest first
   */
  sortOrder?: SortOrder;
}

/**
 * A paginated result set.
 */
export interface PageResult<T> {
  records: T[];
  /** Pass this as `cursor` in the next request, or undefined if no more pages */
  cursor: string | undefined;
}

// ============================================================
// LABEL TYPES
// ============================================================

/**
 * A row in the `labels` table.
 * One active label per (subject_did, source_did) pair.
 */
export interface LabelRow {
  id: number;
  /** DID of the activity record author being labelled */
  subject_did: string;
  /** AT-URI of the specific activity record (e.g. at://did/collection/rkey) */
  subject_uri: string | null;
  /** DID or identifier of the labeller that issued this label */
  source_did: string;
  /** Label tier value: "high-quality" | "standard" | "draft" | "likely-test" */
  label_value: string;
  /** Quality score 0-100 */
  score: number | null;
  /** Score breakdown by criteria (ScoreBreakdown as JSONB) */
  breakdown: unknown;
  /** Test signals detected (string[] as JSONB) */
  test_signals: unknown;
  /** HuggingFace classification label */
  hf_label: string | null;
  /** HuggingFace classification confidence */
  hf_score: number | null;
  /** When the labeller applied this label */
  labeled_at: Date | null;
  /** When we last synced/updated this label */
  synced_at: Date;
}

/** Input shape for inserting or upserting a label. */
export type LabelInsert = Omit<LabelRow, "id" | "synced_at">;

/** Input shape for upserting a locally-scored activity label. */
export interface ActivityLabelInsert {
  subject_did: string;
  subject_uri: string;
  source_did: string;
  label_value: string;
  score: number;
  breakdown: unknown;
  test_signals: string[];
}
