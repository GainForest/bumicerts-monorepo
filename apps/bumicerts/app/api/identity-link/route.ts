/**
 * POST /api/identity-link
 *
 * Links an EVM wallet address to the authenticated user's ATProto DID by
 * writing an app.bumicerts.link.evm record to their own PDS.
 *
 * Requires the user to be signed in (uses their OAuth session).
 * The record is written to their repo so they can prove ownership.
 *
 * The server generates the platform counter-signature (EIP-191 personal_sign)
 * over the user's raw signature using FACILITATOR_PRIVATE_KEY.
 *
 * Request body:
 * {
 *   address: string,       // EVM wallet address (0x...)
 *   chainId: number,       // 8453 for Base
 *   signature: string,     // EIP-712 signature from wallet
 *   message: {
 *     did: string,
 *     evmAddress: string,
 *     chainId: string,
 *     timestamp: string,
 *     nonce: string,
 *   },
 *   name?: string,         // optional human-readable label for the wallet
 * }
 *
 * Response:
 *   { uri: string, rkey: string }
 */

import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { makeUserAgentLayer } from "@gainforest/atproto-mutations-next/server";
import { createLinkEvmAction } from "@gainforest/atproto-mutations-next/actions";
import { serverEnv } from "@/lib/env/server";
import { signMessage, privateKeyToAccount } from "viem/accounts";

export const dynamic = "force-dynamic";

type RequestBody = {
  address: string;
  chainId: number;
  signature: string;
  message: {
    did: string;
    evmAddress: string;
    chainId: string;
    timestamp: string;
    nonce: string;
  };
  /** Optional human-readable label for the wallet. */
  name?: string;
};

export async function POST(req: NextRequest) {
  // --- Build agent layer from user's OAuth session ---
  const agentLayer = makeUserAgentLayer(auth);

  // --- Parse body ---
  let body: RequestBody;
  try {
    body = await req.json() as RequestBody;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // --- Validate required fields ---
  if (
    !body.address ||
    !body.chainId ||
    !body.signature ||
    !body.message
  ) {
    return Response.json(
      { error: "Missing required fields: address, chainId, signature, message" },
      { status: 400 }
    );
  }

  // --- Platform counter-sign the user's signature (EIP-191 personal_sign) ---
  const platformPrivateKey = serverEnv.FACILITATOR_PRIVATE_KEY as `0x${string}` | undefined;
  if (!platformPrivateKey) {
    return Response.json(
      { error: "Platform signing key not configured" },
      { status: 500 }
    );
  }
  const platformAccount = privateKeyToAccount(platformPrivateKey);
  const platformSignature = await signMessage({
    privateKey:  platformPrivateKey,
    message:     { raw: body.signature as `0x${string}` },
  });
  const platformAddress = platformAccount.address;

  // --- Write link.evm record ---
  const result = await createLinkEvmAction(
    {
      ...(body.name ? { name: body.name } : {}),
      address: body.address,
      userProof: {
        $type: "app.bumicerts.link.evm#eip712Proof",
        signature: body.signature,
        message: {
          $type: "app.bumicerts.link.evm#eip712Message",
          did:        body.message.did as `did:${string}:${string}`,
          evmAddress: body.message.evmAddress,
          chainId:    body.message.chainId,
          timestamp:  body.message.timestamp,
          nonce:      body.message.nonce,
        },
      },
      platformAttestation: {
        $type: "app.bumicerts.link.evm#eip712PlatformAttestation",
        signature:       platformSignature,
        platformAddress: platformAddress,
        signedData:      body.signature, // platform signed over the user's raw sig
      },
    },
    agentLayer
  );

  if (!result.success) {
    const code = result.code;
    if (code === "UNAUTHORIZED") {
      return Response.json(
        { error: "Not authenticated — please sign in first" },
        { status: 401 }
      );
    }
    if (code === "SESSION_EXPIRED") {
      return Response.json(
        { error: "Session expired — please sign in again" },
        { status: 401 }
      );
    }
    console.error("[identity-link] Failed to write link.evm record:", result);
    return Response.json(
      { error: result.message ?? "Failed to write link.evm record" },
      { status: 500 }
    );
  }

  return Response.json({
    uri:  result.data.uri,
    rkey: result.data.rkey,
  });
}
