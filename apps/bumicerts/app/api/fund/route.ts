/**
 * POST /api/fund
 *
 * x402-style funding endpoint with two modes:
 *
 * Mode A — Discovery (no PAYMENT-SIGNATURE header):
 *   Returns 402 with payment options so the frontend knows what to prepare.
 *
 * Mode B — Settlement (with PAYMENT-SIGNATURE header):
 *   1. Parses the EIP-3009 authorization from the header
 *   2. Verifies the recipient has a linked wallet via the indexer
 *   3. Calls USDC.transferWithAuthorization() on Base (facilitator pays gas)
 *   4. Writes an org.hypercerts.funding.receipt to the facilitator's ATProto repo
 *   5. Returns { success, transactionHash, receiptUri }
 */

import { NextRequest } from "next/server";
import type { AtUriString } from "@atproto/lex";
import { serverEnv } from "@/lib/env/server";
import { clientEnv } from "@/lib/env/client";
import { parsePaymentSignature } from "@/lib/facilitator/eip3009";
import { executeTransferWithAuthorization } from "@/lib/facilitator/index";
import {
  makeCredentialAgentLayer,
  mutations,
} from "@gainforest/atproto-mutations-core";
import { Effect } from "effect";
import { GraphQLClient } from "graphql-request";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Helpers — resolve recipient wallet
// ---------------------------------------------------------------------------

const ATTESTATION_QUERY = `
  query VerifyRecipient($did: String!) {
    bumicerts {
      link {
        evm(limit: 1, where: { did: $did, valid: true }) {
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

type AttestationQueryResult = {
  bumicerts: {
    link: {
      evm: {
        data: Array<{
          record: { address: string | null };
        }>;
      };
    };
  };
};

async function resolveRecipientWallet(
  orgDid: string
): Promise<`0x${string}` | null> {
  try {
    const client = new GraphQLClient(clientEnv.NEXT_PUBLIC_INDEXER_URL, {
      headers: { "ngrok-skip-browser-warning": "true" },
    });
    const data = await client.request<AttestationQueryResult>(
      ATTESTATION_QUERY,
      { did: orgDid }
    );
    const records = data?.bumicerts?.link?.evm?.data ?? [];
    if (!records.length || !records[0].record.address) return null;
    return records[0].record.address as `0x${string}`;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Activity CID resolver — fetches CID for an activity AT-URI from indexer
// ---------------------------------------------------------------------------

const ACTIVITY_CID_QUERY = `
  query GetActivityCid($did: String!, $rkey: String!) {
    hypercerts {
      claim {
        activity(where: { did: $did, rkey: $rkey }, limit: 1) {
          data {
            metadata {
              cid
            }
          }
        }
      }
    }
  }
`;

type ActivityCidQueryResult = {
  hypercerts: {
    claim: {
      activity: {
        data: Array<{
          metadata: { cid: string | null };
        }>;
      };
    };
  };
};

async function getActivityCid(activityUri: string): Promise<string> {
  // Parse AT-URI: at://did/collection/rkey
  const match = activityUri.match(/^at:\/\/([^/]+)\/[^/]+\/([^/]+)$/);
  if (!match) {
    throw new Error(`Invalid activity AT-URI format: ${activityUri}`);
  }
  const [, did, rkey] = match;

  try {
    const client = new GraphQLClient(clientEnv.NEXT_PUBLIC_INDEXER_URL, {
      headers: { "ngrok-skip-browser-warning": "true" },
    });
    const data = await client.request<ActivityCidQueryResult>(
      ACTIVITY_CID_QUERY,
      { did, rkey }
    );
    const records = data?.hypercerts?.claim?.activity?.data ?? [];
    if (!records.length || !records[0].metadata.cid) {
      throw new Error(`Activity CID not found for ${activityUri}`);
    }
    return records[0].metadata.cid;
  } catch (error) {
    throw new Error(
      `Failed to fetch activity CID for ${activityUri}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

// ---------------------------------------------------------------------------
// Facilitator ATProto layer — writes receipts to facilitator's own repo
// ---------------------------------------------------------------------------

