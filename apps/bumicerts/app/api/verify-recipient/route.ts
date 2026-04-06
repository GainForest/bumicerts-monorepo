/**
 * GET /api/verify-recipient?did=<orgDid>
 *
 * Checks whether an organization has a valid linked EVM wallet by querying
 * the indexer for app.bumicerts.link.evm records authored by that DID,
 * filtered to only cryptographically valid ones (valid: true).
 *
 * Response:
 *   { hasAttestation: true,  address: "0x...", chainId: 8453 }
 *   { hasAttestation: false }
 */

import { NextRequest } from "next/server";
import { clientEnv } from "@/lib/env/client";
import { GraphQLClient } from "graphql-request";

export const dynamic = "force-dynamic";

const INDEXER_URL = clientEnv.NEXT_PUBLIC_INDEXER_URL;

// ---------------------------------------------------------------------------
// GraphQL query — queries app.bumicerts.link.evm with valid:true filter
// ---------------------------------------------------------------------------

const LINK_EVM_QUERY = `
  query VerifyRecipient($did: String!) {
    bumicerts {
      link {
        evm(
          limit: 1
          where: { did: $did, valid: true }
        ) {
          data {
            record {
              address
            }
          }
        }
      }
    }
  }
`;

type LinkEvmQueryResult = {
  bumicerts: {
    link: {
      evm: {
        data: Array<{
          record: {
            address: string | null;
          };
        }>;
      };
    };
  };
};

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
    const client = new GraphQLClient(INDEXER_URL, {
      headers: { "ngrok-skip-browser-warning": "true" },
    });

    const data = await client.request<LinkEvmQueryResult>(
      LINK_EVM_QUERY,
      { did }
    );

    const records = data?.bumicerts?.link?.evm?.data ?? [];

    if (records.length === 0 || !records[0].record.address) {
      return Response.json({ hasAttestation: false });
    }

    const { address } = records[0].record;

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
