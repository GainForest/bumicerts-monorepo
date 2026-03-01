/**
 * GraphQL namespace: certified
 *
 * app.certified.* records.
 *
 * Every paginated query accepts:
 *   cursor  – opaque keyset pagination token
 *   limit   – page size 1-100 (default 50)
 *   where   – identity filter { did?, handle?, and?, or?, not? }
 *   sortBy  – CREATED_AT | INDEXED_AT
 *   order   – DESC (default) | ASC
 */

import { builder } from "../builder.ts";
import {
  PageInfoType, RecordMetaType,
  SortOrderEnum, SortFieldEnum,
  rowToMeta, payload, resolveBlobsInValue, toPageInfo, WhereInputRef,
} from "../types.ts";
import { getRecordsByCollection } from "@/db/queries.ts";
import { resolveActorToDid } from "../identity.ts";
import { getPdsHostsBatch } from "@/identity/pds.ts";
import type { RecordRow } from "@/db/types.ts";

// JSONB accessors
const s = (p: Record<string, unknown>, k: string): string | null => {
  const v = p[k]; if (v == null) return null;
  return typeof v === "string" ? v : String(v);
};
const j = (p: Record<string, unknown>, k: string): unknown => p[k] ?? null;

// ================================================================
// Token classes
// ================================================================

class CertifiedActorNS {}
class CertifiedNS {}

// ================================================================
// ── Actor leaf types ─────────────────────────────────────────────
// ================================================================

const CertifiedActorProfileType = builder.simpleObject("CertifiedActorProfile", {
  description: "A Hypercert account profile declaration (app.certified.actor.profile).",
  fields: (t) => ({
    meta:        t.field({ type: RecordMetaType }),
    displayName: t.string({ nullable: true }),
    description: t.string({ nullable: true }),
    pronouns:    t.string({ nullable: true }),
    website:     t.string({ nullable: true }),
    avatar:      t.field({ type: "JSON", nullable: true }),
    banner:      t.field({ type: "JSON", nullable: true }),
    createdAt:   t.field({ type: "DateTime", nullable: true }),
  }),
});
const CertifiedActorProfilePageType = builder.simpleObject("CertifiedActorProfilePage", {
  fields: (t) => ({ records: t.field({ type: [CertifiedActorProfileType] }), pageInfo: t.field({ type: PageInfoType }) }),
});

async function mapActorProfile(row: RecordRow) {
  const p = payload(row);
  return {
    meta:        rowToMeta(row),
    displayName: s(p,"displayName"),
    description: s(p,"description"),
    pronouns:    s(p,"pronouns"),
    website:     s(p,"website"),
    avatar:      await resolveBlobsInValue(j(p,"avatar"), row.did),
    banner:      await resolveBlobsInValue(j(p,"banner"), row.did),
    createdAt:   s(p,"createdAt"),
  };
}

// ── Actor namespace ──

builder.objectType(CertifiedActorNS, {
  name: "CertifiedActorNamespace",
  description: "Certified actor records (app.certified.actor.*).",
  fields: (t) => ({
    profiles: t.field({
      type: CertifiedActorProfilePageType,
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
        const page = await getRecordsByCollection("app.certified.actor.profile", {
          cursor: cursor ?? undefined, limit: limit ?? undefined, did: resolvedDid,
          sortField: (sortBy as "createdAt" | "indexedAt") ?? undefined,
          sortOrder: (order as "asc" | "desc") ?? undefined,
        });
        await getPdsHostsBatch([...new Set(page.records.map((r) => r.did))]);
        return { records: await Promise.all(page.records.map(mapActorProfile)), pageInfo: toPageInfo(page.cursor) };
      },
    }),
  }),
});

// ── Certified root namespace ──

builder.objectType(CertifiedNS, {
  name: "CertifiedNamespace",
  description: "All Certified AT Protocol records (app.certified.*).",
  fields: (t) => ({
    actor: t.field({
      type: CertifiedActorNS,
      description: "Certified actor records.",
      resolve: () => new CertifiedActorNS(),
    }),
  }),
});

builder.queryFields((t) => ({
  certified: t.field({
    type: CertifiedNS,
    description: "All Certified indexed records, grouped by namespace.",
    resolve: () => new CertifiedNS(),
  }),
}));
