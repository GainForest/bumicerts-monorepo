/**
 * GraphQL namespace: hypercerts
 *
 * Every paginated query accepts:
 *   cursor, limit, did, handle, sortBy, order
 *
 * The `activities` query additionally accepts:
 *   labelTier – filter to records whose author DID has a specific Hyperlabel
 *               quality tier: "high-quality" | "standard" | "draft" | "likely-test"
 */

import { builder } from "../builder.ts";
import {
  PageInfoType, RecordMetaType, BlobRefType, StrongRefType,
  SortOrderEnum, SortFieldEnum,
  rowToMeta, payload, extractBlobRef, extractStrongRef, extractStrongRefs,
  resolveBlobsInValue,
  fetchCollectionPage, toPageInfo, WhereInputRef,
  ActivityWhereInputRef, activityWhereToFilter, activityWhereHasText,
} from "../types.ts";
import type { ActivityWhereInput } from "../types.ts";
import { getRecordsByCollection, getLabelsByDids, getActivityLabelDids, searchActivities } from "@/db/queries.ts";
import { resolveActorToDid } from "../identity.ts";
import { getPdsHostsBatch } from "@/identity/pds.ts";
import { refreshLabelsAsync, HYPERLABEL_DID } from "@/labeller/hyperlabel.ts";
import type { RecordRow } from "@/db/types.ts";

// JSONB accessors
const s = (p: Record<string, unknown>, k: string): string | null => {
  const v = p[k]; if (v == null) return null;
  return typeof v === "string" ? v : String(v);
};
const arr = (p: Record<string, unknown>, k: string): string[] | null => {
  const v = p[k]; return Array.isArray(v) ? v.map(String) : null;
};
const j = (p: Record<string, unknown>, k: string): unknown => p[k] ?? null;

class HypercertsNS {}
class HcHelperNS {}

// ── Leaf types ──

/**
 * RecordMeta extended with an optional labelTier for activity records.
 * Keeps the shared RecordMetaType clean while surfacing the tier directly
 * on meta so callers don't have to traverse the separate `label` object.
 */
const HcActivityMetaType = builder.simpleObject("HcActivityMeta", {
  description: "AT Protocol envelope fields for an activity record, including optional Hyperlabel tier.",
  fields: (t) => ({
    uri:        t.string({ description: "Full AT-URI (at://did/collection/rkey)" }),
    did:        t.string({ description: "DID of the record author" }),
    collection: t.string({ description: "Lexicon collection NSID" }),
    rkey:       t.string({ description: "Record key (TID or literal)" }),
    cid:        t.string({ description: "Content hash (CID)" }),
    indexedAt:  t.field({ type: "DateTime", description: "When the indexer stored this record" }),
    createdAt:  t.field({ type: "DateTime", nullable: true, description: "Creation time from record payload" }),
    labelTier:  t.string({
      nullable: true,
      description: "Hyperlabel quality tier for this record's author: high-quality | standard | draft | likely-test. Null if the author has not been labelled yet.",
    }),
  }),
});

/**
 * Quality label attached to an activity record.
 * Sourced from the Hyperlabel labeller (einstein.climateai.org).
 * May be null if the record author has not been labelled yet — the
 * indexer refreshes labels asynchronously in the background.
 */
const HcActivityLabelType = builder.simpleObject("HcActivityLabel", {
  description: "Quality label from the Hyperlabel labeller (einstein.climateai.org).",
  fields: (t) => ({
    tier:      t.string({ description: "Quality tier: high-quality | standard | draft | likely-test" }),
    labeler:   t.string({ description: "DID of the labeller that issued this label" }),
    labeledAt: t.field({ type: "DateTime", nullable: true, description: "When the labeller applied this label" }),
    syncedAt:  t.field({ type: "DateTime", description: "When the indexer last synced this label" }),
  }),
});

