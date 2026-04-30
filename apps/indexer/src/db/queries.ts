import { sql } from "./index.ts";
import type {
  RecordRow,
  RecordInsert,
  PaginationParams,
  PageResult,
  SortField,
  SortOrder,
  LabelRow,
  LabelInsert,
  ActivityLabelInsert,
} from "./types.ts";

// ============================================================
// RECORD WRITES
// ============================================================

/**
 * Maximum number of parameters PostgreSQL can handle in a single query.
 * We leave some margin for safety.
 */
const MAX_PARAMETERS = 65000;

/**
 * 7 columns per record: uri, did, collection, rkey, record, cid, created_at
 */
const COLS_PER_ROW = 7;

/**
 * Maximum records per batch to stay under MAX_PARAMETERS limit.
 */
const MAX_RECORDS_PER_BATCH = Math.floor(MAX_PARAMETERS / COLS_PER_ROW);

/**
 * Upsert a batch of records into the database.
 * On conflict (same uri), updates the record content and cid.
 * This is the hot path — called for every matching firehose event.
 *
 * Uses a single multi-row INSERT with parameterized values for maximum
 * throughput. Records are sorted by URI before inserting so that all
 * concurrent transactions always lock rows in the same order — this
 * prevents deadlocks when multiple flush calls overlap.
 *
 * The postgres library's sql(array, ...cols) helper does not support
 * sql.json() values. We work around this by pre-serializing each
 * record's JSONB to a string and casting with ::jsonb in the query.
 * The VALUES clause uses $N placeholders via sql.unsafe() but all
 * values are still bound parameters (no injection risk).
 *
 * De-duplicates records by URI before inserting. Tap can emit multiple events
 * for the same repo record in a single flush window during backfill/replay; a
 * multi-row INSERT ... ON CONFLICT statement cannot contain duplicate conflict
 * keys because PostgreSQL would need to update the same target row twice.
 * Keeping the last event for each URI preserves the newest value from the
 * flushed event sequence.
 *
 * Batches large inserts to respect PostgreSQL's 65534 parameter limit.
 * Uses a transaction to ensure atomicity — all batches commit or all roll back.
 */
export async function upsertRecords(records: RecordInsert[]): Promise<void> {
  if (records.length === 0) return;

  const dedupedByUri = new Map<string, RecordInsert>();
  for (const record of records) {
    dedupedByUri.set(record.uri, record);
  }

  const sorted = [...dedupedByUri.values()].sort((a, b) =>
    a.uri.localeCompare(b.uri)
  );

  // Process in batches within a transaction for atomicity
  await sql.begin(async (tx) => {
    const q = tx as unknown as typeof sql;
    for (let i = 0; i < sorted.length; i += MAX_RECORDS_PER_BATCH) {
      const batch = sorted.slice(i, i + MAX_RECORDS_PER_BATCH);
      await upsertRecordsBatchTx(q, batch);
    }
  });
}

/**
 * Upsert a single batch of records within a transaction.
 */
async function upsertRecordsBatchTx(
  tx: typeof sql,
  records: RecordInsert[]
): Promise<void> {
  if (records.length === 0) return;

  const q = tx as unknown as typeof sql;
  const params: (string | number | Date | null)[] = [];
  const valueRows: string[] = [];

  for (let i = 0; i < records.length; i++) {
    const r = records[i]!;
    const offset = i * COLS_PER_ROW;
    valueRows.push(
      `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}::jsonb, $${offset + 6}, $${offset + 7})`
    );
    params.push(
      r.uri,
      r.did,
      r.collection,
      r.rkey,
      typeof r.record === "string" ? r.record : JSON.stringify(r.record),
      r.cid,
      r.created_at ?? null,
    );
  }

  const query = `
    INSERT INTO records (uri, did, collection, rkey, record, cid, created_at)
    VALUES ${valueRows.join(", ")}
    ON CONFLICT (uri) DO UPDATE SET
      record     = EXCLUDED.record,
      cid        = EXCLUDED.cid,
      created_at = EXCLUDED.created_at,
      indexed_at = NOW()
  `;

  await q.unsafe(query, params);
}

/**
 * Delete a record by its AT-URI.
 * Called when a firehose delete event is received.
 */
export async function deleteRecord(uri: string): Promise<void> {
  await sql`DELETE FROM records WHERE uri = ${uri}`;
}

