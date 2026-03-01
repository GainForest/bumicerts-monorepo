/**
 * Shared GraphQL types and helpers used across all namespace resolvers.
 */

import { builder, SortOrderEnum, SortFieldEnum } from "./builder.ts";
import { getRecordsByCollection } from "@/db/queries.ts";
import type { RecordFilter, StringFilter } from "@/db/queries.ts";
import { resolveActorToDid } from "./identity.ts";
import { getPdsHost } from "@/identity/pds.ts";
import { normalizeBlob } from "@/tap/blobs.ts";
import type { RecordRow } from "@/db/types.ts";

// Re-export enums so resolvers can import from one place
export { SortOrderEnum, SortFieldEnum };

// ---------------------------------------------------------------
// PageInfo — pagination metadata (shared across all collections)
// ---------------------------------------------------------------

export const PageInfoType = builder.simpleObject("PageInfo", {
  description: "Cursor-based pagination metadata.",
  fields: (t) => ({
    endCursor: t.string({
      nullable: true,
      description: "Pass as `cursor` in the next request. Null when no more pages.",
    }),
    hasNextPage: t.boolean({
      description: "True if more records exist beyond this page.",
    }),
  }),
});

// ---------------------------------------------------------------
// RecordMeta — AT Protocol envelope fields present on every record
// ---------------------------------------------------------------

export const RecordMetaType = builder.simpleObject("RecordMeta", {
  description: "AT Protocol envelope fields present on every indexed record.",
  fields: (t) => ({
    uri:        t.string({ description: "Full AT-URI (at://did/collection/rkey)" }),
    did:        t.string({ description: "DID of the record author" }),
    collection: t.string({ description: "Lexicon collection NSID" }),
    rkey:       t.string({ description: "Record key (TID or literal)" }),
    cid:        t.string({ description: "Content hash (CID)" }),
    indexedAt:  t.field({ type: "DateTime", description: "When the indexer stored this record" }),
    createdAt:  t.field({ type: "DateTime", nullable: true, description: "Creation time from record payload" }),
  }),
});

// ---------------------------------------------------------------
// BlobRef — extracted blob pointer with full metadata
// ---------------------------------------------------------------

export const BlobRefType = builder.simpleObject("BlobRef", {
  description: "A blob reference with a resolved URI for fetching directly from the PDS.",
  fields: (t) => ({
    uri:      t.string({
      description: "Full URI to fetch the blob (e.g. https://pds.example.com/xrpc/com.atproto.sync.getBlob?did=...&cid=...). May be 'https://unknown.invalid/...' if the DID's PDS could not be resolved.",
    }),
    cid:      t.string({ description: "Content identifier (CID) of the blob" }),
    mimeType: t.string({ nullable: true, description: "MIME type of the blob (e.g. image/jpeg, audio/mpeg)" }),
    size:     t.int({ nullable: true, description: "Size of the blob in bytes" }),
  }),
});

// ---------------------------------------------------------------
// StrongRef — AT Protocol strong reference (uri + cid)
// ---------------------------------------------------------------

export const StrongRefType = builder.simpleObject("StrongRef", {
  description: "An AT Protocol strong reference (URI + CID for version-pinned linking).",
  fields: (t) => ({
    uri: t.string({ description: "AT-URI of the referenced record" }),
    cid: t.string({ description: "CID of the referenced record version" }),
  }),
});

// ---------------------------------------------------------------
// ImpactIndexer SubjectRef — review subject reference
// ---------------------------------------------------------------

export const IiSubjectRefType = builder.simpleObject("IiSubjectRef", {
  description: "A review subject reference (record, user, PDS, or lexicon).",
  fields: (t) => ({
    uri:  t.string({ description: "Subject identifier (AT-URI, DID, hostname, or NSID)" }),
    type: t.string({ description: "Subject type: record | user | pds | lexicon" }),
    cid:  t.string({ nullable: true, description: "Optional CID to pin to a specific record version" }),
  }),
});

// ---------------------------------------------------------------
// Shared helpers used by namespace resolvers
// ---------------------------------------------------------------