const HcActivityType = builder.simpleObject("HcActivity", {
  description: "A Hypercerts claim activity (org.hypercerts.claim.activity).",
  fields: (t) => ({
    meta:                   t.field({ type: HcActivityMetaType }),
    title:                  t.string({ nullable: true }),
    shortDescription:       t.string({ nullable: true }),
    shortDescriptionFacets: t.field({ type: "JSON", nullable: true }),
    description:            t.string({ nullable: true }),
    descriptionFacets:      t.field({ type: "JSON", nullable: true }),
    image:                  t.field({ type: "JSON", nullable: true }),
    workScope:              t.field({ type: "JSON", nullable: true }),
    startDate:              t.field({ type: "DateTime", nullable: true }),
    endDate:                t.field({ type: "DateTime", nullable: true }),
    contributors:           t.field({ type: "JSON", nullable: true }),
    rights:                 t.field({ type: StrongRefType, nullable: true }),
    locations:              t.field({ type: [StrongRefType], nullable: true }),
    createdAt:              t.field({ type: "DateTime", nullable: true }),
    label:                  t.field({
      type: HcActivityLabelType,
      nullable: true,
      description: "Quality label from Hyperlabel (null if author not yet labelled)",
    }),
  }),
});
const HcActivityPageType = builder.simpleObject("HcActivityPage", {
  fields: (t) => ({ records: t.field({ type: [HcActivityType] }), pageInfo: t.field({ type: PageInfoType }) }),
});

const HcCollectionType = builder.simpleObject("HcCollection", {
  description: "A Hypercerts claim collection (org.hypercerts.claim.collection).",
  fields: (t) => ({
    meta:             t.field({ type: RecordMetaType }),
    title:            t.string({ nullable: true }),
    shortDescription: t.string({ nullable: true }),
    avatar:           t.field({ type: BlobRefType, nullable: true }),
    coverPhoto:       t.field({ type: BlobRefType, nullable: true }),
    activities:       t.field({ type: "JSON", nullable: true }),
    createdAt:        t.field({ type: "DateTime", nullable: true }),
  }),
});
const HcCollectionPageType = builder.simpleObject("HcCollectionPage", {
  fields: (t) => ({ records: t.field({ type: [HcCollectionType] }), pageInfo: t.field({ type: PageInfoType }) }),
});

const HcEvaluationType = builder.simpleObject("HcEvaluation", {
  description: "A Hypercerts claim evaluation (org.hypercerts.claim.evaluation).",
  fields: (t) => ({
    meta:         t.field({ type: RecordMetaType }),
    subject:      t.field({ type: StrongRefType, nullable: true }),
    evaluators:   t.stringList({ nullable: true }),
    content:      t.field({ type: "JSON", nullable: true }),
    measurements: t.field({ type: [StrongRefType], nullable: true }),
    summary:      t.string({ nullable: true }),
    score:        t.field({ type: "JSON", nullable: true }),
    location:     t.field({ type: StrongRefType, nullable: true }),
    createdAt:    t.field({ type: "DateTime", nullable: true }),
  }),
});
const HcEvaluationPageType = builder.simpleObject("HcEvaluationPage", {
  fields: (t) => ({ records: t.field({ type: [HcEvaluationType] }), pageInfo: t.field({ type: PageInfoType }) }),
});

const HcMeasurementType = builder.simpleObject("HcMeasurement", {
  description: "A Hypercerts claim measurement (org.hypercerts.claim.measurement).",
  fields: (t) => ({
    meta:        t.field({ type: RecordMetaType }),
    subject:     t.field({ type: StrongRefType, nullable: true }),
    measurers:   t.stringList({ nullable: true }),
    metric:      t.string({ nullable: true }),
    value:       t.string({ nullable: true }),
    methodType:  t.string({ nullable: true }),
    methodURI:   t.string({ nullable: true }),
    evidenceURI: t.stringList({ nullable: true }),
    location:    t.field({ type: StrongRefType, nullable: true }),
    createdAt:   t.field({ type: "DateTime", nullable: true }),
  }),
});
const HcMeasurementPageType = builder.simpleObject("HcMeasurementPage", {
  fields: (t) => ({ records: t.field({ type: [HcMeasurementType] }), pageInfo: t.field({ type: PageInfoType }) }),
});

