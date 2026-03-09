/**
 * Custom resolver: app.gainforest.organization.recordings.audio
 *
 * Excluded from auto-generation because the audio `metadata` sub-object
 * (codec, channels, duration, recordedAt, sampleRate, coordinates) requires
 * its own named GraphQL type (GainforestOrganizationAudioMetadataType).
 * The generator only handles flat record shapes.
 *
 * Attaches the `audio` field to the generated GainforestOrganizationRecordingsNS.
 */

import { builder } from "../../builder.ts";
import {
  PageInfoType, RecordMetaType, BlobRefType, CreatorInfoType,
  SortOrderEnum, SortFieldEnum,
  WhereInputRef,
  rowToMeta, payload, extractBlobRef, toPageInfo, resolveCreatorInfo,
} from "../../types.ts";
import { getRecordsByCollection } from "@/db/queries.ts";
import { resolveActorToDid } from "../../identity.ts";
import { getPdsHostsBatch } from "@/identity/pds.ts";
import type { RecordRow } from "@/db/types.ts";

import { GainforestOrganizationNS } from "../generated.ts";

// Local class token for the recordings sub-namespace (not generated because
// all its leaf collections are excluded from auto-generation).
class GainforestOrganizationRecordingsNS {}

// JSONB accessors
const s = (p: Record<string, unknown>, k: string): string | null => {
  const v = p[k]; if (v == null) return null;
  return typeof v === "string" ? v : String(v);
};
const n = (p: Record<string, unknown>, k: string): number | null => {
  const v = p[k]; if (v == null) return null;
  if (typeof v === "number") return v;
  const x = Number(v); return isNaN(x) ? null : x;
};
const j = (p: Record<string, unknown>, k: string): unknown => p[k] ?? null;

// ── Sub-type: audio metadata ─────────────────────────────────────────────────

export const GainforestOrganizationAudioMetadataType = builder.simpleObject("GainforestOrganizationAudioMetadata", {
  description: "Technical metadata for an audio recording.",
  fields: (t) => ({
    codec:       t.string({ nullable: true }),
    channels:    t.int({ nullable: true }),
    duration:    t.string({ nullable: true }),
    recordedAt:  t.field({ type: "DateTime", nullable: true }),
    sampleRate:  t.int({ nullable: true }),
    coordinates: t.string({ nullable: true }),
  }),
});

// ── Pure record type ─────────────────────────────────────────────────────────

export const GainforestOrganizationRecordingsAudioRecordType = builder.simpleObject("GainforestOrganizationRecordingsAudioRecord", {
  description: "Pure payload for an audio recording (app.gainforest.organization.recordings.audio).",
  fields: (t) => ({
    name:        t.string({ nullable: true }),
    description: t.field({ type: "JSON", nullable: true }),
    blob:        t.field({ type: BlobRefType, nullable: true }),
    metadata:    t.field({ type: GainforestOrganizationAudioMetadataType, nullable: true }),
    createdAt:   t.field({ type: "DateTime", nullable: true }),
  }),
});

// ── Item + Page types ────────────────────────────────────────────────────────

export const GainforestOrganizationRecordingsAudioItemType = builder.simpleObject("GainforestOrganizationRecordingsAudioItem", {
  description: "An audio recording (app.gainforest.organization.recordings.audio).",
  fields: (t) => ({
    metadata:    t.field({ type: RecordMetaType }),
    creatorInfo: t.field({ type: CreatorInfoType }),
    record:      t.field({ type: GainforestOrganizationRecordingsAudioRecordType }),
  }),
});

export const GainforestOrganizationRecordingsAudioPageType = builder.simpleObject("GainforestOrganizationRecordingsAudioPage", {
  fields: (t) => ({
    data:     t.field({ type: [GainforestOrganizationRecordingsAudioItemType] }),
    pageInfo: t.field({ type: PageInfoType }),
  }),
});

// ── Row mapper ───────────────────────────────────────────────────────────────

export async function mapGainforestOrganizationRecordingsAudio(row: RecordRow) {
  const p = payload(row);
  const metaRaw = j(p, "metadata");
  let audioMeta: {
    codec: string | null; channels: number | null; duration: string | null;
    recordedAt: string | null; sampleRate: number | null; coordinates: string | null;
  } | null = null;
  if (metaRaw != null && typeof metaRaw === "object") {
    const m = metaRaw as Record<string, unknown>;
    audioMeta = {
      codec:       s(m, "codec"),
      channels:    n(m, "channels"),
      duration:    s(m, "duration"),
      recordedAt:  s(m, "recordedAt"),
      sampleRate:  n(m, "sampleRate"),
      coordinates: s(m, "coordinates"),
    };
  }
  return {
    metadata:    rowToMeta(row),
    creatorInfo: await resolveCreatorInfo(row.did),
    record: {
      name:        s(p, "name"),
      description: j(p, "description"),
      blob:        await extractBlobRef(j(p, "blob"), row.did),
      metadata:    audioMeta,
      createdAt:   s(p, "createdAt"),
    },
  };
}

// ── Register the recordings namespace type ────────────────────────────────────

builder.objectType(GainforestOrganizationRecordingsNS, {
  name: "GainforestOrganizationRecordingsNamespace",
  description: "GainforestOrganizationRecordingsNamespace namespace (gainforest.organization.recordings.*).",
  fields: (t) => ({
    audio: t.field({
      type: GainforestOrganizationRecordingsAudioPageType,
      description: "Paginated list of app.gainforest.organization.recordings.audio records.",
      args: {
        cursor: t.arg.string(),
        limit:  t.arg.int(),
        where:  t.arg({ type: WhereInputRef, required: false }),
        sortBy: t.arg({ type: SortFieldEnum }),
        order:  t.arg({ type: SortOrderEnum }),
      },
      resolve: async (_, args) => {
        const { cursor, limit, where, sortBy, order } = args;
        let resolvedDid: string | undefined;
        if (where?.handle) resolvedDid = await resolveActorToDid(where.handle);
        else if (where?.did) resolvedDid = where.did;
        const page = await getRecordsByCollection("app.gainforest.organization.recordings.audio", {
          cursor: cursor ?? undefined, limit: limit ?? undefined, did: resolvedDid,
          sortField: (sortBy as "createdAt" | "indexedAt") ?? undefined,
          sortOrder: (order  as "asc" | "desc")            ?? undefined,
        });
        await getPdsHostsBatch([...new Set(page.records.map((r) => r.did))]);
        const data = await Promise.all(page.records.map(mapGainforestOrganizationRecordingsAudio));
        return { data, pageInfo: toPageInfo(page.cursor, data.length) };
      },
    }),
  }),
});

// ── Attach `recordings` to the generated GainforestOrganizationNS ─────────────
// The generator didn't add this field because all recordings.* are excluded.

builder.objectFields(GainforestOrganizationNS, (t) => ({
    recordings: t.field({
      type: GainforestOrganizationRecordingsNS,
      description: "GainforestOrganizationRecordingsNamespace namespace.",
      resolve: () => new GainforestOrganizationRecordingsNS(),
    }),
}));