/**
 * Delete multiple records by their AT-URIs in a single query.
 * More efficient than individual deleteRecord() calls when handling
 * batched delete events during flush.
 */
export async function deleteRecords(uris: string[]): Promise<void> {
  if (uris.length === 0) return;
  await sql`DELETE FROM records WHERE uri = ANY(${uris}::text[])`;
}

/**
 * Delete all records belonging to a DID.
 * Called when an account is deleted or deactivated.
 */
export async function deleteRecordsByDid(did: string): Promise<void> {
  await sql`DELETE FROM records WHERE did = ${did}`;
}

/**
 * Delete all records belonging to a list of DIDs in a single query.
 * Used by reindexRepoByDid to wipe existing entries before re-backfilling.
 */
export async function deleteRecordsByDids(dids: string[]): Promise<void> {
  if (dids.length === 0) return;
  await sql`DELETE FROM records WHERE did = ANY(${dids}::text[])`;
}

/**
 * Delete all records for a given collection NSID.
 * Used by reindexRepoByCollection to wipe before re-backfilling.
 */
export async function deleteRecordsByCollection(collection: string): Promise<void> {
  await sql`DELETE FROM records WHERE collection = ${collection}`;
}

// ============================================================
// RECORD READS
// ============================================================

/**
 * Fetch a single record by its AT-URI.
 */
export async function getRecord(uri: string): Promise<RecordRow | null> {
  const rows = await sql<RecordRow[]>`
    SELECT * FROM records WHERE uri = ${uri} LIMIT 1
  `;
  return rows[0] ?? null;
}

// ----------------------------------------------------------------
// Internal: resolve sort column identifier and build cursor clause
// ----------------------------------------------------------------

function resolveSort(
  sortField: SortField = "createdAt",
  sortOrder: SortOrder = "desc"
): { col: "created_at" | "indexed_at"; order: "DESC" | "ASC" } {
  return {
    col:   sortField === "indexedAt" ? "indexed_at" : "created_at",
    order: sortOrder === "asc" ? "ASC" : "DESC",
  };
}

/**
 * Core paginated record fetch.
 * Shared by getRecordsByCollection and getRecordsByDid.
 * Supports:
 *   - Keyset cursor pagination (works in both ASC and DESC order)
 *   - Optional DID filter
 *   - Sort by created_at or indexed_at, in either direction
 */
async function queryRecords(
  collection: string,
  {
    cursor,
    limit = 50,
    did,
    rkey,
    sortField = "createdAt",
    sortOrder = "desc",
  }: PaginationParams
): Promise<PageResult<RecordRow>> {
  const safeLimit = Math.min(Math.max(limit, 1), 100);
  const { col, order } = resolveSort(sortField, sortOrder);

  // Build cursor clause: for desc, go back in time (col < cursor);
  // for asc, go forward in time (col > cursor).
  const cursorDate = cursor ? new Date(cursor) : null;
  const isDesc = order === "DESC";

  const rows = await sql<RecordRow[]>`
    SELECT * FROM records
    WHERE collection = ${collection}
      ${did ? sql`AND did = ${did}` : sql``}
      ${rkey ? sql`AND rkey = ${rkey}` : sql``}
      ${cursorDate
        ? isDesc
          ? sql`AND ${sql(col)} < ${cursorDate}`
          : sql`AND ${sql(col)} > ${cursorDate}`
        : sql``
      }
    ORDER BY ${sql(col)} ${sql.unsafe(order)} NULLS LAST
    LIMIT ${safeLimit + 1}
  `;

  return paginateWithSort(rows, safeLimit, col);
}

/**
 * Fetch records by collection with cursor-based pagination.
 * Supports DID filtering and sorting.
 */
export async function getRecordsByCollection(
  collection: string,
  params: PaginationParams = {}
): Promise<PageResult<RecordRow>> {
  return queryRecords(collection, params);
}

/**
 * Batch-fetch records from a single collection by DID + rkey pairs.
 *
 * Used for join-style lookups, e.g. fetching all `app.gainforest.funding.config`
 * records that share an rkey with a set of `org.hypercerts.claim.activity` rows.
 *
 * Returns a Map keyed by `"${did}:${rkey}"` for O(1) lookup.
 *
 * @param collection  The Lexicon NSID to query.
 * @param pairs       Array of { did, rkey } pairs to look up.
 */