const HcRightsType = builder.simpleObject("HcRights", {
  description: "A Hypercerts claim rights record (org.hypercerts.claim.rights).",
  fields: (t) => ({
    meta:              t.field({ type: RecordMetaType }),
    rightsName:        t.string({ nullable: true }),
    rightsType:        t.string({ nullable: true }),
    rightsDescription: t.string({ nullable: true }),
    attachment:        t.field({ type: "JSON", nullable: true }),
    createdAt:         t.field({ type: "DateTime", nullable: true }),
  }),
});
const HcRightsPageType = builder.simpleObject("HcRightsPage", {
  fields: (t) => ({ records: t.field({ type: [HcRightsType] }), pageInfo: t.field({ type: PageInfoType }) }),
});

const HcFundingReceiptType = builder.simpleObject("HcFundingReceipt", {
  description: "A Hypercerts funding receipt (org.hypercerts.funding.receipt).",
  fields: (t) => ({
    meta:           t.field({ type: RecordMetaType }),
    from:           t.string({ nullable: true }),
    to:             t.string({ nullable: true }),
    amount:         t.string({ nullable: true }),
    currency:       t.string({ nullable: true }),
    paymentRail:    t.string({ nullable: true }),
    paymentNetwork: t.string({ nullable: true }),
    transactionId:  t.string({ nullable: true }),
    for:            t.string({ nullable: true }),
    notes:          t.string({ nullable: true }),
    occurredAt:     t.field({ type: "DateTime", nullable: true }),
    createdAt:      t.field({ type: "DateTime", nullable: true }),
  }),
});
const HcFundingReceiptPageType = builder.simpleObject("HcFundingReceiptPage", {
  fields: (t) => ({ records: t.field({ type: [HcFundingReceiptType] }), pageInfo: t.field({ type: PageInfoType }) }),
});

// ── New types ──

// ── Acknowledgement ──
const HcAcknowledgementType = builder.simpleObject("HcAcknowledgement", {
  description: "Acknowledges inclusion of one record within another (org.hypercerts.acknowledgement).",
  fields: (t) => ({
    meta:         t.field({ type: RecordMetaType }),
    subject:      t.field({ type: StrongRefType, nullable: true }),
    context:      t.field({ type: StrongRefType, nullable: true }),
    acknowledged: t.boolean({ nullable: true }),
    comment:      t.string({ nullable: true }),
    createdAt:    t.field({ type: "DateTime", nullable: true }),
  }),
});
const HcAcknowledgementPageType = builder.simpleObject("HcAcknowledgementPage", {
  fields: (t) => ({ records: t.field({ type: [HcAcknowledgementType] }), pageInfo: t.field({ type: PageInfoType }) }),
});

// ── Attachment ──
const HcAttachmentType = builder.simpleObject("HcAttachment", {
  description: "An attachment providing commentary, context, or evidence (org.hypercerts.claim.attachment).",
  fields: (t) => ({
    meta:                   t.field({ type: RecordMetaType }),
    subjects:               t.field({ type: [StrongRefType], nullable: true }),
    contentType:            t.string({ nullable: true }),
    content:                t.field({ type: "JSON", nullable: true }),
    title:                  t.string({ nullable: true }),
    shortDescription:       t.string({ nullable: true }),
    shortDescriptionFacets: t.field({ type: "JSON", nullable: true }),
    description:            t.string({ nullable: true }),
    descriptionFacets:      t.field({ type: "JSON", nullable: true }),
    location:               t.field({ type: StrongRefType, nullable: true }),
    createdAt:              t.field({ type: "DateTime", nullable: true }),
  }),
});
const HcAttachmentPageType = builder.simpleObject("HcAttachmentPage", {
  fields: (t) => ({ records: t.field({ type: [HcAttachmentType] }), pageInfo: t.field({ type: PageInfoType }) }),
});

// ── ContributionDetails ──
const HcContributionDetailsType = builder.simpleObject("HcContributionDetails", {
  description: "Details about a specific contribution (org.hypercerts.claim.contributionDetails).",
  fields: (t) => ({
    meta:                    t.field({ type: RecordMetaType }),
    role:                    t.string({ nullable: true }),
    contributionDescription: t.string({ nullable: true }),
    startDate:               t.field({ type: "DateTime", nullable: true }),
    endDate:                 t.field({ type: "DateTime", nullable: true }),
    createdAt:               t.field({ type: "DateTime", nullable: true }),
  }),
});
const HcContributionDetailsPageType = builder.simpleObject("HcContributionDetailsPage", {
  fields: (t) => ({ records: t.field({ type: [HcContributionDetailsType] }), pageInfo: t.field({ type: PageInfoType }) }),
});

