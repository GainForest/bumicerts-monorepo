import { type NextRequest, NextResponse } from "next/server";
import { getIndexerCaller } from "@/lib/trpc/indexer/server";

/**
 * GET /api/check-organization?did=<did>
 *
 * Checks whether a given DID is indexed as a Gainforest organization.
 * Used by the mention tooltip to decide whether to show a "View profile" link.
 *
 * Returns: { isOrganization: boolean }
 *
 * Always returns 200 — the boolean tells the caller what it needs to know.
 * Errors are treated as "not an organization" to fail gracefully.
 */
export async function GET(req: NextRequest) {
  const did = req.nextUrl.searchParams.get("did");

  if (!did || !did.startsWith("did:")) {
    return NextResponse.json({ isOrganization: false });
  }

  try {
    const caller = await getIndexerCaller();
    const result = await caller.organization.byDid({ did });
    const isOrganization = result.org !== null;
    return NextResponse.json({ isOrganization });
  } catch {
    // Network/indexer errors → treat as not found
    return NextResponse.json({ isOrganization: false });
  }
}
