/**
 * GraphQL namespace: impactIndexer
 *
 * Every paginated query accepts:
 *   cursor, limit, did, handle, sortBy, order
 */

import { builder } from "../builder.ts";
import {
  PageInfoType, RecordMetaType, IiSubjectRefType,
  SortOrderEnum, SortFieldEnum,
  rowToMeta, payload, extractIiSubjectRef, fetchCollectionPage, WhereInputRef,
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

// ── Leaf types ──

const IiAttestationType = builder.simpleObject("IiAttestation", {
  description: "An on-chain attestation link (org.impactindexer.link.attestation).",
  fields: (t) => ({
    meta:          t.field({ type: RecordMetaType }),
    address:       t.string({ nullable: true }),
    chainId:       t.int({ nullable: true }),
    signature:     t.string({ nullable: true }),
    message:       t.field({ type: IiEip712MessageType, nullable: true }),
    signatureType: t.string({ nullable: true }),
    createdAt:     t.field({ type: "DateTime", nullable: true }),
  }),
});
const IiAttestationPageType = builder.simpleObject("IiAttestationPage", {
  fields: (t) => ({ records: t.field({ type: [IiAttestationType] }), pageInfo: t.field({ type: PageInfoType }) }),
});

const IiCommentType = builder.simpleObject("IiComment", {
  description: "A review comment (org.impactindexer.review.comment).",
  fields: (t) => ({
    meta:      t.field({ type: RecordMetaType }),
    subject:   t.field({ type: IiSubjectRefType, nullable: true }),
    text:      t.string({ nullable: true }),
    replyTo:   t.string({ nullable: true }),
    createdAt: t.field({ type: "DateTime", nullable: true }),
  }),
});
const IiCommentPageType = builder.simpleObject("IiCommentPage", {
  fields: (t) => ({ records: t.field({ type: [IiCommentType] }), pageInfo: t.field({ type: PageInfoType }) }),
});

const IiLikeType = builder.simpleObject("IiLike", {
  description: "A review like (org.impactindexer.review.like).",
  fields: (t) => ({
    meta:      t.field({ type: RecordMetaType }),
    subject:   t.field({ type: IiSubjectRefType, nullable: true }),
    createdAt: t.field({ type: "DateTime", nullable: true }),
  }),
});
const IiLikePageType = builder.simpleObject("IiLikePage", {
  fields: (t) => ({ records: t.field({ type: [IiLikeType] }), pageInfo: t.field({ type: PageInfoType }) }),
});

// ── Row mappers ──

function mapAttestation(row: RecordRow) {
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
    meta: rowToMeta(row), address: s(p,"address"), chainId: n(p,"chainId"),
    signature: s(p,"signature"), message, signatureType: s(p,"signatureType"),
    createdAt: s(p,"createdAt"),
  };
}

function mapComment(row: RecordRow) {
  const p = payload(row);
  return {
    meta: rowToMeta(row),
    subject: extractIiSubjectRef(j(p,"subject")),
    text: s(p,"text"), replyTo: s(p,"replyTo"), createdAt: s(p,"createdAt"),
  };
}

function mapLike(row: RecordRow) {
  const p = payload(row);
  return {
    meta: rowToMeta(row),
    subject: extractIiSubjectRef(j(p,"subject")),
    createdAt: s(p,"createdAt"),
  };
}

// ── Namespace objectType ──

builder.objectType(ImpactIndexerNS, {
  name: "ImpactIndexerNamespace",
  description: "Impact Indexer AT Protocol records (org.impactindexer.*).",
  fields: (t) => ({
    attestations: t.field({
      type: IiAttestationPageType,
      args: {
        cursor: t.arg.string(), limit: t.arg.int(),
        where: t.arg({ type: WhereInputRef, required: false }),
        sortBy: t.arg({ type: SortFieldEnum }), order: t.arg({ type: SortOrderEnum }),
      },
      resolve: (_, args) => fetchCollectionPage("org.impactindexer.link.attestation", args, mapAttestation),
    }),
    comments: t.field({
      type: IiCommentPageType,
      args: {
        cursor: t.arg.string(), limit: t.arg.int(),
        where: t.arg({ type: WhereInputRef, required: false }),
        sortBy: t.arg({ type: SortFieldEnum }), order: t.arg({ type: SortOrderEnum }),
      },
      resolve: (_, args) => fetchCollectionPage("org.impactindexer.review.comment", args, mapComment),
    }),
    likes: t.field({
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