// ── ContributorInformation ──
const HcContributorInformationType = builder.simpleObject("HcContributorInformation", {
  description: "Contributor information including identifier, display name, and image (org.hypercerts.claim.contributorInformation).",
  fields: (t) => ({
    meta:        t.field({ type: RecordMetaType }),
    identifier:  t.string({ nullable: true }),
    displayName: t.string({ nullable: true }),
    image:       t.field({ type: "JSON", nullable: true }),
    createdAt:   t.field({ type: "DateTime", nullable: true }),
  }),
});
const HcContributorInformationPageType = builder.simpleObject("HcContributorInformationPage", {
  fields: (t) => ({ records: t.field({ type: [HcContributorInformationType] }), pageInfo: t.field({ type: PageInfoType }) }),
});

// ── WorkScopeTag ──
const HcWorkScopeTagType = builder.simpleObject("HcWorkScopeTag", {
  description: "A reusable work scope atom for taxonomy (org.hypercerts.helper.workScopeTag).",
  fields: (t) => ({
    meta:              t.field({ type: RecordMetaType }),
    key:               t.string({ nullable: true }),
    label:             t.string({ nullable: true }),
    kind:              t.string({ nullable: true }),
    description:       t.string({ nullable: true }),
    parent:            t.field({ type: StrongRefType, nullable: true }),
    aliases:           t.stringList({ nullable: true }),
    externalReference: t.field({ type: "JSON", nullable: true }),
    createdAt:         t.field({ type: "DateTime", nullable: true }),
  }),
});
const HcWorkScopeTagPageType = builder.simpleObject("HcWorkScopeTagPage", {
  fields: (t) => ({ records: t.field({ type: [HcWorkScopeTagType] }), pageInfo: t.field({ type: PageInfoType }) }),
});

// ── Row mappers ──

async function mapActivity(
  row: RecordRow,
  label: { tier: string; labeler: string; labeledAt: string | null; syncedAt: string } | null = null,
) {
  const p = payload(row);
  return {
    meta: { ...rowToMeta(row), labelTier: label?.tier ?? null },
    title: s(p,"title"),
    shortDescription: s(p,"shortDescription"),
    shortDescriptionFacets: j(p,"shortDescriptionFacets"),
    description: s(p,"description"),
    descriptionFacets: j(p,"descriptionFacets"),
    image: await resolveBlobsInValue(j(p,"image"), row.did),
    workScope: j(p,"workScope"),
    startDate: s(p,"startDate"),
    endDate: s(p,"endDate"),
    contributors: j(p,"contributors"),
    rights: extractStrongRef(j(p,"rights")),
    locations: extractStrongRefs(j(p,"locations")),
    createdAt: s(p,"createdAt"),
    label,
  };
}
async function mapCollection(row: RecordRow) {
  const p = payload(row);
  return {
    meta: rowToMeta(row), title: s(p,"title"),
    shortDescription: s(p,"shortDescription"),
    avatar:     await extractBlobRef(j(p,"avatar"),     row.did),
    coverPhoto: await extractBlobRef(j(p,"coverPhoto"), row.did),
    activities: j(p,"activities"), createdAt: s(p,"createdAt"),
  };
}
function mapEvaluation(row: RecordRow) {
  const p = payload(row);
  return {
    meta: rowToMeta(row),
    subject: extractStrongRef(j(p,"subject")),
    evaluators: arr(p,"evaluators"), content: j(p,"content"),
    measurements: extractStrongRefs(j(p,"measurements")),
    summary: s(p,"summary"), score: j(p,"score"),
    location: extractStrongRef(j(p,"location")),
    createdAt: s(p,"createdAt"),
  };
}
function mapMeasurement(row: RecordRow) {
  const p = payload(row);
  return {
    meta: rowToMeta(row),
    subject: extractStrongRef(j(p,"subject")),
    measurers: arr(p,"measurers"), metric: s(p,"metric"),
    value: s(p,"value"), methodType: s(p,"methodType"), methodURI: s(p,"methodURI"),
    evidenceURI: arr(p,"evidenceURI"),
    location: extractStrongRef(j(p,"location")),
    createdAt: s(p,"createdAt"),
  };
}
function mapRights(row: RecordRow) {
  const p = payload(row);
  return {
    meta: rowToMeta(row), rightsName: s(p,"rightsName"), rightsType: s(p,"rightsType"),
    rightsDescription: s(p,"rightsDescription"), attachment: j(p,"attachment"),
    createdAt: s(p,"createdAt"),
  };
}
function mapFundingReceipt(row: RecordRow) {
  const p = payload(row);
  const fromRaw = j(p,"from");
  const from = typeof fromRaw === "string"
    ? fromRaw
    : (fromRaw != null && typeof fromRaw === "object")
      ? (s(fromRaw as Record<string,unknown>, "did") ?? s(fromRaw as Record<string,unknown>, "$link") ?? null)
      : null;
  return {
    meta: rowToMeta(row), from, to: s(p,"to"), amount: s(p,"amount"),
    currency: s(p,"currency"), paymentRail: s(p,"paymentRail"),
    paymentNetwork: s(p,"paymentNetwork"), transactionId: s(p,"transactionId"),
    for: s(p,"for"), notes: s(p,"notes"),
    occurredAt: s(p,"occurredAt"), createdAt: s(p,"createdAt"),
  };
}

