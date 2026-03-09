/**
 * Custom resolver: org.impactindexer.link.attestation
 *
 * Excluded from auto-generation because the `message` field is a nested
 * eip712Message sub-object that needs its own named GraphQL type
 * (ImpactindexerLinkAttestationEip712MessageType).
 *
 * Attaches the `attestation` field to the generated ImpactindexerLinkNS.
 */

import { builder } from "../../builder.ts";
import {
  PageInfoType, RecordMetaType, CreatorInfoType,
  SortOrderEnum, SortFieldEnum,
  WhereInputRef,
  rowToMeta, payload, fetchCollectionPage, resolveCreatorInfo,
} from "../../types.ts";
import type { RecordRow } from "@/db/types.ts";

import { ImpactindexerNS } from "../generated.ts";

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

// ── Sub-type: EIP-712 typed message ──────────────────────────────────────────

export const ImpactindexerLinkAttestationEip712MessageType = builder.simpleObject("ImpactindexerLinkAttestationEip712Message", {
  description: "The EIP-712 typed data message that was signed.",
  fields: (t) => ({
    did:        t.string({ nullable: true }),
    evmAddress: t.string({ nullable: true }),
    chainId:    t.string({ nullable: true }),
    timestamp:  t.string({ nullable: true }),
    nonce:      t.string({ nullable: true }),
  }),
});

// ── Pure record type ─────────────────────────────────────────────────────────

export const ImpactindexerLinkAttestationRecordType = builder.simpleObject("ImpactindexerLinkAttestationRecord", {
  description: "Pure payload for an on-chain attestation link (org.impactindexer.link.attestation).",
  fields: (t) => ({
    address:       t.string({ nullable: true }),
    chainId:       t.int({ nullable: true }),
    signature:     t.string({ nullable: true }),
    message:       t.field({ type: ImpactindexerLinkAttestationEip712MessageType, nullable: true }),
    signatureType: t.string({ nullable: true }),
    createdAt:     t.field({ type: "DateTime", nullable: true }),
  }),
});

// ── Item + Page types ────────────────────────────────────────────────────────

export const ImpactindexerLinkAttestationItemType = builder.simpleObject("ImpactindexerLinkAttestationItem", {
  description: "An on-chain attestation link (org.impactindexer.link.attestation).",
  fields: (t) => ({
    metadata:    t.field({ type: RecordMetaType }),
    creatorInfo: t.field({ type: CreatorInfoType }),
    record:      t.field({ type: ImpactindexerLinkAttestationRecordType }),
  }),
});

export const ImpactindexerLinkAttestationPageType = builder.simpleObject("ImpactindexerLinkAttestationPage", {
  fields: (t) => ({
    data:     t.field({ type: [ImpactindexerLinkAttestationItemType] }),
    pageInfo: t.field({ type: PageInfoType }),
  }),
});

// ── Row mapper ───────────────────────────────────────────────────────────────

export async function mapImpactindexerLinkAttestation(row: RecordRow) {
  const p = payload(row);
  const msgRaw = j(p, "message");
  let message: {
    did: string | null; evmAddress: string | null; chainId: string | null;
    timestamp: string | null; nonce: string | null;
  } | null = null;
  if (msgRaw != null && typeof msgRaw === "object") {
    const m = msgRaw as Record<string, unknown>;
    message = {
      did:        s(m, "did"),
      evmAddress: s(m, "evmAddress"),
      chainId:    s(m, "chainId"),
      timestamp:  s(m, "timestamp"),
      nonce:      s(m, "nonce"),
    };
  }
  return {
    metadata:    rowToMeta(row),
    creatorInfo: await resolveCreatorInfo(row.did),
    record: {
      address:       s(p, "address"),
      chainId:       n(p, "chainId"),
      signature:     s(p, "signature"),
      message,
      signatureType: s(p, "signatureType"),
      createdAt:     s(p, "createdAt"),
    },
  };
}

// ── Local class for the link sub-namespace (not generated because all its ─────
// ── leaf collections are excluded from auto-generation) ──────────────────────

class ImpactindexerLinkNS {}

// Register the link namespace type
builder.objectType(ImpactindexerLinkNS, {
  name: "ImpactindexerLinkNamespace",
  description: "ImpactindexerLinkNamespace namespace (impactindexer.link.*).",
  fields: (t) => ({
    attestation: t.field({
      type: ImpactindexerLinkAttestationPageType,
      description: "Paginated list of org.impactindexer.link.attestation records.",
      args: {
        cursor: t.arg.string(),
        limit:  t.arg.int(),
        where:  t.arg({ type: WhereInputRef, required: false }),
        sortBy: t.arg({ type: SortFieldEnum }),
        order:  t.arg({ type: SortOrderEnum }),
      },
      resolve: (_, args) =>
        fetchCollectionPage("org.impactindexer.link.attestation", args, mapImpactindexerLinkAttestation),
    }),
  }),
});

// Attach `link` to the generated ImpactindexerNS
builder.objectFields(ImpactindexerNS, (t) => ({
    link: t.field({
      type: ImpactindexerLinkNS,
      description: "ImpactindexerLinkNamespace namespace.",
      resolve: () => new ImpactindexerLinkNS(),
    }),
}));