/** Extract the AT Protocol envelope from a DB row. */
export function rowToMeta(row: RecordRow) {
  return {
    uri:        row.uri,
    did:        row.did,
    collection: row.collection,
    rkey:       row.rkey,
    cid:        row.cid,
    indexedAt:  row.indexed_at.toISOString(),
    createdAt:  row.created_at?.toISOString() ?? null,
  };
}

/** Cast the JSONB record payload to a plain object for field access. */
export function payload(row: RecordRow): Record<string, unknown> {
  return (row.record ?? {}) as Record<string, unknown>;
}

/** Build the pageInfo shape from a DB page cursor. */
export function toPageInfo(cursor: string | undefined) {
  return {
    endCursor:   cursor ?? null,
    hasNextPage: cursor !== undefined,
  };
}

/**
 * Arguments accepted by every paginated collection query field.
 * - cursor:  opaque keyset pagination token (from pageInfo.endCursor)
 * - limit:   page size (1–100, default 50)
 * - where:   identity filter — { did?, handle?, and?, or?, not? }
 * - sortBy:  which timestamp field to sort on (CREATED_AT | INDEXED_AT)
 * - order:   sort direction (DESC | ASC)
 */
export interface CollectionQueryArgs {
  cursor?: string | null;
  limit?: number | null;
  where?: WhereInput | null;
  sortBy?: string | null;   // SortField enum value ("createdAt" | "indexedAt")
  order?: string | null;    // SortOrder enum value ("desc" | "asc")
}

/**
 * Shared fetch helper used by all namespace resolvers.
 * Handles:
 *   - handle → DID resolution via the Bluesky AppView API
 *   - Cursor / limit / sort forwarding to getRecordsByCollection
 *   - Mapping each DB row to a typed resolver return shape
 */
export async function fetchCollectionPage<T>(
  collection: string,
  args: CollectionQueryArgs,
  mapper: (row: RecordRow) => T | Promise<T>
): Promise<{ records: T[]; pageInfo: { endCursor: string | null; hasNextPage: boolean } }> {
  const { cursor, limit, where, sortBy, order } = args;

  // Resolve actor → DID from where.handle > where.did
  let resolvedDid: string | undefined;
  if (where?.handle) {
    resolvedDid = await resolveActorToDid(where.handle);
  } else if (where?.did) {
    resolvedDid = where.did;
  }

  const page = await getRecordsByCollection(collection, {
    cursor:    cursor ?? undefined,
    limit:     limit  ?? undefined,
    did:       resolvedDid,
    sortField: (sortBy as "createdAt" | "indexedAt") ?? undefined,
    sortOrder: (order  as "asc" | "desc")            ?? undefined,
  });

  return {
    records:  await Promise.all(page.records.map(mapper)),
    pageInfo: toPageInfo(page.cursor),
  };
}

/**
 * Extract and resolve a blob reference from a record field.
 *
 * Handles both formats:
 *   - New (normalized): { $type: "blob", cid: "Qm...", mimeType, size }
 *   - Old (decoded):    { $type: "blob", ref: { hash: {...} }, mimeType, size }
 *
 * Also handles wrapper objects where the blob is nested:
 *   { image: { $type: "blob", ... } }
 *   { file:  { $type: "blob", ... } }
 *   etc.
 *
 * Builds the URI using the PDS host for the DID (from cache or plc.directory).
 */
