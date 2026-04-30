/**
 * Custom resolver: org.hypercerts.claim.activity
 *
 * Excluded from auto-generation because it requires:
 *   - ActivityWhereInput (text search on title/shortDescription/description)
 *   - Hyperlabel quality label metadata (labelTier, label object)
 *   - Custom HypercertsClaimActivityMetadata type (superset of RecordMeta)
 *
 * This file adds the `activity` field to the generated HypercertsClaimNS
 * class that was declared in generated.ts.
 */

import { builder } from "../../builder.ts";
import {
  RecordMetaType, StrongRefType, CreatorInfoType,
  SortOrderEnum, SortFieldEnum,
  ActivityWhereInputRef, activityWhereToFilter, activityWhereHasText,
  rowToMeta, payload, extractStrongRef, extractStrongRefs,
  resolveBlobsInValue, toPageInfo, resolveCreatorInfo,
  PageInfoType,
} from "../../types.ts";
import type { ActivityWhereInput } from "../../types.ts";
import {
  getRecordsByCollection, getLabelsByDids, getActivityLabelDids, searchActivities,
  getRecordsByDidRkeyPairs,
} from "@/db/queries.ts";
import { resolveActorToDid } from "../../identity.ts";
import { getPdsHostsBatch } from "@/identity/pds.ts";
import { LOCAL_LABELLER_SOURCE } from "@/labeller/index.ts";
import type { RecordRow } from "@/db/types.ts";

// Import the generated NS class token — Pothos merges multiple objectType()
// calls on the same class so we can attach `activity` here without conflicts.
import {
  HypercertsClaimNS,
  GainforestFundingConfigRecordType,
  mapGainforestFundingConfig,
} from "../generated.ts";

// JSONB accessors
const s = (p: Record<string, unknown>, k: string): string | null => {
  const v = p[k]; if (v == null) return null;
  return typeof v === "string" ? v : String(v);
};
const j = (p: Record<string, unknown>, k: string): unknown => p[k] ?? null;

// ── Special metadata type — Hyperlabel extras beyond the standard envelope ───

const HypercertsClaimActivityLabelType = builder.simpleObject("HypercertsClaimActivityLabel", {
  description: "Quality label for an activity record.",
  fields: (t) => ({
    tier:      t.string({ description: "Quality tier: high-quality | standard | draft | likely-test" }),
    labeler:   t.string({ description: "Identifier of the labeller that issued this label" }),
    labeledAt: t.field({ type: "DateTime", nullable: true, description: "When the label was applied" }),
    syncedAt:  t.field({ type: "DateTime", description: "When the label was last updated" }),
    score:     t.int({ nullable: true, description: "Quality score 0-100" }),
    breakdown: t.field({ type: "JSON", nullable: true, description: "Score breakdown by criteria" }),
  }),
});

const HypercertsClaimActivitySpecialMetadataType = builder.simpleObject("HypercertsClaimActivitySpecialMetadata", {
  description:
    "Quality metadata for an activity record. " +
    "Only present when the author's activity has been scored.",
  fields: (t) => ({
    labelTier: t.string({
      nullable: true,
      description:
        "Hyperlabel quality tier for this record's author: " +
        "high-quality | standard | draft | likely-test. " +
        "Null if the author has not been labelled yet.",
    }),
    label: t.field({
      type: HypercertsClaimActivityLabelType,
      nullable: true,
      description: "Full quality label object from Hyperlabel (null if author not yet labelled).",
    }),
  }),
});

// ── Pure record type (lexicon payload) ──────────────────────────────────────

const HypercertsClaimActivityRecordType = builder.simpleObject("HypercertsClaimActivityRecord", {
  description: "Pure payload for org.hypercerts.claim.activity.",
  fields: (t) => ({
    title:                  t.string({ nullable: true }),
    shortDescription:       t.string({ nullable: true }),
    shortDescriptionFacets: t.field({ type: "JSON", nullable: true }),
    description:            t.field({ type: "JSON", nullable: true, description: "Rich-text description as a Leaflet linear document" }),
    image:                  t.field({ type: "JSON", nullable: true }),
    workScope:              t.field({ type: "JSON", nullable: true, description: "Work scope: CEL expression or free-form string" }),
    startDate:              t.field({ type: "DateTime", nullable: true }),
    endDate:                t.field({ type: "DateTime", nullable: true }),
    contributors:           t.field({ type: "JSON", nullable: true }),
    rights:                 t.field({ type: StrongRefType, nullable: true }),
    locations:              t.field({ type: [StrongRefType], nullable: true }),
    createdAt:              t.field({ type: "DateTime", nullable: true }),
  }),
});