export async function getRecordsByDidRkeyPairs(
  collection: string,
  pairs: Array<{ did: string; rkey: string }>
): Promise<Map<string, RecordRow>> {
  if (pairs.length === 0) return new Map();

  const dids  = pairs.map((p) => p.did);
  const rkeys = pairs.map((p) => p.rkey);

  // Fetch all rows where collection matches AND (did, rkey) is in the pair set.
  // PostgreSQL unnest trick turns parallel arrays into a set of (did, rkey) tuples.
  const rows = await sql<RecordRow[]>`
    SELECT r.* FROM records r
    JOIN unnest(${dids}::text[], ${rkeys}::text[]) AS pairs(did, rkey)
      ON r.did = pairs.did AND r.rkey = pairs.rkey
    WHERE r.collection = ${collection}
  `;

  const map = new Map<string, RecordRow>();
  for (const row of rows) {
    map.set(`${row.did}:${row.rkey}`, row);
  }
  return map;
}

/**
 * Fetch all records for a given DID, optionally filtered by collection.
 * Legacy function retained for backfill script compatibility.
 */
export async function getRecordsByDid(
  did: string,
  collection?: string,
  params: PaginationParams = {}
): Promise<PageResult<RecordRow>> {
  if (collection) {
    return queryRecords(collection, { ...params, did });
  }

  // No collection filter — fetch across all collections for this DID
  const {
    cursor,
    limit = 50,
    sortField = "createdAt",
    sortOrder = "desc",
  } = params;
  const safeLimit = Math.min(Math.max(limit, 1), 100);
  const { col, order } = resolveSort(sortField, sortOrder);
  const cursorDate = cursor ? new Date(cursor) : null;
  const isDesc = order === "DESC";

  const rows = await sql<RecordRow[]>`
    SELECT * FROM records
    WHERE did = ${did}
      ${cursorDate
        ? isDesc
          ? sql`AND ${sql(col)} < ${cursorDate}`
          : sql`AND ${sql(col)} > ${cursorDate}`
        : sql``
      }
    ORDER BY ${sql(col)} ${sql.unsafe(order)} NULLS LAST
    LIMIT ${safeLimit + 1}
  `;

  return paginateWithSort(rows, safeLimit, col);
}

/**
 * Search records within a collection by a top-level JSONB field value.
 * e.g. searchRecordsByField('app.gainforest.dwc.occurrence', 'scientificName', 'Panthera leo')
 */
export async function searchRecordsByField(
  collection: string,
  field: string,
  value: string,
  { cursor, limit = 50 }: PaginationParams = {}
): Promise<PageResult<RecordRow>> {
  const safeLimit = Math.min(limit, 100);

  const rows = await sql<RecordRow[]>`
    SELECT * FROM records
    WHERE collection = ${collection}
      AND record->>${field} = ${value}
      ${cursor ? sql`AND created_at < ${new Date(cursor)}` : sql``}
    ORDER BY created_at DESC NULLS LAST
    LIMIT ${safeLimit + 1}
  `;

  return paginate(rows, safeLimit);
}

/**
 * Count total records per collection.
 * Useful for dashboard / GraphQL stats queries.
 */
export async function getCollectionStats(): Promise<
  { collection: string; count: number }[]
> {
  const rows = await sql<{ collection: string; count: string }[]>`
    SELECT collection, COUNT(*)::text AS count
    FROM records
    GROUP BY collection
    ORDER BY collection
  `;
  return rows.map((r) => ({
    collection: r.collection,
    count: parseInt(r.count, 10),
  }));
}

// ============================================================
// LABEL READS / WRITES
// ============================================================

/**
 * Upsert a batch of labels.
 * On conflict (same subject_did + source_did) the label value and
 * labeled_at are updated, and synced_at is refreshed to NOW().
 */