export async function extractBlobRef(
  raw: unknown,
  did: string,
): Promise<{ uri: string; cid: string; mimeType: string | null; size: number | null } | null> {
  if (raw == null || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;

  // Find the actual blob object — may be direct or wrapped under a key
  let blob: Record<string, unknown> | null = null;
  if (obj["$type"] === "blob") {
    blob = obj;
  } else {
    for (const key of ["file", "image", "blob", "audio", "video", "spectrogram"]) {
      const v = obj[key];
      if (v != null && typeof v === "object" && (v as Record<string, unknown>)["$type"] === "blob") {
        blob = v as Record<string, unknown>;
        break;
      }
    }
  }
  if (!blob) return null;

  // Extract CID — prefer string form, fall back to byte-array conversion
  let cid: string | null = null;
  if (typeof blob["cid"] === "string") {
    cid = blob["cid"];
  } else if (blob["ref"] != null) {
    const normalized = normalizeBlob(blob);
    cid = normalized?.cid ?? null;
  }
  if (!cid) return null;

  const mimeType = typeof blob["mimeType"] === "string" ? blob["mimeType"] : null;
  const size = typeof blob["size"] === "number" ? blob["size"] : null;

  // Build URI using cached PDS host
  const host = await getPdsHost(did);
  const uri = `${host}/xrpc/com.atproto.sync.getBlob?did=${encodeURIComponent(did)}&cid=${encodeURIComponent(cid)}`;

  return { uri, cid, mimeType, size };
}

/**
 * Resolve any blob objects nested anywhere inside a JSON value by injecting
 * a `uri` field built from the DID's PDS host.
 *
 * Used for union fields (e.g. uri | blob) where we want to keep the full
 * JSON shape but still surface a fetchable URL for blob variants.
 *
 * - A direct blob `{ $type:"blob", cid, mimeType, size }` becomes
 *   `{ $type:"blob", uri, cid, mimeType, size }`.
 * - A non-blob scalar/object is returned unchanged.
 * - Arrays are mapped recursively.
 * - null / undefined → null.
 */
export async function resolveBlobsInValue(raw: unknown, did: string): Promise<unknown> {
  if (raw == null) return null;
  if (Array.isArray(raw)) {
    return Promise.all(raw.map((item) => resolveBlobsInValue(item, did)));
  }
  if (typeof raw !== "object") return raw;
  const obj = raw as Record<string, unknown>;
  if (obj["$type"] === "blob") {
    const resolved = await extractBlobRef(obj, did);
    if (!resolved) return obj; // can't resolve — return as-is
    return { $type: "blob", uri: resolved.uri, cid: resolved.cid, mimeType: resolved.mimeType, size: resolved.size };
  }
  // Recurse into plain objects
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    result[key] = await resolveBlobsInValue(value, did);
  }
  return result;
}

/**
 * Extract a strong reference {uri, cid} from a raw value.
 * AT Protocol strong refs look like: { uri: "at://...", cid: "bafy..." }
 */
export function extractStrongRef(
  raw: unknown
): { uri: string; cid: string } | null {
  if (raw == null || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj["uri"] === "string" && typeof obj["cid"] === "string") {
    return { uri: obj["uri"], cid: obj["cid"] };
  }
  return null;
}

/**
 * Extract an array of strong references from a raw array value.
 */
export function extractStrongRefs(raw: unknown): Array<{ uri: string; cid: string }> {
  if (!Array.isArray(raw)) return [];
  return raw.map(extractStrongRef).filter((r): r is { uri: string; cid: string } => r !== null);
}

/**
 * Extract an ImpactIndexer subjectRef {uri, type, cid?} from a raw value.
 */
export function extractIiSubjectRef(
  raw: unknown
): { uri: string; type: string; cid: string | null } | null {
  if (raw == null || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj["uri"] === "string" && typeof obj["type"] === "string") {
    return {
      uri:  obj["uri"],
      type: obj["type"],
      cid:  typeof obj["cid"] === "string" ? obj["cid"] : null,
    };
  }
  return null;
}

// ---------------------------------------------------------------
// StringFilterInput — per-field match-mode selector
// ---------------------------------------------------------------

/**
 * Four match modes for a string field.  All comparisons are
 * case-insensitive.  Supplying more than one mode on the same object
 * combines them with AND (e.g. startsWith + endsWith → ILIKE 'A%' AND ILIKE '%Z').
 */
interface StringFilterInput {
  /** Exact case-insensitive match  (lower(col) = lower(value)). */
  equals?: string | null;
  /** Value must begin with this prefix  (ILIKE 'value%'). */
  startsWith?: string | null;
  /** Value must end with this suffix    (ILIKE '%value'). */
  endsWith?: string | null;
  /** Value must contain this substring  (ILIKE '%value%'). */
  includes?: string | null;
}