// ── Item + Page wrapper types ────────────────────────────────────────────────

const HypercertsClaimActivityItemType = builder.simpleObject("HypercertsClaimActivityItem", {
  description: "A Hypercerts claim activity (org.hypercerts.claim.activity).",
  fields: (t) => ({
    metadata:        t.field({ type: RecordMetaType }),
    specialMetadata: t.field({
      type: HypercertsClaimActivitySpecialMetadataType,
      nullable: true,
      description:
        "Optional quality metadata for this activity. " +
        "Null when the activity has not been scored yet.",
    }),
    creatorInfo:   t.field({ type: CreatorInfoType }),
    record:        t.field({ type: HypercertsClaimActivityRecordType }),
    fundingConfig: t.field({
      type: GainforestFundingConfigRecordType,
      nullable: true,
      description:
        "The associated funding / donations configuration for this activity " +
        "(app.gainforest.funding.config record with the same rkey). " +
        "Null if no funding configuration has been created for this activity.",
    }),
  }),
});

const HypercertsClaimActivityPageType = builder.simpleObject("HypercertsClaimActivityPage", {
  fields: (t) => ({
    data:     t.field({ type: [HypercertsClaimActivityItemType] }),
    pageInfo: t.field({ type: PageInfoType }),
  }),
});

// ── Row mapper ───────────────────────────────────────────────────────────────

export async function mapHypercertsClaimActivity(
  row: RecordRow,
  label: {
    tier: string; labeler: string; labeledAt: string | null; syncedAt: string;
    score: number | null; breakdown: unknown;
  } | null = null,
  fundingConfigRecord: Awaited<ReturnType<typeof mapGainforestFundingConfig>>["record"] | null = null,
) {
  const p = payload(row);
  return {
    metadata:        rowToMeta(row),
    specialMetadata: label
      ? { labelTier: label.tier, label }
      : null,
    creatorInfo: await resolveCreatorInfo(row.did),
    record: {
      title:                  s(p, "title"),
      shortDescription:       s(p, "shortDescription"),
      shortDescriptionFacets: j(p, "shortDescriptionFacets"),
      description:            j(p, "description"),
      image:                  await resolveBlobsInValue(j(p, "image"), row.did),
      workScope:              j(p, "workScope"),
      startDate:              s(p, "startDate"),
      endDate:                s(p, "endDate"),
      contributors:           j(p, "contributors"),
      rights:                 extractStrongRef(j(p, "rights")),
      locations:              extractStrongRefs(j(p, "locations")),
      createdAt:              s(p, "createdAt"),
    },
    fundingConfig: fundingConfigRecord,
  };
}

// ── Attach the `activity` field to the generated HypercertsClaimNS ──────────
//
// Pothos allows multiple builder.objectType() calls on the same class token;
// the fields are merged together.  The generated file declares the class and
// registers all other claim/* fields.  We add `activity` here.

