/**
 * GraphQL namespace: impactIndexer
 *
 * Every paginated query accepts:
 *   cursor, limit, did, handle, sortBy, order
 *
 * Every leaf returns:
 *   { data: [XxxItem!]!, pageInfo: { endCursor, hasNextPage, count } }
 *
 * Each item has:
 *   metadata   – AT Protocol envelope (uri, did, collection, rkey, cid, indexedAt, createdAt)
 *   creatorInfo – resolved org name + logo from gainforest.organization.info
 *   record      – pure lexicon payload fields
 */

import { builder } from "../builder.ts";
import {
  PageInfoType, RecordMetaType, IiSubjectRefType, CreatorInfoType,
  SortOrderEnum, SortFieldEnum,
  rowToMeta, payload, extractIiSubjectRef, fetchCollectionPage, WhereInputRef,
  resolveCreatorInfo,
} from "../types.ts";
import type { RecordRow } from "@/db/types.ts";

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

class ImpactIndexerNS {}

// ── EIP-712 message type ──

const IiEip712MessageType = builder.simpleObject("IiEip712Message", {
  description: "The EIP-712 typed data message that was signed.",
  fields: (t) => ({
    did:        t.string({ nullable: true }),
    evmAddress: t.string({ nullable: true }),
    chainId:    t.string({ nullable: true }),
    timestamp:  t.string({ nullable: true }),
    nonce:      t.string({ nullable: true }),
  }),
});

// ── Pure record types (lexicon payload only) ──

const IiAttestationRecordType = builder.simpleObject("IiAttestationRecord", {
  description: "Pure payload for an on-chain attestation link (org.impactindexer.link.attestation).",
  fields: (t) => ({
    address:       t.string({ nullable: true }),
    chainId:       t.int({ nullable: true }),
    signature:     t.string({ nullable: true }),
    message:       t.field({ type: IiEip712MessageType, nullable: true }),
    signatureType: t.string({ nullable: true }),
    createdAt:     t.field({ type: "DateTime", nullable: true }),
  }),
});

const IiCommentRecordType = builder.simpleObject("IiCommentRecord", {
  description: "Pure payload for a review comment (org.impactindexer.review.comment).",
  fields: (t) => ({
    subject:   t.field({ type: IiSubjectRefType, nullable: true }),
    text:      t.string({ nullable: true }),
    replyTo:   t.string({ nullable: true }),
    createdAt: t.field({ type: "DateTime", nullable: true }),
  }),
});

const IiLikeRecordType = builder.simpleObject("IiLikeRecord", {
  description: "Pure payload for a review like (org.impactindexer.review.like).",
  fields: (t) => ({
    subject:   t.field({ type: IiSubjectRefType, nullable: true }),
    createdAt: t.field({ type: "DateTime", nullable: true }),
  }),
});

// ── Item wrapper types ──

const IiAttestationItemType = builder.simpleObject("IiAttestationItem", {
  description: "An on-chain attestation link (org.impactindexer.link.attestation).",
  fields: (t) => ({
    metadata:    t.field({ type: RecordMetaType }),
    creatorInfo: t.field({ type: CreatorInfoType }),
    record:      t.field({ type: IiAttestationRecordType }),
  }),
});
const IiAttestationPageType = builder.simpleObject("IiAttestationPage", {
  fields: (t) => ({ data: t.field({ type: [IiAttestationItemType] }), pageInfo: t.field({ type: PageInfoType }) }),
});

const IiCommentItemType = builder.simpleObject("IiCommentItem", {
  description: "A review comment (org.impactindexer.review.comment).",
  fields: (t) => ({
    metadata:    t.field({ type: RecordMetaType }),
    creatorInfo: t.field({ type: CreatorInfoType }),
    record:      t.field({ type: IiCommentRecordType }),
  }),
});
const IiCommentPageType = builder.simpleObject("IiCommentPage", {
  fields: (t) => ({ data: t.field({ type: [IiCommentItemType] }), pageInfo: t.field({ type: PageInfoType }) }),
});