const StringFilterInputRef = builder.inputRef<StringFilterInput>("StringFilterInput");

StringFilterInputRef.implement({
  description:
    "Case-insensitive string match filter. " +
    "All provided modes are combined with AND. " +
    "e.g. { startsWith: \"carbon\", endsWith: \"forest\" } matches strings that begin with " +
    "\"carbon\" AND end with \"forest\".",
  fields: (t) => ({
    equals: t.string({
      required: false,
      description: "Exact case-insensitive equality (lower(col) = lower(value)).",
    }),
    startsWith: t.string({
      required: false,
      description: "Value must begin with this prefix (ILIKE 'value%').",
    }),
    endsWith: t.string({
      required: false,
      description: "Value must end with this suffix (ILIKE '%value').",
    }),
    includes: t.string({
      required: false,
      description: "Value must contain this substring (ILIKE '%value%').",
    }),
  }),
});

export { StringFilterInputRef };
export type { StringFilterInput };

// ---------------------------------------------------------------
// WhereInput — identity filter used on every collection query
// ---------------------------------------------------------------

/**
 * Identity filter accepted by every paginated collection query.
 * Use `did` to restrict to a specific author DID.
 * Use `handle` to resolve an AT Protocol handle to its DID (takes precedence over `did`).
 * Boolean combinators (`and` / `or` / `not`) allow composing multiple identity conditions.
 */
interface WhereInput {
  did?:    string | null;
  handle?: string | null;
  and?: WhereInput[] | null;
  or?:  WhereInput[] | null;
  not?: WhereInput  | null;
}

const WhereInputRef = builder.inputRef<WhereInput>("WhereInput");

WhereInputRef.implement({
  description:
    "Filter records by author identity. " +
    "`handle` takes precedence over `did` if both are supplied. " +
    "Combine conditions with `and` / `or` / `not`.",
  fields: (t) => ({
    did: t.string({
      required: false,
      description: "Filter to records authored by this DID (e.g. did:plc:abc123).",
    }),
    handle: t.string({
      required: false,
      description:
        "Filter by AT Protocol handle (e.g. gainforest.bsky.social). " +
        "Resolved to a DID via the Bluesky AppView API (cached 10 min). " +
        "Takes precedence over `did` if both are supplied.",
    }),
    and: t.field({
      type: [WhereInputRef],
      required: false,
      description: "All child filters must match (logical AND).",
    }),
    or: t.field({
      type: [WhereInputRef],
      required: false,
      description: "At least one child filter must match (logical OR).",
    }),
    not: t.field({
      type: WhereInputRef,
      required: false,
      description: "The child filter must NOT match (logical NOT).",
    }),
  }),
});

export { WhereInputRef };
export type { WhereInput };

// ---------------------------------------------------------------
// ActivityWhereInput — identity + text filters for activities
// ---------------------------------------------------------------

/**
 * Filter for org.hypercerts.claim.activity queries.
 * Combines identity filtering (did/handle) with searchable text fields
 * specific to activity records (title, shortDescription, description, text).
 */
interface ActivityWhereInput {
  // identity
  did?:    string | null;
  handle?: string | null;
  // text field filters
  title?:            StringFilterInput | null;
  shortDescription?: StringFilterInput | null;
  description?:      StringFilterInput | null;
  /** Full-text search across title, shortDescription and description (tsvector). */
  text?:             string | null;
  // boolean combinators
  and?: ActivityWhereInput[] | null;
  or?:  ActivityWhereInput[] | null;
  not?: ActivityWhereInput  | null;
}

const ActivityWhereInputRef = builder.inputRef<ActivityWhereInput>("ActivityWhereInput");

