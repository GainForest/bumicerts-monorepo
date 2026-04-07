/**
 * POST /api/fund/batch
 *
 * Batch checkout funding endpoint for cart checkout.
 *
 * Flow:
 *   1. User signs ONE EIP-3009 authorization transferring total USDC to facilitator
 *   2. Facilitator receives USDC
 *   3. Facilitator executes separate transfers to each org's wallet
 *   4. Facilitator writes one funding receipt per bumicert
 *
 * Request body:
 *   {
 *     items: Array<{ activityUri, orgDid, amount }>,
 *     totalAmount: string,
 *     currency: "USDC",
 *     donorDid?: string,
 *     anonymous?: boolean,
 *   }
 *
 * Headers:
 *   PAYMENT-SIGNATURE: base64-encoded EIP-3009 authorization (to facilitator)
 */

import { NextRequest } from "next/server";
import type { AtUriString } from "@atproto/lex";
import { serverEnv } from "@/lib/env/server";
import { clientEnv } from "@/lib/env/client";
import { parsePaymentSignature } from "@/lib/facilitator/eip3009";
import { executeTransferWithAuthorization, executeSimpleTransfer } from "@/lib/facilitator/index";
import {
  makeCredentialAgentLayer,
  mutations,
} from "@gainforest/atproto-mutations-core";
import { Effect } from "effect";
import { GraphQLClient } from "graphql-request";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type BatchItem = {
  activityUri: string;
  orgDid: string;
  amount: string;
};

type BatchRequestBody = {
  items: BatchItem[];
  totalAmount: string;
  currency?: string;
  donorDid?: string;
  anonymous?: boolean;
};

