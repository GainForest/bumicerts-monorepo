/**
 * Custom resolver: app.gainforest.organization.info
 *
 * Excluded from auto-generation because it requires:
 *   - OrgInfoWhereInput (text search on displayName/shortDescription/longDescription)
 *   - extractBlobRef (typed BlobRefType fields for coverImage/logo)
 *
 * Attaches the `info` field to the generated GainforestOrganizationNS.
 */

import { builder } from "../../builder.ts";
import {
  PageInfoType, RecordMetaType, BlobRefType, CreatorInfoType,
  SortOrderEnum, SortFieldEnum,
  OrgInfoWhereInputRef, orgInfoWhereToFilter, orgInfoWhereHasText,
  rowToMeta, payload, extractBlobRef, toPageInfo, resolveCreatorInfo,
} from "../../types.ts";
import type { OrgInfoWhereInput } from "../../types.ts";
import { getRecordsByCollection, searchOrganizations } from "@/db/queries.ts";
import { resolveActorToDid } from "../../identity.ts";
import { getPdsHostsBatch } from "@/identity/pds.ts";
import type { RecordRow } from "@/db/types.ts";

import { GainforestOrganizationNS } from "../generated.ts";

// JSONB accessors
const s = (p: Record<string, unknown>, k: string): string | null => {
  const v = p[k]; if (v == null) return null;
  return typeof v === "string" ? v : String(v);
};
const arr = (p: Record<string, unknown>, k: string): string[] | null => {
  const v = p[k]; return Array.isArray(v) ? v.map(String) : null;
};
const j = (p: Record<string, unknown>, k: string): unknown => p[k] ?? null;

// ── Pure record type ─────────────────────────────────────────────────────────

export const GainforestOrganizationInfoRecordType = builder.simpleObject("GainforestOrganizationInfoRecord", {
  description: "Pure payload for an organization profile (app.gainforest.organization.info).",
  fields: (t) => ({
    displayName:      t.string({ nullable: true }),
    shortDescription: t.field({ type: "JSON", nullable: true }),
    longDescription:  t.field({ type: "JSON", nullable: true }),
    coverImage:       t.field({ type: BlobRefType, nullable: true }),
    logo:             t.field({ type: BlobRefType, nullable: true }),
    objectives:       t.stringList({ nullable: true }),
    country:          t.string({ nullable: true }),
    website:          t.string({ nullable: true }),
    visibility:       t.string({ nullable: true }),
    startDate:        t.field({ type: "DateTime", nullable: true }),
    createdAt:        t.field({ type: "DateTime", nullable: true }),
  }),
});

// ── Item + Page types ────────────────────────────────────────────────────────

export const GainforestOrganizationInfoItemType = builder.simpleObject("GainforestOrganizationInfoItem", {
  description: "An organization profile (app.gainforest.organization.info).",
  fields: (t) => ({
    metadata:    t.field({ type: RecordMetaType }),
    creatorInfo: t.field({ type: CreatorInfoType }),
    record:      t.field({ type: GainforestOrganizationInfoRecordType }),
  }),
});

export const GainforestOrganizationInfoPageType = builder.simpleObject("GainforestOrganizationInfoPage", {
  fields: (t) => ({
    data:     t.field({ type: [GainforestOrganizationInfoItemType] }),
    pageInfo: t.field({ type: PageInfoType }),
  }),
});

// ── Row mapper ───────────────────────────────────────────────────────────────

export async function mapGainforestOrganizationInfo(row: RecordRow) {
  const p = payload(row);
  return {
    metadata:    rowToMeta(row),
    creatorInfo: await resolveCreatorInfo(row.did),
    record: {
      displayName:      s(p, "displayName"),
      shortDescription: j(p, "shortDescription"),
      longDescription:  j(p, "longDescription"),
      coverImage:       await extractBlobRef(j(p, "coverImage"), row.did),
      logo:             await extractBlobRef(j(p, "logo"), row.did),
      objectives:       arr(p, "objectives"),
      country:          s(p, "country"),
      website:          s(p, "website"),
      visibility:       s(p, "visibility"),
      startDate:        s(p, "startDate"),
      createdAt:        s(p, "createdAt"),
    },
  };
}

// ── Attach `info` field to the generated GainforestOrganizationNS ────────────

builder.objectFields(GainforestOrganizationNS, (t) => ({
    info: t.field({
      type: GainforestOrganizationInfoPageType,
      description:
        "Paginated list of app.gainforest.organization.info records. " +
        "When `where` contains no text-filter fields (displayName/shortDescription/longDescription/text), " +
        "returns all records ordered by time (sortBy/order apply). " +
        "When any text field is present in `where`, runs a text search (sortBy/order are ignored; " +
        "results ordered by indexed_at DESC).",
      args: {
        cursor: t.arg.string(),
        limit:  t.arg.int(),
        where:  t.arg({ type: OrgInfoWhereInputRef, required: false }),
        sortBy: t.arg({ type: SortFieldEnum, description: "Sort field when no text filter is present." }),
        order:  t.arg({ type: SortOrderEnum, description: "Sort direction when no text filter is present." }),
      },
      resolve: async (_, args) => {
        const { cursor, limit, where, sortBy, order } = args;

        let resolvedDid: string | undefined;
        if (where?.handle) resolvedDid = await resolveActorToDid(where.handle);
        else if (where?.did) resolvedDid = where.did;

        const page = orgInfoWhereHasText(where)
          ? await searchOrganizations({
              filter: orgInfoWhereToFilter(where as OrgInfoWhereInput),
              did:    resolvedDid,
              limit:  limit ?? undefined,
              cursor: cursor ?? undefined,
            })
          : await getRecordsByCollection("app.gainforest.organization.info", {
              cursor: cursor ?? undefined, limit: limit ?? undefined, did: resolvedDid,
              sortField: (sortBy as "createdAt" | "indexedAt") ?? undefined,
              sortOrder: (order  as "asc" | "desc")            ?? undefined,
            });

        await getPdsHostsBatch([...new Set(page.records.map((r) => r.did))]);
        const data = await Promise.all(page.records.map(mapGainforestOrganizationInfo));
        return { data, pageInfo: toPageInfo(page.cursor, data.length) };
      },
    }),
}));
