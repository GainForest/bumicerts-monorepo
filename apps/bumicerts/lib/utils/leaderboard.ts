/**
 * Leaderboard aggregation utilities.
 *
 * These helpers aggregate raw funding receipts into a ranked leaderboard.
 * They run client-side after fetching receipts via trpc.funding.receipts.
 */

import type { FundingReceiptItem } from "@/lib/graphql-dev/queries/fundingReceipts";

// ── Types ─────────────────────────────────────────────────────────────────────

export type Period = "all" | "month" | "week";

export interface LeaderboardEntry {
  rank: number;
  donorId: string;
  donorType: "did" | "wallet";
  totalAmount: number;
  donationCount: number;
  lastDonatedAt: string | null;
}

export interface LeaderboardResult {
  entries: LeaderboardEntry[];
  totalDonorsCount: number;
  totalAmountSum: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Extracts donor identifier from a funding receipt.
 * Returns { id, type } where type is "did" or "wallet".
 */
function extractDonor(item: FundingReceiptItem): { id: string; type: "did" | "wallet" } | null {
  const from = item.record?.from as { did?: string } | null | undefined;
  const notes = item.record?.notes;

  // Identified donor: DID in `from.did`
  if (from && typeof from === "object" && from.did) {
    return { id: from.did, type: "did" };
  }

  // Anonymous donor: wallet address in notes
  if (notes) {
    const walletMatch = notes.match(/Anonymous donor wallet:\s*(0x[a-fA-F0-9]+)/i);
    if (walletMatch) {
      return { id: walletMatch[1], type: "wallet" };
    }
  }

  return null;
}

/**
 * Filters receipts by time period.
 */
function filterByPeriod(receipts: FundingReceiptItem[], period: Period): FundingReceiptItem[] {
  if (period === "all") return receipts;

  const now = new Date();
  const cutoff =
    period === "week"
      ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  return receipts.filter((r) => {
    const dateStr = r.record?.occurredAt ?? r.record?.createdAt;
    if (!dateStr) return false;
    try {
      return new Date(dateStr) >= cutoff;
    } catch {
      return false;
    }
  });
}

/**
 * Aggregates funding receipts into a leaderboard result.
 *
 * Only USDC donations are counted. Donors are identified by DID (for
 * identified donors) or wallet address extracted from `record.notes`
 * (for anonymous donors).
 */
export function aggregateToLeaderboard(
  receipts: FundingReceiptItem[],
  period: Period = "all",
  limit: number = 100
): LeaderboardResult {
  // 1. Filter by period
  const filtered = filterByPeriod(receipts, period);

  // 2. Filter USDC only
  const usdcOnly = filtered.filter((r) => r.record?.currency === "USDC");

  // 3. Group by donor
  const donorMap = new Map<
    string,
    {
      type: "did" | "wallet";
      totalAmount: number;
      donationCount: number;
      lastDonatedAt: string | null;
    }
  >();

  for (const receipt of usdcOnly) {
    const donor = extractDonor(receipt);
    if (!donor) continue;

    const amount = parseFloat(receipt.record?.amount ?? "0");
    const dateStr = receipt.record?.occurredAt ?? receipt.record?.createdAt ?? null;

    const existing = donorMap.get(donor.id);
    if (existing) {
      existing.totalAmount += amount;
      existing.donationCount += 1;
      if (dateStr && (!existing.lastDonatedAt || dateStr > existing.lastDonatedAt)) {
        existing.lastDonatedAt = dateStr;
      }
    } else {
      donorMap.set(donor.id, {
        type: donor.type,
        totalAmount: amount,
        donationCount: 1,
        lastDonatedAt: dateStr,
      });
    }
  }

  // 4. Convert to array and sort by totalAmount DESC
  const sorted = Array.from(donorMap.entries())
    .map(([donorId, data]) => ({
      donorId,
      donorType: data.type,
      totalAmount: data.totalAmount,
      donationCount: data.donationCount,
      lastDonatedAt: data.lastDonatedAt,
    }))
    .sort((a, b) => b.totalAmount - a.totalAmount);

  // 5. Apply limit and add ranks
  const entries: LeaderboardEntry[] = sorted.slice(0, limit).map((entry, index) => ({
    rank: index + 1,
    ...entry,
  }));

  return {
    entries,
    totalDonorsCount: donorMap.size,
    totalAmountSum: sorted.reduce((sum, e) => sum + e.totalAmount, 0),
  };
}