export async function upsertLabels(labels: LabelInsert[]): Promise<void> {
  if (labels.length === 0) return;
  await sql.begin(async (tx) => {
    const q = tx as unknown as typeof sql;
    for (const l of labels) {
      await q`
        INSERT INTO labels (subject_did, subject_uri, source_did, label_value, score, breakdown, test_signals, hf_label, hf_score, labeled_at)
        VALUES (
          ${l.subject_did}, ${l.subject_uri ?? null}, ${l.source_did}, ${l.label_value},
          ${l.score ?? null}, ${l.breakdown ? sql.json(l.breakdown as { readonly [key: string]: undefined | number }) : null},
          ${l.test_signals ? sql.json(l.test_signals as readonly string[]) : null},
          ${l.hf_label ?? null}, ${l.hf_score ?? null}, ${l.labeled_at ?? null}
        )
        ON CONFLICT (subject_did, source_did) DO UPDATE SET
          subject_uri  = EXCLUDED.subject_uri,
          label_value  = EXCLUDED.label_value,
          score        = EXCLUDED.score,
          breakdown    = EXCLUDED.breakdown,
          test_signals = EXCLUDED.test_signals,
          hf_label     = COALESCE(EXCLUDED.hf_label, labels.hf_label),
          hf_score     = COALESCE(EXCLUDED.hf_score, labels.hf_score),
          labeled_at   = EXCLUDED.labeled_at,
          synced_at    = NOW()
      `;
    }
  });
}

/**
 * Upsert a single locally-scored activity label.
 * Used by the scoring worker when processing TAP events.
 */
export async function upsertActivityLabel(label: ActivityLabelInsert): Promise<void> {
  await sql`
    INSERT INTO labels (subject_did, subject_uri, source_did, label_value, score, breakdown, test_signals, labeled_at)
    VALUES (
      ${label.subject_did}, ${label.subject_uri}, ${label.source_did}, ${label.label_value},
      ${label.score}, ${sql.json(label.breakdown as { readonly [key: string]: undefined | number })}, ${sql.json(label.test_signals as readonly string[])}, NOW()
    )
    ON CONFLICT (subject_did, source_did) DO UPDATE SET
      subject_uri  = EXCLUDED.subject_uri,
      label_value  = EXCLUDED.label_value,
      score        = EXCLUDED.score,
      breakdown    = EXCLUDED.breakdown,
      test_signals = EXCLUDED.test_signals,
      labeled_at   = EXCLUDED.labeled_at,
      synced_at    = NOW()
  `;
}

/**
 * Fetch labels for a list of subject DIDs from a specific labeller.
 * Returns a Map keyed by subject_did for O(1) lookup when attaching
 * labels to activity records.
 */
export async function getLabelsByDids(
  dids: string[],
  sourceDid: string,
): Promise<Map<string, LabelRow>> {
  if (dids.length === 0) return new Map();
  const rows = await sql<LabelRow[]>`
    SELECT * FROM labels
    WHERE source_did  = ${sourceDid}
      AND subject_did = ANY(${dids}::text[])
  `;
  const map = new Map<string, LabelRow>();
  for (const row of rows) map.set(row.subject_did, row);
  return map;
}

/**
 * Return the set of subject DIDs that carry a given label tier
 * from a specific labeller source.
 * Used to pre-filter activity queries when labelTier is provided.
 */
export async function getActivityLabelDids(
  sourceDid: string,
  tier: string,
): Promise<Set<string>> {
  const rows = await sql<{ subject_did: string }[]>`
    SELECT subject_did FROM labels
    WHERE source_did  = ${sourceDid}
      AND label_value = ${tier}
  `;
  return new Set(rows.map((r) => r.subject_did));
}

/**
 * Fetch a single label row by subject DID and source.
 * Used by the HF classifier to read existing score/signals before reclassification.
 */
