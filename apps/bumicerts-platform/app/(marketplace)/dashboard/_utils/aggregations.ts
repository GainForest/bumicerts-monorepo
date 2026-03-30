/**
 * Dashboard aggregation utilities.
 *
 * Pure functions that transform raw funding receipts into dashboard metrics.
 * All run client-side after receipts are fetched via trpc.funding.receipts.
 */

import type { FundingReceiptItem } from "@/lib/graphql-dev/queries/fundingReceipts";
import type { Period } from "@/lib/utils/leaderboard";

// ── Shared helpers ────────────────────────────────────────────────────────────

/**
 * Extracts the donor identifier from a receipt.
 * Returns { id, type } or null if the receipt cannot be attributed.
 */
function extractDonor(
  item: FundingReceiptItem,
): { id: string; type: "did" | "wallet" } | null {
  const from = item.record?.from as { did?: string } | null | undefined;
  const notes = item.record?.notes;

  if (from && typeof from === "object" && from.did) {
    return { id: from.did, type: "did" };
  }

  if (notes) {
    const match = notes.match(/Anonymous donor wallet:\s*(0x[a-fA-F0-9]+)/i);
    if (match?.[1]) return { id: match[1], type: "wallet" };
  }

  return null;
}

/**
 * Safely parses an amount string, returning 0 for any non-numeric value.
 * Prevents NaN from propagating through aggregation totals.
 */
function safeAmount(raw: string | null | undefined): number {
  const parsed = parseFloat(raw ?? "0");
  return Number.isNaN(parsed) ? 0 : parsed;
}

/**
 * Returns the effective timestamp of a receipt, preferring occurredAt.
 * Returns null for missing or malformed date strings.
 */
function receiptDate(item: FundingReceiptItem): Date | null {
  const raw = item.record?.occurredAt ?? item.record?.createdAt;
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Filters receipts to those whose date falls within the given period.
 */
export function filterByPeriod(
  receipts: FundingReceiptItem[],
  period: Period,
): FundingReceiptItem[] {
  if (period === "all") return receipts;

  const now = Date.now();
  const ms = period === "week" ? 7 * 86_400_000 : 30 * 86_400_000;
  const cutoff = now - ms;

  return receipts.filter((r) => {
    const d = receiptDate(r);
    return d !== null && d.getTime() >= cutoff;
  });
}

// ── KPIs ──────────────────────────────────────────────────────────────────────

export interface DashboardKPIs {
  totalRaised: number;
  totalDonations: number;
  uniqueDonors: number;
  avgDonation: number;
  activeBumicerts: number;
}

/**
 * Computes top-level KPIs from a (already-period-filtered) list of receipts.
 */
export function computeKPIs(receipts: FundingReceiptItem[]): DashboardKPIs {
  const usdcOnly = receipts.filter((r) => r.record?.currency === "USDC");

  let totalRaised = 0;
  const donorIds = new Set<string>();
  const bumicertUris = new Set<string>();

  for (const r of usdcOnly) {
    totalRaised += safeAmount(r.record?.amount);

    const donor = extractDonor(r);
    if (donor) donorIds.add(donor.id);

    const uri = r.record?.for;
    if (uri) bumicertUris.add(uri);
  }

  const totalDonations = usdcOnly.length;

  return {
    totalRaised,
    totalDonations,
    uniqueDonors: donorIds.size,
    avgDonation: totalDonations > 0 ? totalRaised / totalDonations : 0,
    activeBumicerts: bumicertUris.size,
  };
}

// ── Time series ───────────────────────────────────────────────────────────────

export type TimeGranularity = "day" | "week" | "month";

export interface TimeSeriesPoint {
  date: string; // ISO date bucket label e.g. "2025-03-01"
  amount: number;
  count: number;
}

/**
 * Builds a time-series array suitable for Recharts from the given receipts.
 * Buckets are determined by `granularity`.
 */
export function computeTimeSeries(
  receipts: FundingReceiptItem[],
  granularity: TimeGranularity,
): TimeSeriesPoint[] {
  const usdcOnly = receipts.filter((r) => r.record?.currency === "USDC");

  const bucket = (d: Date): string => {
    if (granularity === "month") {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
    }
    if (granularity === "week") {
      // Monday of that week
      const day = d.getDay(); // 0=Sun
      const diff = (day === 0 ? -6 : 1 - day);
      const monday = new Date(d);
      monday.setDate(d.getDate() + diff);
      return monday.toISOString().slice(0, 10);
    }
    // day
    return d.toISOString().slice(0, 10);
  };

  const map = new Map<string, { amount: number; count: number }>();

  for (const r of usdcOnly) {
    const d = receiptDate(r);
    if (!d) continue;

    const key = bucket(d);
    const amount = safeAmount(r.record?.amount);
    const existing = map.get(key);
    if (existing) {
      existing.amount += amount;
      existing.count += 1;
    } else {
      map.set(key, { amount, count: 1 });
    }
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, { amount, count }]) => ({ date, amount, count }));
}