function getFacilitatorLayer() {
  const handle = serverEnv.FACILITATOR_HANDLE;
  const did = clientEnv.NEXT_PUBLIC_FACILITATOR_DID;
  const password = serverEnv.FACILITATOR_PASSWORD;

  if (!handle) throw new Error("FACILITATOR_HANDLE env var is not set");
  if (!did) throw new Error("NEXT_PUBLIC_FACILITATOR_DID env var is not set");
  if (!password) throw new Error("FACILITATOR_PASSWORD env var is not set");

  return makeCredentialAgentLayer({
    service:    handle.split(".").slice(1).join(".") ?? "bsky.social",
    identifier: did,
    password,
  });
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  const paymentSig = req.headers.get("PAYMENT-SIGNATURE");

  // --- Mode A: Discovery ---
  if (!paymentSig) {
    let body: { activityUri?: string; orgDid?: string; amount?: string } = {};
    try { body = await req.json(); } catch { /* ignore */ }

    const recipientWallet = body.orgDid
      ? await resolveRecipientWallet(body.orgDid)
      : null;

    return Response.json(
      {
        paymentRequired: true,
        options: {
          crypto: {
            protocol:  "x402",
            network:   "Base",
            payTo:     recipientWallet ?? "0x0000000000000000000000000000000000000000",
            token:     "USDC",
            decimals:  6,
          },
        },
      },
      { status: 402 }
    );
  }

  // --- Mode B: Settlement ---
  let body: {
    activityUri?: string;
    orgDid?: string;
    amount?: string;
    currency?: string;
    donorDid?: string;
    anonymous?: boolean;
  } = {};
  try { body = await req.json(); } catch { /* ignore */ }

  // 1. Parse payment signature
  let payload: ReturnType<typeof parsePaymentSignature>;
  try {
    payload = parsePaymentSignature(paymentSig);
  } catch (err) {
    console.error("[fund] Failed to parse PAYMENT-SIGNATURE:", err);
    return Response.json(
      { error: "Invalid PAYMENT-SIGNATURE header" },
      { status: 400 }
    );
  }

  const { payload: { authorization, signature } } = payload;

  // 2. Resolve recipient wallet
  const recipientWallet = body.orgDid
    ? await resolveRecipientWallet(body.orgDid)
    : null;

  if (!recipientWallet) {
    return Response.json(
      { error: "Recipient has no linked wallet" },
      { status: 422 }
    );
  }

  // 2b. Verify authorization.to matches resolved recipient wallet
  // This prevents attacks where a malicious actor signs an authorization
  // sending funds to a different address than the org's linked wallet.
  if (authorization.to.toLowerCase() !== recipientWallet.toLowerCase()) {
    return Response.json(
      { error: "Authorization recipient does not match organization wallet" },
      { status: 422 }
    );
  }

  // 3. Execute on-chain transfer
  let transactionHash: `0x${string}`;
  try {
    const result = await executeTransferWithAuthorization({
      authorization,
      signature: signature as `0x${string}`,
    });
    transactionHash = result.transactionHash;
  } catch (err) {
    console.error("[fund] On-chain transfer failed:", err);
    return Response.json(
      { error: "On-chain transfer failed", details: String(err) },
      { status: 500 }
    );
  }

  // 4. Write funding receipt to facilitator's ATProto repo
  //
  // We use the core `mutations.funding.receipt.create` Effect directly with
  // `makeCredentialAgentLayer` (which yields CredentialLoginError, not the
  // UnauthorizedError/SessionExpiredError that the Next.js action wrapper
  // expects). This avoids the AgentLayer type mismatch.
  const agentLayer = getFacilitatorLayer();
  const amount = body.amount ?? String(Number(authorization.value) / 1e6);
  const now = new Date().toISOString();

  // Build `from` field:
  // - For anonymous donors: store wallet address using Text type
  // - For identified donors: wrap their DID as { $type, did }
  // - If donorDid is missing but anonymous is false, log warning and fallback to wallet address
  const fromValue = body.anonymous
    ? { $type: "org.hypercerts.funding.receipt#text" as const, value: authorization.from }
    : body.donorDid
      ? { $type: "app.certified.defs#did" as const, did: body.donorDid as `did:${string}:${string}` }
      : (() => {
          console.warn("[fund] donorDid missing but anonymous=false, falling back to wallet address");
          return { $type: "org.hypercerts.funding.receipt#text" as const, value: authorization.from };
        })();

  // Build `to` field: store recipient wallet address using Text type
  // The org DID can be derived from the `for` field (activity AT-URI contains org DID)
  const toValue = { $type: "org.hypercerts.funding.receipt#text" as const, value: recipientWallet };

  // Build `for` field: fetch CID for activity if activityUri is provided
  let forValue: { uri: AtUriString; cid: string } | undefined;
  if (body.activityUri) {
    try {
      const activityCid = await getActivityCid(body.activityUri);
      forValue = { uri: body.activityUri as AtUriString, cid: activityCid };
    } catch (error) {
      return Response.json(
        { 
          success: false, 
          error: `Failed to resolve activity CID: ${error instanceof Error ? error.message : String(error)}` 
        },
        { status: 400 }
      );
    }
  }

  // Build notes with template: "${sender} paid ${amt}${currency} using ${mode}"
  const currency = body.currency ?? "USDC";
  const notes = `${authorization.from} paid ${amount}${currency} using wallet`;

  const receiptEither = await Effect.runPromise(
    mutations.funding.receipt.create({
      from:           fromValue,
      to:             toValue,
      amount,
      currency,
      paymentRail:    "x402-usdc-base",
      paymentNetwork: "base",
      transactionId:  transactionHash,
      for:            forValue,
      notes,
      occurredAt:     now,
    }).pipe(
      Effect.provide(agentLayer),
      Effect.either
    )
  );

  let receiptUri: string | null = null;
  if (receiptEither._tag === "Right") {
    receiptUri = receiptEither.right.uri;
  } else {
    // Don't fail the payment — the money already moved. Just log and continue.
    console.error("[fund] Failed to write funding receipt:", receiptEither.left);
  }

  return Response.json({
    success:         true,
    transactionHash,
    receiptUri,
  });
}