// ── New mappers ──

function mapAcknowledgement(row: RecordRow) {
  const p = payload(row);
  return {
    meta: rowToMeta(row),
    subject: extractStrongRef(j(p,"subject")),
    context: extractStrongRef(j(p,"context")),
    acknowledged: typeof p["acknowledged"] === "boolean" ? p["acknowledged"] : null,
    comment: s(p,"comment"),
    createdAt: s(p,"createdAt"),
  };
}

async function mapAttachment(row: RecordRow) {
  const p = payload(row);
  return {
    meta: rowToMeta(row),
    subjects: extractStrongRefs(j(p,"subjects")),
    contentType: s(p,"contentType"),
    content: await resolveBlobsInValue(j(p,"content"), row.did),
    title: s(p,"title"),
    shortDescription: s(p,"shortDescription"),
    shortDescriptionFacets: j(p,"shortDescriptionFacets"),
    description: s(p,"description"),
    descriptionFacets: j(p,"descriptionFacets"),
    location: extractStrongRef(j(p,"location")),
    createdAt: s(p,"createdAt"),
  };
}

function mapContributionDetails(row: RecordRow) {
  const p = payload(row);
  return {
    meta: rowToMeta(row),
    role: s(p,"role"),
    contributionDescription: s(p,"contributionDescription"),
    startDate: s(p,"startDate"),
    endDate: s(p,"endDate"),
    createdAt: s(p,"createdAt"),
  };
}

async function mapContributorInformation(row: RecordRow) {
  const p = payload(row);
  return {
    meta: rowToMeta(row),
    identifier: s(p,"identifier"),
    displayName: s(p,"displayName"),
    image: await resolveBlobsInValue(j(p,"image"), row.did),
    createdAt: s(p,"createdAt"),
  };
}

async function mapWorkScopeTag(row: RecordRow) {
  const p = payload(row);
  return {
    meta: rowToMeta(row),
    key: s(p,"key"),
    label: s(p,"label"),
    kind: s(p,"kind"),
    description: s(p,"description"),
    parent: extractStrongRef(j(p,"parent")),
    aliases: arr(p,"aliases"),
    externalReference: await resolveBlobsInValue(j(p,"externalReference"), row.did),
    createdAt: s(p,"createdAt"),
  };
}

// ── Helper namespace objectType ──

