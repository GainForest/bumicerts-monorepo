/**
 * Dashboard aggregation utilities.
 *
 * Convert raw funding receipts fetched via tRPC into dashboard metrics:
 * top donors, recent donations, time series, etc.
 */

import type { FundingReceiptItem } from "@/graphql/indexer/queries/fundingReceipts";
import {
  extractDonor as extractDonorFromReceipt,
  extractOrgDidFromFor,
} from "@/lib/utils/extract-donor";

// ── Helper to extract URI from StrongRef ─────────────────────────────────────

/**
 * Extracts the AT-URI from a StrongRef object or returns null.
 * The `for` field is now a StrongRef: { uri: string, cid: string }
 */
function extractUriFromStrongRef(strongRef: unknown): string | null {
  if (!strongRef || typeof strongRef !== "object") return null;
  const ref = strongRef as Record<string, unknown>;
  return typeof ref.uri === "string" ? ref.uri : null;
}

import type { Period } from "@/lib/utils/leaderboard";

// ── Shared helpers ────────────────────────────────────────────────────────────

/**
 * Extracts the donor identifier from a receipt.
 * Returns { id, type } or null if the receipt cannot be attributed.
 */
function extractDonor(
  item: FundingReceiptItem,
): { id: string; type: "did" | "wallet" } | null {
  return extractDonorFromReceipt(item.record?.from);
}

/**
 * USD-pegged currencies accepted by the platform.
 * Add new entries here as additional stablecoins are supported.
 */
const USD_CURRENCIES = ["USD", "USDC"] as const;

/**
 * Returns true if the receipt currency represents a USD-denominated token.
 */
export function isUsdCurrency(currency: string | null | undefined): boolean {
  if (!currency) return false;
  const upper = currency.toUpperCase() as string;
  return (USD_CURRENCIES as readonly string[]).includes(upper);
}

/**
 * Payment networks and their block explorer tx URL builders.
 * Only networks explicitly recognised here get a block explorer link.
 * `paymentNetwork` values come from the /api/fund route.
 */
const BLOCK_EXPLORERS: Record<string, (txHash: string) => string> = {
  base: (txHash) => `https://basescan.org/tx/${txHash}`,
  celo: (txHash) => `https://celoscan.io/tx/${txHash}`,
};

/**
 * Returns a block explorer URL for the given tx hash and payment network,
 * or null if the network is unknown or the hash is missing.
 */
export function blockExplorerUrl(
  txHash: string | null | undefined,
  paymentNetwork: string | null | undefined,
): string | null {
  if (!txHash || !paymentNetwork) return null;
  const builder = BLOCK_EXPLORERS[paymentNetwork.toLowerCase()];
  return builder ? builder(txHash) : null;
}

/**
 * Safely parses an amount string, returning 0 for any non-numeric value.
 * Prevents NaN from propagating through aggregation totals.
 */
export function safeAmount(raw: string | null | undefined): number {
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
  const usdcOnly = receipts.filter((r) => isUsdCurrency(r.record?.currency));

  let totalRaised = 0;
  const donorIds = new Set<string>();
  const bumicertUris = new Set<string>();

  for (const r of usdcOnly) {
    totalRaised += safeAmount(r.record?.amount);

    const donor = extractDonor(r);
    if (donor) donorIds.add(donor.id);

    const uri = extractUriFromStrongRef(r.record?.for);
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
  const usdcOnly = receipts.filter((r) => isUsdCurrency(r.record?.currency));

  const bucket = (d: Date): string => {
    if (granularity === "month") {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
    }
    if (granularity === "week") {
      // Monday of that week
      const day = d.getDay(); // 0=Sun
      const diff = day === 0 ? -6 : 1 - day;
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
 * Returns the top N donors by total USD donated.
 */
export function computeTopDonors(
  receipts: FundingReceiptItem[],
  limit = 50,
): TopDonorRow[] {
  const usdcOnly = receipts.filter((r) => isUsdCurrency(r.record?.currency));

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
      if (
        dateStr &&
        (!existing.lastDonatedAt || dateStr > existing.lastDonatedAt)
      ) {
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

// ── Per-organization ──────────────────────────────────────────────────────────

export interface OrgRow {
  orgDid: string;
  totalRaised: number;
  bumicertCount: number;
  donorCount: number;
}

/**
 * Aggregates USD receipts by recipient org DID.
 */
export function computePerOrg(receipts: FundingReceiptItem[]): OrgRow[] {
  const usdcOnly = receipts.filter((r) => isUsdCurrency(r.record?.currency));

  const map = new Map<
    string,
    { totalRaised: number; bumicerts: Set<string>; donors: Set<string> }
  >();

  for (const r of usdcOnly) {
    const orgDid = extractOrgDidFromFor(r.record?.for);
    if (!orgDid) continue;

    const amount = safeAmount(r.record?.amount);
    const bumicertUri = extractUriFromStrongRef(r.record?.for);
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
  paymentNetwork: string | null; // e.g. "base", "celo"
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
        currency: r.record?.currency ?? "USD",
        bumicertUri: extractUriFromStrongRef(r.record?.for),
        txHash: r.record?.transactionId ?? null,
        paymentNetwork: r.record?.paymentNetwork ?? null,
      };
    });
}
