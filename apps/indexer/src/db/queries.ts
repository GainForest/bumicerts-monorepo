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
} from "./types.ts";

// ============================================================
// RECORD WRITES
// ============================================================

/**
 * Upsert a batch of records into the database.
 * On conflict (same uri), updates the record content and cid.
 * This is the hot path — called for every matching firehose event.
 *
 * Uses sql.unsafe inside a transaction for batch upsert, since
 * the postgres library's TransactionSql type loses call signatures
 * via Omit (a known TypeScript limitation).
 */
export async function upsertRecords(records: RecordInsert[]): Promise<void> {
  if (records.length === 0) return;

  // The postgres library's sql(array, ...cols) helper does not support sql.json()
  // values inside the array — it crashes when trying to escape them as identifiers.
  // Instead we use a transaction with individual parameterized statements, one per
  // record. PostgreSQL pipelines these within the transaction so performance is
  // equivalent to a single multi-row INSERT for our batch sizes (≤100 rows).
  // TransactionSql loses its call signature via Omit — cast to any to use it as a
  // tagged template literal. This is a known TypeScript limitation in the postgres lib.
  //
  // Sort by URI before acquiring row locks so that all concurrent transactions
  // always lock rows in the same order — this prevents deadlocks when multiple
  // flush calls overlap (even across separate processes / connections).
  const sorted = [...records].sort((a, b) => a.uri.localeCompare(b.uri));

  await sql.begin(async (tx) => {
    const q = tx as unknown as typeof sql;
    for (const r of sorted) {
      await q`
        INSERT INTO records
          (uri, did, collection, rkey, record, cid, created_at)
        VALUES (
          ${r.uri},
          ${r.did},
          ${r.collection},
          ${r.rkey},
          ${sql.json(r.record as Parameters<typeof sql.json>[0])},
          ${r.cid},
          ${r.created_at ?? null}
        )
        ON CONFLICT (uri) DO UPDATE SET
          record     = EXCLUDED.record,
          cid        = EXCLUDED.cid,
          created_at = EXCLUDED.created_at,
          indexed_at = NOW()
      `;
    }
  });
}

/**
 * Delete a record by its AT-URI.
 * Called when a firehose delete event is received.
 */
export async function deleteRecord(uri: string): Promise<void> {
  await sql`DELETE FROM records WHERE uri = ${uri}`;
}

/**
 * Delete all records belonging to a DID.
 * Called when an account is deleted or deactivated.
 */
export async function deleteRecordsByDid(did: string): Promise<void> {
  await sql`DELETE FROM records WHERE did = ${did}`;
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
        INSERT INTO labels (subject_did, source_did, label_value, labeled_at)
        VALUES (${l.subject_did}, ${l.source_did}, ${l.label_value}, ${l.labeled_at ?? null})
        ON CONFLICT (subject_did, source_did) DO UPDATE SET
          label_value = EXCLUDED.label_value,
          labeled_at  = EXCLUDED.labeled_at,
          synced_at   = NOW()
      `;
    }
  });
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
 */
export async function upsertPdsHosts(
  entries: Array<{ did: string; host: string }>
): Promise<void> {
  if (entries.length === 0) return;
  await sql`
    INSERT INTO pds_hosts ${sql(entries.map((e) => ({ did: e.did, host: e.host, fetched_at: new Date() })))}
    ON CONFLICT (did) DO UPDATE SET host = EXCLUDED.host, fetched_at = EXCLUDED.fetched_at
  `;
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