export async function getLabelByDidSource(
  did: string,
  sourceDid: string,
): Promise<LabelRow | null> {
  const rows = await sql<LabelRow[]>`
    SELECT * FROM labels
    WHERE subject_did = ${did}
      AND source_did  = ${sourceDid}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

/**
 * Update HuggingFace classification results on an existing label row.
 * Also updates tier and test signals if HF flagged the content.
 */
export async function updateHfClassification(
  did: string,
  sourceDid: string,
  hfLabel: string,
  hfScore: number,
  newTier: string,
  testSignals: string[],
): Promise<void> {
  await sql`
    UPDATE labels SET
      hf_label     = ${hfLabel},
      hf_score     = ${hfScore},
      label_value  = ${newTier},
      test_signals = ${sql.json(testSignals)},
      synced_at    = NOW()
    WHERE subject_did = ${did}
      AND source_did  = ${sourceDid}
  `;
}

/**
 * Fetch labels that have a score but no HF classification yet.
 * Used by the backfill to seed the HF classification queue.
 */
export async function getUnclassifiedActivities(
  sourceDid: string,
  limit: number,
): Promise<LabelRow[]> {
  return sql<LabelRow[]>`
    SELECT * FROM labels
    WHERE source_did = ${sourceDid}
      AND score IS NOT NULL
      AND score > 19
      AND hf_label IS NULL
    ORDER BY synced_at ASC
    LIMIT ${limit}
  `;
}

/**
 * Fetch unlabelled activity records for backfill scoring.
 * Returns records that don't yet have a label from the given source.
 */
export async function getUnlabelledActivities(
  sourceDid: string,
  limit: number,
  offset: number,
): Promise<RecordRow[]> {
  return sql<RecordRow[]>`
    SELECT r.*
    FROM records r
    LEFT JOIN labels l ON l.subject_did = r.did AND l.source_did = ${sourceDid}
    WHERE r.collection = 'org.hypercerts.claim.activity'
      AND l.id IS NULL
    ORDER BY r.indexed_at ASC
    LIMIT ${limit}
    OFFSET ${offset}
  `;
}

/**
 * Count total activity records for backfill progress logging.
 */
export async function countActivityRecords(): Promise<number> {
  const rows = await sql<{ count: string }[]>`
    SELECT COUNT(*) as count FROM records
    WHERE collection = 'org.hypercerts.claim.activity'
  `;
  return parseInt(rows[0]?.count ?? "0", 10);
}

// ============================================================
// FULL-TEXT SEARCH
// ============================================================

/**
 * Per-field string filter with four match modes.
 * All modes are case-insensitive (ILIKE / =).
 * Supplying more than one mode on the same object combines them with AND.
 *
 *   { equals: "Panthera leo" }          →  col = 'Panthera leo'
 *   { startsWith: "carbon" }            →  col ILIKE 'carbon%'
 *   { endsWith: "forest" }              →  col ILIKE '%forest'
 *   { includes: "rain" }                →  col ILIKE '%rain%'
 *   { startsWith: "A", endsWith: "Z" }  →  col ILIKE 'A%' AND col ILIKE '%Z'
 */
export interface StringFilter {
  /** Exact case-insensitive equality (= lower(col)). */
  equals?: string | null;
  /** Value must begin with this prefix (ILIKE 'val%'). */
  startsWith?: string | null;
  /** Value must end with this suffix (ILIKE '%val'). */
  endsWith?: string | null;
  /** Value must contain this substring (ILIKE '%val%'). */
  includes?: string | null;
}

/**
 * A recursive filter tree for full-text / substring record search.
 *
 * Leaf nodes carry StringFilter predicates per named field.
 * Compound nodes combine child filters with AND / OR / NOT boolean logic.
 *
 *   // Simple: title starts with "carbon"
 *   { title: { startsWith: "carbon" } }
 *
 *   // AND: title includes "carbon" AND shortDescription includes "forest"
 *   { and: [{ title: { includes: "carbon" } }, { shortDescription: { includes: "forest" } }] }
 *
 *   // OR + NOT: title includes "solar" OR NOT description includes "test"
 *   { or: [{ title: { includes: "solar" } }, { not: { description: { includes: "test" } } }] }
 *
 * For `searchOrganizations`, `title` matches `displayName` and
 * `description` matches `longDescription`.
 */
export interface RecordFilter {
  // ── Leaf predicates ──────────────────────────────────────────
  /**
   * StringFilter on the title field.
   * For organizations, this matches `displayName`.
   */
  title?: StringFilter | null;
  /** StringFilter on the shortDescription field. */
  shortDescription?: StringFilter | null;
  /**
   * StringFilter on the description field.
   * For organizations, this matches `longDescription`.
   */
  description?: StringFilter | null;
  /**
   * Full-text phrase search across ALL searchable fields at once.
   * Uses PostgreSQL's `to_tsvector` + `websearch_to_tsquery`.
   * Supports quoted phrases and minus-negation:
   *   "carbon forest"     — both words anywhere
   *   '"carbon forest"'   — exact phrase
   *   'carbon -test'      — carbon but not test
   */
  text?: string | null;

  // ── Compound operators ───────────────────────────────────────
  /** ALL child filters must match (logical AND). */
  and?: RecordFilter[] | null;
  /** AT LEAST ONE child filter must match (logical OR). */
  or?: RecordFilter[] | null;
  /** The child filter must NOT match (logical NOT). */
  not?: RecordFilter | null;
}

/**
 * Per-collection config that maps the abstract RecordFilter leaf names
 * to the concrete JSONB column expressions for that collection.
 */
interface FilterConfig {
  /** Column expression for the `title` leaf predicate. */
  titleExpr: string;
  /** Column expression for the `shortDescription` leaf predicate. */
  shortDescriptionExpr: string;
  /**
   * Column expressions for the `description` leaf predicate.
   * An OR is emitted across all entries so a single leaf can cover
   * both `description` and `longDescription`.
   */
  descriptionExprs: string[];
  /** All column expressions concatenated for the `text` tsvector predicate. */
  ftsExprs: string[];
}

const ACTIVITY_FILTER_CONFIG: FilterConfig = {
  titleExpr:            "record->>'title'",
  shortDescriptionExpr: "record->>'shortDescription'",
  descriptionExprs:     ["record->>'description'"],
  ftsExprs: [
    "record->>'title'",
    "record->>'shortDescription'",
    "record->>'description'",
  ],
};

const ORG_INFO_FILTER_CONFIG: FilterConfig = {
  // For org.info, "title" maps to displayName; "description" to longDescription
  titleExpr:            "record->>'displayName'",
  shortDescriptionExpr: "record->>'shortDescription'",
  descriptionExprs:     ["record->>'longDescription'"],
  ftsExprs: [
    "record->>'displayName'",
    "record->>'shortDescription'",
    "record->>'longDescription'",
  ],
};

/**
 * Compile a single StringFilter against one SQL column expression into
 * a postgres `sql` fragment.  Returns null if the StringFilter is empty.
 *
 * Multiple modes on the same StringFilter are combined with AND:
 *   { startsWith: "A", endsWith: "Z" }  →  col ILIKE 'A%' AND col ILIKE '%Z'
 */
function buildStringFilter(
  sf: StringFilter,
  colExpr: string,
): ReturnType<typeof sql> | null {
  const parts: ReturnType<typeof sql>[] = [];

  if (sf.equals != null) {
    // Case-insensitive equality via lower()
    parts.push(sql`lower(${sql.unsafe(colExpr)}) = lower(${sf.equals})`);
  }
  if (sf.startsWith != null) {
    parts.push(sql`${sql.unsafe(colExpr)} ILIKE ${sf.startsWith + "%"}`);
  }
  if (sf.endsWith != null) {
    parts.push(sql`${sql.unsafe(colExpr)} ILIKE ${"%" + sf.endsWith}`);
  }
  if (sf.includes != null) {
    parts.push(sql`${sql.unsafe(colExpr)} ILIKE ${"%" + sf.includes + "%"}`);
  }

  if (parts.length === 0) return null;
  if (parts.length === 1) return parts[0]!;
  return sql`(${parts.reduce((a, b) => sql`${a} AND ${b}`)})`;
}

/**
 * Compile a StringFilter against multiple column expressions (OR across exprs).
 * Used for fields like `description` that map to >1 JSONB columns.
 */
function buildStringFilterMulti(
  sf: StringFilter,
  colExprs: string[],
): ReturnType<typeof sql> | null {
  if (colExprs.length === 0) return null;
  if (colExprs.length === 1) return buildStringFilter(sf, colExprs[0]!);

  const perCol = colExprs
    .map((e) => buildStringFilter(sf, e))
    .filter((c): c is ReturnType<typeof sql> => c !== null);
  if (perCol.length === 0) return null;
  return sql`(${perCol.reduce((a, b) => sql`${a} OR ${b}`)})`;
}

/**
 * Compile a RecordFilter tree into a postgres `sql` fragment.
 *
 * Returns null when the filter is entirely empty so callers can omit
 * the WHERE clause.
 */
function buildFilterClause(
  filter: RecordFilter,
  config: FilterConfig,
): ReturnType<typeof sql> | null {
  const parts: ReturnType<typeof sql>[] = [];

  // ── Leaf: title ──────────────────────────────────────────────
  if (filter.title != null) {
    const clause = buildStringFilter(filter.title, config.titleExpr);
    if (clause) parts.push(clause);
  }

  // ── Leaf: shortDescription ───────────────────────────────────
  if (filter.shortDescription != null) {
    const clause = buildStringFilter(filter.shortDescription, config.shortDescriptionExpr);
    if (clause) parts.push(clause);
  }

  // ── Leaf: description ────────────────────────────────────────
  if (filter.description != null) {
    const clause = buildStringFilterMulti(filter.description, config.descriptionExprs);
    if (clause) parts.push(clause);
  }

  // ── Leaf: full-text (tsvector) ───────────────────────────────
  if (filter.text != null) {
    const concat = config.ftsExprs
      .map((e) => `coalesce(${e}, '')`)
      .join(` || ' ' || `);
    parts.push(
      sql`to_tsvector('english', ${sql.unsafe(concat)}) @@ websearch_to_tsquery('english', ${filter.text})`
    );
  }

  // ── Compound: AND ────────────────────────────────────────────
  if (filter.and && filter.and.length > 0) {
    const children = filter.and
      .map((f) => buildFilterClause(f, config))
      .filter((c): c is ReturnType<typeof sql> => c !== null);
    if (children.length > 0) {
      parts.push(sql`(${children.reduce((a, b) => sql`${a} AND ${b}`)})`);
    }
  }

  // ── Compound: OR ─────────────────────────────────────────────
  if (filter.or && filter.or.length > 0) {
    const children = filter.or
      .map((f) => buildFilterClause(f, config))
      .filter((c): c is ReturnType<typeof sql> => c !== null);
    if (children.length > 0) {
      parts.push(sql`(${children.reduce((a, b) => sql`${a} OR ${b}`)})`);
    }
  }

  // ── Compound: NOT ────────────────────────────────────────────
  if (filter.not != null) {
    const child = buildFilterClause(filter.not, config);
    if (child !== null) {
      parts.push(sql`NOT (${child})`);
    }
  }

  if (parts.length === 0) return null;
  if (parts.length === 1) return parts[0]!;
  // Multiple top-level leaf predicates → implicit AND
  return sql`(${parts.reduce((a, b) => sql`${a} AND ${b}`)})`;
}

/** Search parameters shared by all search query functions. */
export interface SearchParams {
  filter: RecordFilter;
  /** Optional DID filter — restrict to records from this author. */
  did?: string;
  /** Optional rkey filter — restrict to a specific record key. */
  rkey?: string;
  /** Max records to return (1–100, default 50). */
  limit?: number;
  /** Opaque cursor for keyset pagination (indexed_at DESC). */
  cursor?: string;
}

/**
 * Search `org.hypercerts.claim.activity` records.
 *
 * Searchable fields via RecordFilter:
 *   - `title`            → record->>'title'
 *   - `shortDescription` → record->>'shortDescription'
 *   - `description`      → record->>'description'
 *   - `text`             → full-text across all three (tsvector GIN index)
 *   - `and` / `or` / `not` → boolean combinations of the above
 */
export async function searchActivities(
  params: SearchParams,
): Promise<PageResult<RecordRow>> {
  const safeLimit = Math.min(Math.max(params.limit ?? 50, 1), 100);
  const filterClause = buildFilterClause(params.filter, ACTIVITY_FILTER_CONFIG);

  const rows = await sql<RecordRow[]>`
    SELECT * FROM records
    WHERE collection = 'org.hypercerts.claim.activity'
      ${params.did    ? sql`AND did        = ${params.did}`              : sql``}
      ${params.rkey   ? sql`AND rkey       = ${params.rkey}`             : sql``}
      ${params.cursor ? sql`AND indexed_at < ${new Date(params.cursor)}` : sql``}
      ${filterClause  ? sql`AND ${filterClause}`                         : sql``}
    ORDER BY indexed_at DESC
    LIMIT ${safeLimit + 1}
  `;

  return paginateWithSort(rows, safeLimit, "indexed_at");
}

/**
 * Search `app.gainforest.organization.info` records.
 *
 * Searchable fields via RecordFilter:
 *   - `title`            → record->>'displayName'
 *   - `shortDescription` → record->>'shortDescription'  (JSONB cast to text)
 *   - `description`      → record->>'longDescription'   (JSONB cast to text)
 *   - `text`             → full-text across all three (tsvector GIN index)
 *   - `and` / `or` / `not` → boolean combinations of the above
 */
export async function searchOrganizations(
  params: SearchParams,
): Promise<PageResult<RecordRow>> {
  const safeLimit = Math.min(Math.max(params.limit ?? 50, 1), 100);
  const filterClause = buildFilterClause(params.filter, ORG_INFO_FILTER_CONFIG);

  const rows = await sql<RecordRow[]>`
    SELECT * FROM records
    WHERE collection = 'app.gainforest.organization.info'
      ${params.did    ? sql`AND did        = ${params.did}`              : sql``}
      ${params.rkey   ? sql`AND rkey       = ${params.rkey}`             : sql``}
      ${params.cursor ? sql`AND indexed_at < ${new Date(params.cursor)}` : sql``}
      ${filterClause  ? sql`AND ${filterClause}`                         : sql``}
    ORDER BY indexed_at DESC
    LIMIT ${safeLimit + 1}
  `;

  return paginateWithSort(rows, safeLimit, "indexed_at");
}

// ============================================================
// PDS HOST CACHE READS / WRITES
// ============================================================

/**
 * Fetch cached PDS hosts for a list of DIDs from the database.
 * Returns a Map<did, host> containing only the DIDs that have a cached entry.
 */
export async function getPdsHostsFromDb(dids: string[]): Promise<Map<string, string>> {
  if (dids.length === 0) return new Map();
  const rows = await sql<{ did: string; host: string }[]>`
    SELECT did, host FROM pds_hosts WHERE did = ANY(${dids})
  `;
  return new Map(rows.map((r) => [r.did, r.host]));
}

/**
 * Upsert PDS host mappings into the database cache.
 * Safe to call with duplicates — uses ON CONFLICT DO UPDATE.
 * Batches large inserts to respect PostgreSQL's parameter limit.
 * Uses a transaction to ensure atomicity.
 */
export async function upsertPdsHosts(
  entries: Array<{ did: string; host: string }>
): Promise<void> {
  if (entries.length === 0) return;

  // 3 columns per entry: did, host, fetched_at
  const COLS_PER_ENTRY = 3;
  const MAX_HOSTS_PER_BATCH = Math.floor(MAX_PARAMETERS / COLS_PER_ENTRY);

  // Process in batches within a transaction for atomicity
  await sql.begin(async (tx) => {
    const q = tx as unknown as typeof sql;
    for (let i = 0; i < entries.length; i += MAX_HOSTS_PER_BATCH) {
      const batch = entries.slice(i, i + MAX_HOSTS_PER_BATCH);
      await upsertPdsHostsBatchTx(q, batch, COLS_PER_ENTRY);
    }
  });
}

async function upsertPdsHostsBatchTx(
  tx: typeof sql,
  entries: Array<{ did: string; host: string }>,
  colsPerEntry: number
): Promise<void> {
  if (entries.length === 0) return;

  const q = tx as unknown as typeof sql;
  const params: (string | Date)[] = [];
  const valueRows: string[] = [];

  for (let i = 0; i < entries.length; i++) {
    const offset = i * colsPerEntry;
    valueRows.push(`($${offset + 1}, $${offset + 2}, $${offset + 3})`);
    params.push(entries[i]!.did, entries[i]!.host, new Date());
  }

  const query = `
    INSERT INTO pds_hosts (did, host, fetched_at)
    VALUES ${valueRows.join(", ")}
    ON CONFLICT (did) DO UPDATE SET host = EXCLUDED.host, fetched_at = EXCLUDED.fetched_at
  `;

  await q.unsafe(query, params);
}

// ============================================================
// INTERNAL HELPERS
// ============================================================

/**
 * Apply cursor-based pagination using created_at as the cursor field.
 * Legacy helper — kept for searchRecordsByField.
 */
function paginate<T extends RecordRow>(
  rows: T[],
  limit: number
): PageResult<T> {
  return paginateWithSort(rows, limit, "created_at");
}

/**
 * Apply cursor-based pagination, deriving the cursor from the given column.
 */
function paginateWithSort<T extends RecordRow>(
  rows: T[],
  limit: number,
  col: "created_at" | "indexed_at"
): PageResult<T> {
  const hasMore = rows.length > limit;
  const result = hasMore ? rows.slice(0, limit) : rows;
  const lastRow = result[result.length - 1];
  const cursor = hasMore && lastRow
    ? (col === "indexed_at" ? lastRow.indexed_at : lastRow.created_at)?.toISOString()
    : undefined;
  return { records: result, cursor };
}