builder.objectType(HcHelperNS, {
  name: "HcHelperNamespace",
  description: "Hypercerts helper records (org.hypercerts.helper.*).",
  fields: (t) => ({
    workScopeTags: t.field({
      type: HcWorkScopeTagPageType,
      args: {
        cursor: t.arg.string(), limit: t.arg.int(),
        where: t.arg({ type: WhereInputRef, required: false }),
        sortBy: t.arg({ type: SortFieldEnum }), order: t.arg({ type: SortOrderEnum }),
      },
      resolve: async (_, args) => {
        const { cursor, limit, where, sortBy, order } = args;
        let resolvedDid: string | undefined;
        if (where?.handle) resolvedDid = await resolveActorToDid(where.handle);
        else if (where?.did) resolvedDid = where.did;
        const page = await getRecordsByCollection("org.hypercerts.helper.workScopeTag", {
          cursor: cursor ?? undefined, limit: limit ?? undefined, did: resolvedDid,
          sortField: (sortBy as "createdAt" | "indexedAt") ?? undefined,
          sortOrder: (order as "asc" | "desc") ?? undefined,
        });
        await getPdsHostsBatch([...new Set(page.records.map((r) => r.did))]);
        return { records: await Promise.all(page.records.map(mapWorkScopeTag)), pageInfo: toPageInfo(page.cursor) };
      },
    }),
  }),
});

// ── Namespace objectType ──