ActivityWhereInputRef.implement({
  description:
    "Filter for activity records. " +
    "Use `did` / `handle` to filter by author. " +
    "Use `title`, `shortDescription`, `description` (StringFilter) for field-level search, " +
    "or `text` for full-text search across all three fields at once. " +
    "Combine with `and` / `or` / `not` for boolean logic.",
  fields: (t) => ({
    did: t.string({ required: false, description: "Filter to records authored by this DID." }),
    handle: t.string({
      required: false,
      description: "Filter by AT Protocol handle. Resolved to a DID (takes precedence over `did`).",
    }),
    title: t.field({
      type: StringFilterInputRef, required: false,
      description: "Filter on `title`. Supports equals, startsWith, endsWith, includes.",
    }),
    shortDescription: t.field({
      type: StringFilterInputRef, required: false,
      description: "Filter on `shortDescription`. Supports equals, startsWith, endsWith, includes.",
    }),
    description: t.field({
      type: StringFilterInputRef, required: false,
      description: "Filter on `description`. Supports equals, startsWith, endsWith, includes.",
    }),
    text: t.string({
      required: false,
      description:
        "Full-text search across title, shortDescription and description simultaneously " +
        "(PostgreSQL websearch_to_tsquery). Supports quoted phrases and minus-negation.",
    }),
    and: t.field({ type: [ActivityWhereInputRef], required: false, description: "All child filters must match." }),
    or:  t.field({ type: [ActivityWhereInputRef], required: false, description: "At least one child filter must match." }),
    not: t.field({ type: ActivityWhereInputRef,   required: false, description: "The child filter must NOT match." }),
  }),
});

export { ActivityWhereInputRef };
export type { ActivityWhereInput };

// ---------------------------------------------------------------
// OrgInfoWhereInput — identity + text filters for organization infos
// ---------------------------------------------------------------

/**
 * Filter for app.gainforest.organization.info queries.
 * Combines identity filtering (did/handle) with searchable text fields
 * specific to organization info records (displayName, shortDescription, longDescription, text).
 */
interface OrgInfoWhereInput {
  // identity
  did?:    string | null;
  handle?: string | null;
  // text field filters — named after the actual record fields
  displayName?:      StringFilterInput | null;
  shortDescription?: StringFilterInput | null;
  longDescription?:  StringFilterInput | null;
  /** Full-text search across displayName, shortDescription and longDescription (tsvector). */
  text?:             string | null;
  // boolean combinators
  and?: OrgInfoWhereInput[] | null;
  or?:  OrgInfoWhereInput[] | null;
  not?: OrgInfoWhereInput  | null;
}

const OrgInfoWhereInputRef = builder.inputRef<OrgInfoWhereInput>("OrgInfoWhereInput");

OrgInfoWhereInputRef.implement({
  description:
    "Filter for organization info records. " +
    "Use `did` / `handle` to filter by author. " +
    "Use `displayName`, `shortDescription`, `longDescription` (StringFilter) for field-level search, " +
    "or `text` for full-text search across all three fields at once. " +
    "Combine with `and` / `or` / `not` for boolean logic.",
  fields: (t) => ({
    did: t.string({ required: false, description: "Filter to records authored by this DID." }),
    handle: t.string({
      required: false,
      description: "Filter by AT Protocol handle. Resolved to a DID (takes precedence over `did`).",
    }),
    displayName: t.field({
      type: StringFilterInputRef, required: false,
      description: "Filter on `displayName`. Supports equals, startsWith, endsWith, includes.",
    }),
    shortDescription: t.field({
      type: StringFilterInputRef, required: false,
      description: "Filter on `shortDescription`. Supports equals, startsWith, endsWith, includes.",
    }),
    longDescription: t.field({
      type: StringFilterInputRef, required: false,
      description: "Filter on `longDescription`. Supports equals, startsWith, endsWith, includes.",
    }),
    text: t.string({
      required: false,
      description:
        "Full-text search across displayName, shortDescription and longDescription simultaneously " +
        "(PostgreSQL websearch_to_tsquery). Supports quoted phrases and minus-negation.",
    }),
    and: t.field({ type: [OrgInfoWhereInputRef], required: false, description: "All child filters must match." }),
    or:  t.field({ type: [OrgInfoWhereInputRef], required: false, description: "At least one child filter must match." }),
    not: t.field({ type: OrgInfoWhereInputRef,   required: false, description: "The child filter must NOT match." }),
  }),
});