const IiLikeItemType = builder.simpleObject("IiLikeItem", {
  description: "A review like (org.impactindexer.review.like).",
  fields: (t) => ({
    metadata:    t.field({ type: RecordMetaType }),
    creatorInfo: t.field({ type: CreatorInfoType }),
    record:      t.field({ type: IiLikeRecordType }),
  }),
});
const IiLikePageType = builder.simpleObject("IiLikePage", {
  fields: (t) => ({ data: t.field({ type: [IiLikeItemType] }), pageInfo: t.field({ type: PageInfoType }) }),
});

// ── Row mappers ──

async function mapAttestation(row: RecordRow) {
  const p = payload(row);
  const msgRaw = j(p,"message");
  let message: {
    did: string | null; evmAddress: string | null; chainId: string | null;
    timestamp: string | null; nonce: string | null;
  } | null = null;
  if (msgRaw != null && typeof msgRaw === "object") {
    const m = msgRaw as Record<string, unknown>;
    message = {
      did: s(m,"did"), evmAddress: s(m,"evmAddress"),
      chainId: s(m,"chainId"), timestamp: s(m,"timestamp"), nonce: s(m,"nonce"),
    };
  }
  return {
    metadata:    rowToMeta(row),
    creatorInfo: await resolveCreatorInfo(row.did),
    record: {
      address: s(p,"address"), chainId: n(p,"chainId"),
      signature: s(p,"signature"), message, signatureType: s(p,"signatureType"),
      createdAt: s(p,"createdAt"),
    },
  };
}

async function mapComment(row: RecordRow) {
  const p = payload(row);
  return {
    metadata:    rowToMeta(row),
    creatorInfo: await resolveCreatorInfo(row.did),
    record: {
      subject: extractIiSubjectRef(j(p,"subject")),
      text: s(p,"text"), replyTo: s(p,"replyTo"), createdAt: s(p,"createdAt"),
    },
  };
}

async function mapLike(row: RecordRow) {
  const p = payload(row);
  return {
    metadata:    rowToMeta(row),
    creatorInfo: await resolveCreatorInfo(row.did),
    record: {
      subject: extractIiSubjectRef(j(p,"subject")),
      createdAt: s(p,"createdAt"),
    },
  };
}

// ── Namespace objectType ──

builder.objectType(ImpactIndexerNS, {
  name: "ImpactIndexerNamespace",
  description: "Impact Indexer AT Protocol records (org.impactindexer.*).",
  fields: (t) => ({
    attestation: t.field({
      type: IiAttestationPageType,
      args: {
        cursor: t.arg.string(), limit: t.arg.int(),
        where: t.arg({ type: WhereInputRef, required: false }),
        sortBy: t.arg({ type: SortFieldEnum }), order: t.arg({ type: SortOrderEnum }),
      },
      resolve: (_, args) => fetchCollectionPage("org.impactindexer.link.attestation", args, mapAttestation),
    }),
    comment: t.field({
      type: IiCommentPageType,
      args: {
        cursor: t.arg.string(), limit: t.arg.int(),
        where: t.arg({ type: WhereInputRef, required: false }),
        sortBy: t.arg({ type: SortFieldEnum }), order: t.arg({ type: SortOrderEnum }),
      },
      resolve: (_, args) => fetchCollectionPage("org.impactindexer.review.comment", args, mapComment),
    }),
    like: t.field({
      type: IiLikePageType,
      args: {
        cursor: t.arg.string(), limit: t.arg.int(),
        where: t.arg({ type: WhereInputRef, required: false }),
        sortBy: t.arg({ type: SortFieldEnum }), order: t.arg({ type: SortOrderEnum }),
      },
      resolve: (_, args) => fetchCollectionPage("org.impactindexer.review.like", args, mapLike),
    }),
  }),
});

builder.queryFields((t) => ({
  impactIndexer: t.field({
    type: ImpactIndexerNS,
    description: "All Impact Indexer indexed records, grouped by namespace.",
    resolve: () => new ImpactIndexerNS(),
  }),
}));