builder.objectType(HypercertsNS, {
  name: "HypercertsNamespace",
  description: "Hypercerts AT Protocol records (org.hypercerts.*).",
  fields: (t) => ({
    activities: t.field({
      type: HcActivityPageType,
      description:
        "Paginated list of org.hypercerts.claim.activity records. " +
        "When `where` contains no text-filter fields, returns all records ordered by time (sortBy/order apply). " +
        "When `where` contains any of title/shortDescription/description/text, runs a text search " +
        "(sortBy/order are ignored; results ordered by indexed_at DESC). " +
        "Combine with `labelTier` to intersect label and text filters.",
      args: {
        cursor:    t.arg.string(),
        limit:     t.arg.int(),
        where:     t.arg({ type: ActivityWhereInputRef, required: false }),
        sortBy:    t.arg({ type: SortFieldEnum, description: "Sort field when no text filter is present." }),
        order:     t.arg({ type: SortOrderEnum, description: "Sort direction when no text filter is present." }),
        labelTier: t.arg.string({
          description: "Filter by Hyperlabel quality tier: high-quality | standard | draft | likely-test",
        }),
      },
      resolve: async (_, args) => {
        const { cursor, limit, where, sortBy, order, labelTier } = args;

        // ── 1. Resolve actor to DID ──────────────────────────────
        let resolvedDid: string | undefined;
        if (where?.handle) resolvedDid = await resolveActorToDid(where.handle);
        else if (where?.did) resolvedDid = where.did;

        // ── 2. Optional labelTier pre-filter ────────────────────
        // Fetch the set of DIDs that carry this tier, then intersect
        // with any DID filter already requested.
        let allowedDids: Set<string> | null = null;
        if (labelTier) {
          allowedDids = await getActivityLabelDids(HYPERLABEL_DID, labelTier);
          if (resolvedDid) {
            if (allowedDids.has(resolvedDid)) {
              allowedDids = new Set([resolvedDid]);
            } else {
              return { records: [], pageInfo: { endCursor: null, hasNextPage: false } };
            }
          }
          if (allowedDids.size === 0) {
            return { records: [], pageInfo: { endCursor: null, hasNextPage: false } };
          }
        }

        // ── 3. Query records ─────────────────────────────────────
        // Two paths:
        //   a) where has text predicates → searchActivities (FTS / ILIKE, indexed_at DESC)
        //   b) no text predicates        → getRecordsByCollection (plain list, supports sortBy/order)
        //
        // For (b) with labelTier over multiple DIDs: post-filter in-memory
        // (the allowed-DIDs set is bounded by the labels table — small in practice).
        const safeLimit = Math.min(Math.max(limit ?? 50, 1), 100);
        let rows;
        let pageCursor: string | undefined;

        if (activityWhereHasText(where)) {
          // ── Path a: text search ──────────────────────────────
          const page = await searchActivities({
            filter: activityWhereToFilter(where as ActivityWhereInput),
            did:    allowedDids?.size === 1 ? [...allowedDids][0] : resolvedDid,
            limit:  safeLimit,
            cursor: cursor ?? undefined,
          });
          rows = allowedDids && allowedDids.size > 1
            ? page.records.filter((r) => allowedDids!.has(r.did))
            : page.records;
          pageCursor = page.cursor;
        } else {
          // ── Path b: plain list ───────────────────────────────
          if (allowedDids !== null && allowedDids.size > 1) {
            const page = await getRecordsByCollection("org.hypercerts.claim.activity", {
              cursor: cursor ?? undefined, limit: safeLimit,
              sortField: (sortBy as "createdAt" | "indexedAt") ?? undefined,
              sortOrder: (order  as "asc" | "desc")            ?? undefined,
            });
            rows = page.records.filter((r) => allowedDids!.has(r.did)).slice(0, safeLimit);
            pageCursor = page.cursor;
          } else {
            const singleDid = allowedDids?.size === 1 ? [...allowedDids][0] : resolvedDid;
            const page = await getRecordsByCollection("org.hypercerts.claim.activity", {
              cursor: cursor ?? undefined, limit: safeLimit, did: singleDid,
              sortField: (sortBy as "createdAt" | "indexedAt") ?? undefined,
              sortOrder: (order  as "asc" | "desc")            ?? undefined,
            });
            rows = page.records;
            pageCursor = page.cursor;
          }
        }

        // ── 4. Attach labels ─────────────────────────────────────
        const authorDids = [...new Set(rows.map((r) => r.did))];
        await getPdsHostsBatch(authorDids);
        const labelMap = await getLabelsByDids(authorDids, HYPERLABEL_DID);
        const records = await Promise.all(rows.map((row) => {
          const lRow = labelMap.get(row.did) ?? null;
          const label = lRow ? {
            tier:      lRow.label_value,
            labeler:   lRow.source_did,
            labeledAt: lRow.labeled_at?.toISOString() ?? null,
            syncedAt:  lRow.synced_at.toISOString(),
          } : null;
          return mapActivity(row, label);
        }));

        // ── 5. Fire-and-forget label refresh ────────────────────
        refreshLabelsAsync(authorDids);

        return { records, pageInfo: toPageInfo(pageCursor) };
      },
    }),
    collections: t.field({
      type: HcCollectionPageType,
      args: {
        cursor: t.arg.string(), limit: t.arg.int(),
        where: t.arg({ type: WhereInputRef, required: false }),
        sortBy: t.arg({ type: SortFieldEnum }), order: t.arg({ type: SortOrderEnum }),
      },
      resolve: async (_, args) => {
        const { cursor, limit, where, sortBy, order } = args;
        let resolvedDid: string | undefined;
        if (where?.handle) resolvedDid = await resolveActorToDid(where.handle);
        else if (where?.did) resolvedDid = where.did;
        const page = await getRecordsByCollection("org.hypercerts.claim.collection", {
          cursor: cursor ?? undefined, limit: limit ?? undefined, did: resolvedDid,
          sortField: (sortBy as "createdAt" | "indexedAt") ?? undefined,
          sortOrder: (order as "asc" | "desc") ?? undefined,
        });
        await getPdsHostsBatch([...new Set(page.records.map((r) => r.did))]);
        return { records: await Promise.all(page.records.map(mapCollection)), pageInfo: toPageInfo(page.cursor) };
      },
    }),
    evaluations: t.field({
      type: HcEvaluationPageType,
      args: {
        cursor: t.arg.string(), limit: t.arg.int(),
        where: t.arg({ type: WhereInputRef, required: false }),
        sortBy: t.arg({ type: SortFieldEnum }), order: t.arg({ type: SortOrderEnum }),
      },
      resolve: (_, args) => fetchCollectionPage("org.hypercerts.claim.evaluation", args, mapEvaluation),
    }),
    measurements: t.field({
      type: HcMeasurementPageType,
      args: {
        cursor: t.arg.string(), limit: t.arg.int(),
        where: t.arg({ type: WhereInputRef, required: false }),
        sortBy: t.arg({ type: SortFieldEnum }), order: t.arg({ type: SortOrderEnum }),
      },
      resolve: (_, args) => fetchCollectionPage("org.hypercerts.claim.measurement", args, mapMeasurement),
    }),
    rights: t.field({
      type: HcRightsPageType,
      args: {
        cursor: t.arg.string(), limit: t.arg.int(),
        where: t.arg({ type: WhereInputRef, required: false }),
        sortBy: t.arg({ type: SortFieldEnum }), order: t.arg({ type: SortOrderEnum }),
      },
      resolve: (_, args) => fetchCollectionPage("org.hypercerts.claim.rights", args, mapRights),
    }),
    fundingReceipts: t.field({
      type: HcFundingReceiptPageType,
      args: {
        cursor: t.arg.string(), limit: t.arg.int(),
        where: t.arg({ type: WhereInputRef, required: false }),
        sortBy: t.arg({ type: SortFieldEnum }), order: t.arg({ type: SortOrderEnum }),
      },
      resolve: (_, args) => fetchCollectionPage("org.hypercerts.funding.receipt", args, mapFundingReceipt),
    }),
    acknowledgements: t.field({
      type: HcAcknowledgementPageType,
      args: {
        cursor: t.arg.string(), limit: t.arg.int(),
        where: t.arg({ type: WhereInputRef, required: false }),
        sortBy: t.arg({ type: SortFieldEnum }), order: t.arg({ type: SortOrderEnum }),
      },
      resolve: (_, args) => fetchCollectionPage("org.hypercerts.acknowledgement", args, mapAcknowledgement),
    }),
    attachments: t.field({
      type: HcAttachmentPageType,
      args: {
        cursor: t.arg.string(), limit: t.arg.int(),
        where: t.arg({ type: WhereInputRef, required: false }),
        sortBy: t.arg({ type: SortFieldEnum }), order: t.arg({ type: SortOrderEnum }),
      },
      resolve: async (_, args) => {
        const { cursor, limit, where, sortBy, order } = args;
        let resolvedDid: string | undefined;
        if (where?.handle) resolvedDid = await resolveActorToDid(where.handle);
        else if (where?.did) resolvedDid = where.did;
        const page = await getRecordsByCollection("org.hypercerts.claim.attachment", {
          cursor: cursor ?? undefined, limit: limit ?? undefined, did: resolvedDid,
          sortField: (sortBy as "createdAt" | "indexedAt") ?? undefined,
          sortOrder: (order as "asc" | "desc") ?? undefined,
        });
        await getPdsHostsBatch([...new Set(page.records.map((r) => r.did))]);
        return { records: await Promise.all(page.records.map(mapAttachment)), pageInfo: toPageInfo(page.cursor) };
      },
    }),
    contributionDetails: t.field({
      type: HcContributionDetailsPageType,
      args: {
        cursor: t.arg.string(), limit: t.arg.int(),
        where: t.arg({ type: WhereInputRef, required: false }),
        sortBy: t.arg({ type: SortFieldEnum }), order: t.arg({ type: SortOrderEnum }),
      },
      resolve: (_, args) => fetchCollectionPage("org.hypercerts.claim.contributionDetails", args, mapContributionDetails),
    }),
    contributorInformation: t.field({
      type: HcContributorInformationPageType,
      args: {
        cursor: t.arg.string(), limit: t.arg.int(),
        where: t.arg({ type: WhereInputRef, required: false }),
        sortBy: t.arg({ type: SortFieldEnum }), order: t.arg({ type: SortOrderEnum }),
      },
      resolve: async (_, args) => {
        const { cursor, limit, where, sortBy, order } = args;
        let resolvedDid: string | undefined;
        if (where?.handle) resolvedDid = await resolveActorToDid(where.handle);
        else if (where?.did) resolvedDid = where.did;
        const page = await getRecordsByCollection("org.hypercerts.claim.contributorInformation", {
          cursor: cursor ?? undefined, limit: limit ?? undefined, did: resolvedDid,
          sortField: (sortBy as "createdAt" | "indexedAt") ?? undefined,
          sortOrder: (order as "asc" | "desc") ?? undefined,
        });
        await getPdsHostsBatch([...new Set(page.records.map((r) => r.did))]);
        return { records: await Promise.all(page.records.map(mapContributorInformation)), pageInfo: toPageInfo(page.cursor) };
      },
    }),
    helper: t.field({
      type: HcHelperNS,
      description: "Helper records (org.hypercerts.helper.*).",
      resolve: () => new HcHelperNS(),
    }),
  }),
});

builder.queryFields((t) => ({
  hypercerts: t.field({
    type: HypercertsNS,
    description: "All Hypercerts indexed records, grouped by namespace.",
    resolve: () => new HypercertsNS(),
  }),
}));