export { OrgInfoWhereInputRef };
export type { OrgInfoWhereInput };

// ---------------------------------------------------------------
// Helpers: convert specialised WhereInputs → RecordFilter for DB
// ---------------------------------------------------------------

/** Convert a GraphQL StringFilterInput to the DB StringFilter shape. */
function toStringFilter(v: StringFilterInput | null | undefined): StringFilter | null {
  if (v == null) return null;
  const out: StringFilter = {};
  if (v.equals     != null) out.equals     = v.equals;
  if (v.startsWith != null) out.startsWith = v.startsWith;
  if (v.endsWith   != null) out.endsWith   = v.endsWith;
  if (v.includes   != null) out.includes   = v.includes;
  return Object.keys(out).length > 0 ? out : null;
}

/** Convert an ActivityWhereInput into the RecordFilter expected by searchActivities. */
export function activityWhereToFilter(w: ActivityWhereInput): RecordFilter {
  const filter: RecordFilter = {};
  const t = toStringFilter;
  if (w.title            != null) { const v = t(w.title);            if (v) filter.title            = v; }
  if (w.shortDescription != null) { const v = t(w.shortDescription); if (v) filter.shortDescription = v; }
  if (w.description      != null) { const v = t(w.description);      if (v) filter.description      = v; }
  if (w.text             != null) filter.text = w.text;
  if (w.and?.length) filter.and = w.and.map(activityWhereToFilter);
  if (w.or?.length)  filter.or  = w.or.map(activityWhereToFilter);
  if (w.not != null) filter.not = activityWhereToFilter(w.not);
  return filter;
}

/** Convert an OrgInfoWhereInput into the RecordFilter expected by searchOrganizations. */
export function orgInfoWhereToFilter(w: OrgInfoWhereInput): RecordFilter {
  const filter: RecordFilter = {};
  const t = toStringFilter;
  // Map OrgInfo field names → the RecordFilter field names used by ORG_INFO_FILTER_CONFIG
  // (title → displayName column, description → longDescription column)
  if (w.displayName      != null) { const v = t(w.displayName);      if (v) filter.title       = v; }
  if (w.shortDescription != null) { const v = t(w.shortDescription); if (v) filter.shortDescription = v; }
  if (w.longDescription  != null) { const v = t(w.longDescription);  if (v) filter.description  = v; }
  if (w.text             != null) filter.text = w.text;
  if (w.and?.length) filter.and = w.and.map(orgInfoWhereToFilter);
  if (w.or?.length)  filter.or  = w.or.map(orgInfoWhereToFilter);
  if (w.not != null) filter.not = orgInfoWhereToFilter(w.not);
  return filter;
}

/** True when an ActivityWhereInput has any text-search predicates. */
export function activityWhereHasText(w: ActivityWhereInput | null | undefined): boolean {
  if (w == null) return false;
  if (w.title != null || w.shortDescription != null || w.description != null || w.text != null) return true;
  if (w.and?.some(activityWhereHasText)) return true;
  if (w.or?.some(activityWhereHasText))  return true;
  if (w.not != null && activityWhereHasText(w.not)) return true;
  return false;
}

/** True when an OrgInfoWhereInput has any text-search predicates. */
export function orgInfoWhereHasText(w: OrgInfoWhereInput | null | undefined): boolean {
  if (w == null) return false;
  if (w.displayName != null || w.shortDescription != null || w.longDescription != null || w.text != null) return true;
  if (w.and?.some(orgInfoWhereHasText)) return true;
  if (w.or?.some(orgInfoWhereHasText))  return true;
  if (w.not != null && orgInfoWhereHasText(w.not)) return true;
  return false;
}

// ---------------------------------------------------------------
// CollectionStat — counts per collection (for the stats query)
// ---------------------------------------------------------------

export const CollectionStatType = builder.simpleObject("CollectionStat", {
  description: "Record count for a single collection.",
  fields: (t) => ({
    collection: t.string({ description: "Lexicon collection NSID" }),
    count:      t.int({ description: "Number of indexed records" }),
  }),
});
