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
import { fetchCidByAtUri } from "@/graphql/indexer/queries/activities";
import { fetchVerifiedAddress } from "@/graphql/indexer/queries/linkEvm";
import {
  makeCredentialAgentLayer,
  mutations,
} from "@gainforest/atproto-mutations-core";
import { Effect } from "effect";

export const dynamic = "force-dynamic";

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
      signature,
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

  const donorRecordedAs = donorChoseAnonymous ? "wallet" : "did";

  const receiptSender: ReceiptSender = donorChoseAnonymous
    ? { $type: "org.hypercerts.funding.receipt#text", value: authorization.from }
    : (() => {
        if (!donorDid) {
          throw new Error("donorDid should be set for non-anonymous donation");
        }
        return { $type: "app.certified.defs#did", did: donorDid };
      })();

  const receiptRecipient: ReceiptText = {
    $type: "org.hypercerts.funding.receipt#text",
    value: recipientWallet,
  };

  let receiptSubject: { uri: AtUriString; cid: string } | undefined;
  if (body.activityUri) {
    if (!isAtUriString(body.activityUri)) {
      return Response.json(
        { success: false, error: "Invalid activity link." },
        { status: 400 }
      );
    }

    try {
      const activityCid = await getActivityCid(body.activityUri);
      receiptSubject = { uri: body.activityUri, cid: activityCid };
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

  const currency = body.currency ?? "USDC";
  const notes = `${authorization.from} paid ${amount}${currency} using wallet`;

  const receiptEither = await Effect.runPromise(
    mutations.funding.receipt.create({
      from:           receiptSender,
      to:             receiptRecipient,
      amount,
      currency,
      paymentRail:    "x402-usdc-base",
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
    donorRecordedAs,
  });
}