type BatchItemResult = {
  activityUri: string;
  orgDid: string;
  amount: string;
  recipientWallet: string;
  transactionHash: string;
  receiptUri: string | null;
  success: boolean;
  error?: string;
};

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

  if (!paymentSig) {
    return Response.json(
      { error: "PAYMENT-SIGNATURE header is required for batch checkout" },
      { status: 400 }
    );
  }

  // Parse request body
  let body: BatchRequestBody;
  try {
    body = await req.json();
  } catch {
    return Response.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  // Validate body structure
  if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
    return Response.json(
      { error: "items array is required and must not be empty" },
      { status: 400 }
    );
  }

  if (!body.totalAmount) {
    return Response.json(
      { error: "totalAmount is required" },
      { status: 400 }
    );
  }

  // Parse payment signature
  let payload: ReturnType<typeof parsePaymentSignature>;
  try {
    payload = parsePaymentSignature(paymentSig);
  } catch (err) {
    console.error("[fund/batch] Failed to parse PAYMENT-SIGNATURE:", err);
    return Response.json(
      { error: "Invalid PAYMENT-SIGNATURE header" },
      { status: 400 }
    );
  }

  const { payload: { authorization, signature } } = payload;

  // Get facilitator wallet address
  const facilitatorWallet = clientEnv.NEXT_PUBLIC_FACILITATOR_WALLET_ADDRESS;
  if (!facilitatorWallet) {
    return Response.json(
      { error: "Facilitator wallet address not configured" },
      { status: 500 }
    );
  }

  // Verify that the authorization is sending to the facilitator
  if (authorization.to.toLowerCase() !== facilitatorWallet.toLowerCase()) {
    return Response.json(
      { error: "Authorization must be to the facilitator wallet for batch checkout" },
      { status: 422 }
    );
  }

  // Verify total amount matches
  const authAmount = Number(authorization.value) / 1e6;
  const expectedTotal = parseFloat(body.totalAmount);
  if (Math.abs(authAmount - expectedTotal) > 0.01) {
    return Response.json(
      { error: `Authorization amount (${authAmount}) does not match total (${expectedTotal})` },
      { status: 422 }
    );
  }

  // Resolve all recipient wallets first
  const resolvedItems: Array<{
    item: BatchItem;
    wallet: `0x${string}` | null;
  }> = await Promise.all(
    body.items.map(async (item) => ({
      item,
      wallet: await resolveRecipientWallet(item.orgDid),
    }))
  );

  // Check for any missing wallets
  const missingWallets = resolvedItems.filter((r) => !r.wallet);
  if (missingWallets.length > 0) {
    return Response.json(
      {
        error: "Some organizations have no linked wallet",
        missingOrgs: missingWallets.map((r) => r.item.orgDid),
      },
      { status: 422 }
    );
  }

  // Step 1: Execute transfer from donor to facilitator
  let donorToFacilitatorHash: `0x${string}`;
  try {
    const result = await executeTransferWithAuthorization({
      authorization,
      signature: signature as `0x${string}`,
    });
    donorToFacilitatorHash = result.transactionHash;
  } catch (err) {
    console.error("[fund/batch] Donor->Facilitator transfer failed:", err);
    return Response.json(
      { error: "Failed to receive funds from donor", details: String(err) },
      { status: 500 }
    );
  }

  // Step 2: Distribute to each organization
  const agentLayer = getFacilitatorLayer();
  const now = new Date().toISOString();

  // Build `from` field:
  // - For anonymous donors: store wallet address using Text type
  // - For identified donors: wrap their DID as { $type, did }
  const fromValue = body.anonymous || !body.donorDid
    ? { $type: "org.hypercerts.funding.receipt#text" as const, value: authorization.from }
    : { $type: "app.certified.defs#did" as const, did: body.donorDid as `did:${string}:${string}` };

  const currency = body.currency ?? "USDC";
  
  // Prefetch all activity CIDs in parallel to avoid N+1 queries
  const activityCids = await Promise.all(
    resolvedItems.map(async ({ item }) => {
      try {
        const cid = await getActivityCid(item.activityUri);
        return { activityUri: item.activityUri, cid };
      } catch (error) {
        console.error(`[fund/batch] Failed to fetch CID for ${item.activityUri}:`, error);
        return { activityUri: item.activityUri, cid: null };
      }
    })
  );
  
  // Build lookup map for quick access
  const cidMap = new Map(
    activityCids.map((entry) => [entry.activityUri, entry.cid])
  );
  
  // Check if any CIDs failed to resolve
  const missingCids = activityCids.filter((entry) => !entry.cid);
  if (missingCids.length > 0) {
    return Response.json(
      {
        error: "Failed to resolve activity CIDs for some items",
        missingCids: missingCids.map((entry) => entry.activityUri),
      },
      { status: 422 }
    );
  }

  const results: BatchItemResult[] = [];

  for (const { item, wallet } of resolvedItems) {
    const recipientWallet = wallet as `0x${string}`;
    const amountNumber = parseFloat(item.amount);

    let transactionHash: `0x${string}` = "0x" as `0x${string}`;
    let success = false;
    let error: string | undefined;

    try {
      // Transfer from facilitator to org
      const result = await executeSimpleTransfer({
        to: recipientWallet,
        amount: amountNumber,
      });
      transactionHash = result.transactionHash;
      success = true;
    } catch (err) {
      console.error(`[fund/batch] Facilitator->${item.orgDid} transfer failed:`, err);
      error = err instanceof Error ? err.message : String(err);
    }

    // Write funding receipt (even if transfer failed, to record the attempt)
    let receiptUri: string | null = null;
    if (success) {
      const notes = `${authorization.from} paid ${item.amount}${currency} using wallet`;
      
      // Build `to` field: store recipient wallet address using Text type
      // The org DID can be derived from the `for` field (activity AT-URI contains org DID)
      const toValue = { $type: "org.hypercerts.funding.receipt#text" as const, value: recipientWallet };
      
      // Build `for` field with CID from prefetched map
      const activityCid = cidMap.get(item.activityUri);
      if (!activityCid) {
        console.error(`[fund/batch] Missing CID for ${item.activityUri}, skipping receipt`);
      } else {
        const forValue = { uri: item.activityUri as AtUriString, cid: activityCid };
        
        const receiptEither = await Effect.runPromise(
          mutations.funding.receipt.create({
            from:           fromValue,
            to:             toValue,
            amount:         item.amount,
            currency,
            paymentRail:    "x402-usdc-base-batch",
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

        if (receiptEither._tag === "Right") {
          receiptUri = receiptEither.right.uri;
        } else {
          console.error(`[fund/batch] Failed to write receipt for ${item.activityUri}:`, receiptEither.left);
        }
      }
    }

    results.push({
      activityUri:     item.activityUri,
      orgDid:          item.orgDid,
      amount:          item.amount,
      recipientWallet: recipientWallet,
      transactionHash: transactionHash,
      receiptUri:      receiptUri,
      success:         success,
      error:           error,
    });
  }

  // Check if all succeeded
  const allSucceeded = results.every((r) => r.success);
  const successCount = results.filter((r) => r.success).length;

  return Response.json({
    success:                 allSucceeded,
    donorToFacilitatorHash:  donorToFacilitatorHash,
    totalAmount:             body.totalAmount,
    itemCount:               results.length,
    successCount:            successCount,
    results:                 results,
  });
}