builder.objectFields(HypercertsClaimNS, (t) => ({
    activity: t.field({
      type: HypercertsClaimActivityPageType,
      description:
        "Paginated list of org.hypercerts.claim.activity records. " +
        "When `where` contains no text-filter fields, returns all records ordered by time (sortBy/order apply). " +
        "When `where` contains any of title/shortDescription/description/text, runs a text search " +
        "(sortBy/order are ignored; results ordered by indexed_at DESC). " +
        "Combine with `labelTier` to intersect label and text filters.",
      args: {
        cursor: t.arg.string(),
        limit:  t.arg.int(),
        where:  t.arg({ type: ActivityWhereInputRef, required: false }),
        sortBy: t.arg({ type: SortFieldEnum, description: "Sort field when no text filter is present." }),
        order:  t.arg({ type: SortOrderEnum, description: "Sort direction when no text filter is present." }),
      },
      resolve: async (_, args) => {
        const { cursor, limit, where, sortBy, order } = args;
        const labelTier = where?.labelTier ?? null;

        // ── 1. Resolve actor to DID ──────────────────────────────────────────
        let resolvedDid: string | undefined;
        if (where?.handle) resolvedDid = await resolveActorToDid(where.handle);
        else if (where?.did) resolvedDid = where.did;
        const resolvedRkey = where?.rkey ?? undefined;

        // ── 2. Optional labelTier pre-filter ─────────────────────────────────
        let allowedDids: Set<string> | null = null;
        if (labelTier) {
          allowedDids = await getActivityLabelDids(LOCAL_LABELLER_SOURCE, labelTier);
          if (resolvedDid) {
            if (allowedDids.has(resolvedDid)) {
              allowedDids = new Set([resolvedDid]);
            } else {
              return { data: [], pageInfo: { endCursor: null, hasNextPage: false, count: 0 } };
            }
          }
          if (allowedDids.size === 0) {
            return { data: [], pageInfo: { endCursor: null, hasNextPage: false, count: 0 } };
          }
        }

        // ── 3. Query records ──────────────────────────────────────────────────
        const safeLimit = Math.min(Math.max(limit ?? 50, 1), 100);
        let rows;
        let pageCursor: string | undefined;

        if (activityWhereHasText(where)) {
          const page = await searchActivities({
            filter: activityWhereToFilter(where as ActivityWhereInput),
            did:    allowedDids?.size === 1 ? [...allowedDids][0] : resolvedDid,
            rkey:   resolvedRkey,
            limit:  safeLimit,
            cursor: cursor ?? undefined,
          });
          rows = allowedDids && allowedDids.size > 1
            ? page.records.filter((r) => allowedDids!.has(r.did))
            : page.records;
          pageCursor = page.cursor;
        } else {
          if (allowedDids !== null && allowedDids.size > 1) {
            const page = await getRecordsByCollection("org.hypercerts.claim.activity", {
              cursor: cursor ?? undefined, limit: safeLimit,
              rkey:      resolvedRkey,
              sortField: (sortBy as "createdAt" | "indexedAt") ?? undefined,
              sortOrder: (order  as "asc" | "desc")            ?? undefined,
            });
            rows = page.records.filter((r) => allowedDids!.has(r.did)).slice(0, safeLimit);
            pageCursor = page.cursor;
          } else {
            const singleDid = allowedDids?.size === 1 ? [...allowedDids][0] : resolvedDid;
            const page = await getRecordsByCollection("org.hypercerts.claim.activity", {
              cursor: cursor ?? undefined, limit: safeLimit, did: singleDid,
              rkey:      resolvedRkey,
              sortField: (sortBy as "createdAt" | "indexedAt") ?? undefined,
              sortOrder: (order  as "asc" | "desc")            ?? undefined,
            });
            rows = page.records;
            pageCursor = page.cursor;
          }
        }

        // ── 4. Attach labels + batch-load funding configs ─────────────────────
        const authorDids = [...new Set(rows.map((r) => r.did))];
        await getPdsHostsBatch(authorDids);
        const labelMap = await getLabelsByDids(authorDids, LOCAL_LABELLER_SOURCE);

        // Batch-load funding configs: one DB query for all (did, rkey) pairs on this page.
        const fundingConfigMap = await getRecordsByDidRkeyPairs(
          "app.gainforest.funding.config",
          rows.map((r) => ({ did: r.did, rkey: r.rkey }))
        );

        const data = await Promise.all(rows.map(async (row) => {
          const lRow = labelMap.get(row.did) ?? null;
          const label = lRow ? {
            tier:      lRow.label_value,
            labeler:   lRow.source_did,
            labeledAt: lRow.labeled_at?.toISOString() ?? null,
            syncedAt:  lRow.synced_at.toISOString(),
            score:     lRow.score ?? null,
            breakdown: lRow.breakdown ?? null,
          } : null;

          // Resolve the funding config record for this activity (same did + rkey)
          const fcRow = fundingConfigMap.get(`${row.did}:${row.rkey}`) ?? null;
          const fcRecord = fcRow ? (await mapGainforestFundingConfig(fcRow)).record : null;

          return mapHypercertsClaimActivity(row, label, fcRecord);
        }));

        // ── 5. Post-fetch boolean where filters ───────────────────────────────
        let filtered = data;
        if (where?.hasImage === true) {
          filtered = filtered.filter((item) => item.record.image != null);
        }
        if (where?.hasOrganizationInfoRecord === true) {
          filtered = filtered.filter((item) => item.creatorInfo.organizationName != null);
        }

        return { data: filtered, pageInfo: toPageInfo(pageCursor, filtered.length) };
      },
    }),
}));