// ── Top donors ────────────────────────────────────────────────────────────────

export interface TopDonorRow {
  rank: number;
  donorId: string;
  donorType: "did" | "wallet";
  totalAmount: number;
  donationCount: number;
  lastDonatedAt: string | null;
}

/**
 * Returns the top N donors by total USDC donated.
 */
export function computeTopDonors(
  receipts: FundingReceiptItem[],
  limit = 50,
): TopDonorRow[] {
  const usdcOnly = receipts.filter((r) => r.record?.currency === "USDC");

  const map = new Map<
    string,
    {
      type: "did" | "wallet";
      totalAmount: number;
      donationCount: number;
      lastDonatedAt: string | null;
    }
  >();

  for (const r of usdcOnly) {
    const donor = extractDonor(r);
    if (!donor) continue;

    const amount = safeAmount(r.record?.amount);
    const dateStr = r.record?.occurredAt ?? r.record?.createdAt ?? null;
    const existing = map.get(donor.id);

    if (existing) {
      existing.totalAmount += amount;
      existing.donationCount += 1;
      if (dateStr && (!existing.lastDonatedAt || dateStr > existing.lastDonatedAt)) {
        existing.lastDonatedAt = dateStr;
      }
    } else {
      map.set(donor.id, {
        type: donor.type,
        totalAmount: amount,
        donationCount: 1,
        lastDonatedAt: dateStr,
      });
    }
  }

  return Array.from(map.entries())
    .sort(([, a], [, b]) => b.totalAmount - a.totalAmount)
    .slice(0, limit)
    .map(([donorId, data], i) => ({
      rank: i + 1,
      donorId,
      donorType: data.type,
      totalAmount: data.totalAmount,
      donationCount: data.donationCount,
      lastDonatedAt: data.lastDonatedAt,
    }));
}

// ── Per-organisation ──────────────────────────────────────────────────────────

export interface OrgRow {
  orgDid: string;
  totalRaised: number;
  bumicertCount: number;
  donorCount: number;
}

/**
 * Aggregates USDC receipts by recipient org DID.
 */
export function computePerOrg(receipts: FundingReceiptItem[]): OrgRow[] {
  const usdcOnly = receipts.filter((r) => r.record?.currency === "USDC");

  const map = new Map<
    string,
    { totalRaised: number; bumicerts: Set<string>; donors: Set<string> }
  >();

  for (const r of usdcOnly) {
    const orgDid = r.record?.to;
    if (!orgDid) continue;

    const amount = safeAmount(r.record?.amount);
    const bumicertUri = r.record?.for ?? "";
    const donor = extractDonor(r);

    const existing = map.get(orgDid);
    if (existing) {
      existing.totalRaised += amount;
      if (bumicertUri) existing.bumicerts.add(bumicertUri);
      if (donor) existing.donors.add(donor.id);
    } else {
      map.set(orgDid, {
        totalRaised: amount,
        bumicerts: new Set(bumicertUri ? [bumicertUri] : []),
        donors: new Set(donor ? [donor.id] : []),
      });
    }
  }

  return Array.from(map.entries())
    .map(([orgDid, { totalRaised, bumicerts, donors }]) => ({
      orgDid,
      totalRaised,
      bumicertCount: bumicerts.size,
      donorCount: donors.size,
    }))
    .sort((a, b) => b.totalRaised - a.totalRaised);
}

// ── Recent transactions ───────────────────────────────────────────────────────

export interface TransactionRow {
  uri: string; // AT-URI of the receipt
  date: string | null;
  donorId: string | null;
  donorType: "did" | "wallet" | null;
  amount: number;
  currency: string;
  bumicertUri: string | null;
  txHash: string | null;
  paymentRail: string | null;
}

/**
 * Returns the N most recent donations ordered by date DESC.
 */
export function computeRecentTransactions(
  receipts: FundingReceiptItem[],
  limit = 50,
): TransactionRow[] {
  return [...receipts]
    .sort((a, b) => {
      const da = receiptDate(a)?.getTime() ?? 0;
      const db = receiptDate(b)?.getTime() ?? 0;
      return db - da;
    })
    .slice(0, limit)
    .map((r) => {
      const donor = extractDonor(r);
      return {
        uri: r.metadata?.uri ?? "",
        date: r.record?.occurredAt ?? r.record?.createdAt ?? null,
        donorId: donor?.id ?? null,
        donorType: donor?.type ?? null,
        amount: safeAmount(r.record?.amount),
        currency: r.record?.currency ?? "USDC",
        bumicertUri: r.record?.for ?? null,
        txHash: r.record?.transactionId ?? null,
        paymentRail: r.record?.paymentRail ?? null,
      };
    });
}
