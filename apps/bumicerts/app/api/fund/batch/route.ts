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
import { fetchCidByAtUri } from "@/lib/graphql-dev/queries/activities";
import { fetchVerifiedAddress } from "@/lib/graphql-dev/queries/linkEvm";
import {
  makeCredentialAgentLayer,
  mutations,
} from "@gainforest/atproto-mutations-core";
import { Effect } from "effect";

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

type HexAddress = `0x${string}`;
type DidIdentifier = `did:${string}:${string}`;

type ReceiptSender =
  | { $type: "org.hypercerts.funding.receipt#text"; value: string }
  | { $type: "app.certified.defs#did"; did: DidIdentifier };

type ReceiptText = { $type: "org.hypercerts.funding.receipt#text"; value: string };

function isHexAddress(value: string): value is HexAddress {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

function isDidIdentifier(value: string): value is DidIdentifier {
  return /^did:[a-z0-9]+:.+$/i.test(value);
}

function isAtUriString(value: string): value is AtUriString {
  return /^at:\/\/[^/]+\/[a-z0-9.]+\/.+$/i.test(value);
}

async function resolveRecipientWallet(
  orgDid: string
): Promise<HexAddress | null> {
  try {
    const resolvedAddress = await fetchVerifiedAddress(orgDid);
    if (!resolvedAddress || !isHexAddress(resolvedAddress)) {
      return null;
    }
    return resolvedAddress;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Activity CID resolver — fetches CID for an activity AT-URI from indexer
// ---------------------------------------------------------------------------

async function getActivityCid(activityUri: string): Promise<string> {
  if (!isAtUriString(activityUri)) {
    throw new Error(`Invalid activity AT-URI format: ${activityUri}`);
  }

  try {
    const cid = await fetchCidByAtUri(activityUri);
    if (!cid) {
      throw new Error(`Activity CID not found for ${activityUri}`);
    }

    return cid;
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

  if (typeof body.anonymous !== "boolean") {
    return Response.json(
      { error: "Please choose whether to donate anonymously." },
      { status: 400 }
    );
  }

  const donorChoseAnonymous = body.anonymous;
  let donorDid: DidIdentifier | undefined;

  if (!donorChoseAnonymous) {
    if (!body.donorDid || !isDidIdentifier(body.donorDid)) {
      return Response.json(
        {
          code: "NON_ANONYMOUS_DONATION_REQUIRES_DONOR_DID",
          error: "We couldn’t link this donation to your profile. Please sign in again or donate anonymously.",
        },
        { status: 422 }
      );
    }
    donorDid = body.donorDid;
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
  const facilitatorWalletValue = clientEnv.NEXT_PUBLIC_FACILITATOR_WALLET_ADDRESS;
  if (!facilitatorWalletValue || !isHexAddress(facilitatorWalletValue)) {
    return Response.json(
      { error: "Facilitator wallet address not configured" },
      { status: 500 }
    );
  }
  const facilitatorWallet = facilitatorWalletValue;

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
    wallet: HexAddress | null;
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
      signature,
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

  const donorRecordedAs = donorChoseAnonymous ? "wallet" : "did";

  const receiptSender: ReceiptSender = donorChoseAnonymous
    ? { $type: "org.hypercerts.funding.receipt#text", value: authorization.from }
    : (() => {
        if (!donorDid) {
          throw new Error("donorDid should be set for non-anonymous donation");
        }
        return { $type: "app.certified.defs#did", did: donorDid };
      })();

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

  for (let index = 0; index < resolvedItems.length; index++) {
    const { item, wallet } = resolvedItems[index];
    if (!wallet) {
      results.push({
        activityUri: item.activityUri,
        orgDid: item.orgDid,
        amount: item.amount,
        recipientWallet: "",
        transactionHash: "",
        receiptUri: null,
        success: false,
        error: "Recipient wallet is missing",
      });
      continue;
    }

    const recipientWallet = wallet;
    const amountNumber = parseFloat(item.amount);

    console.log(`[fund/batch] Processing item ${index + 1}/${resolvedItems.length} for ${item.activityUri}`);

    let transactionHash = "";
    let success = false;
    let error: string | undefined;

    try {
      // Transfer from facilitator to org
      console.log(`[fund/batch] Executing transfer to ${recipientWallet} for ${amountNumber} USDC`);
      const result = await executeSimpleTransfer({
        to: recipientWallet,
        amount: amountNumber,
      });
      transactionHash = result.transactionHash;
      success = true;
      console.log(`[fund/batch] ✓ Transfer successful: ${transactionHash}`);
    } catch (err) {
      console.error(`[fund/batch] Facilitator->${item.orgDid} transfer failed:`, err);
      error = err instanceof Error ? err.message : String(err);
    }

    // Write funding receipt (even if transfer failed, to record the attempt)
    let receiptUri: string | null = null;
    if (success) {
      const notes = `${authorization.from} paid ${item.amount}${currency} using wallet`;
      
      const receiptRecipient: ReceiptText = {
        $type: "org.hypercerts.funding.receipt#text",
        value: recipientWallet,
      };
      
      // Build `for` field with CID from prefetched map
      const activityCid = cidMap.get(item.activityUri);
      if (!activityCid) {
        console.error(`[fund/batch] Missing CID for ${item.activityUri}, skipping receipt`);
      } else {
        if (!isAtUriString(item.activityUri)) {
          console.error(`[fund/batch] Invalid activity URI for receipt: ${item.activityUri}`);
        } else {
          const receiptSubject = { uri: item.activityUri, cid: activityCid };
        
          console.log(`[fund/batch] Creating receipt for ${item.activityUri}...`);
          const receiptEither = await Effect.runPromise(
            mutations.funding.receipt.create({
              from:           receiptSender,
              to:             receiptRecipient,
              amount:         item.amount,
              currency,
              paymentRail:    "x402-usdc-base-batch",
              paymentNetwork: "base",
              transactionId:  transactionHash,
              for:            receiptSubject,
              notes,
              occurredAt:     now,
            }).pipe(
              Effect.provide(agentLayer),
              Effect.either
            )
          );

          if (receiptEither._tag === "Right") {
            receiptUri = receiptEither.right.uri;
            console.log(`[fund/batch] ✓ Receipt created: ${receiptUri}`);
          } else {
            console.error(`[fund/batch] ✗ Receipt creation failed for ${item.activityUri}:`, receiptEither.left);
          }
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
    donorRecordedAs,
    itemCount:               results.length,
    successCount:            successCount,
    results:                 results,
  });
}
