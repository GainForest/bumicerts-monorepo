/**
 * GET /api/verify-recipient?did=<orgDid>
 *
 * Checks whether an organization has a valid linked EVM wallet by querying
 * the indexer for app.gainforest.link.evm records authored by that DID,
 * filtered to only cryptographically valid ones (valid: true).
 *
 * Response:
 *   { hasAttestation: true,  address: "0x...", chainId: 8453 }
 *   { hasAttestation: false }
 */

import { NextRequest } from "next/server";
import { fetchVerifiedAddress } from "@/graphql/indexer/queries/linkEvm";

export const dynamic = "force-dynamic";
// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const did = searchParams.get("did");

  if (!did) {
    return Response.json({ error: "Missing did parameter" }, { status: 400 });
  }

  // --- Query indexer for valid link.evm records ---
  try {
    const address = await fetchVerifiedAddress(did);
    if (!address) {
      return Response.json({ hasAttestation: false });
    }

    return Response.json({
      hasAttestation: true,
      address,
      chainId: 8453, // Base — all link.evm records are Base-chain
    });
  } catch (err) {
    console.error("[verify-recipient] GraphQL error:", err);
    return Response.json(
      { error: "Failed to query indexer" },
      { status: 500 }
    );
  }
}
