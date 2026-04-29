import { NextRequest } from "next/server";
import { z } from "zod";
import { signMessage, privateKeyToAccount } from "viem/accounts";
import { TRPCError } from "@trpc/server";
import { serverEnv } from "@/lib/env/server";
import { getServerCaller } from "@/lib/trpc/server";

export const dynamic = "force-dynamic";

const requestSchema = z.object({
  address: z.string().min(1),
  chainId: z.number().int().positive(),
  signature: z.string().min(1),
  message: z.object({
    did: z.string().min(1),
    evmAddress: z.string().min(1),
    chainId: z.string().min(1),
    timestamp: z.string().min(1),
    nonce: z.string().min(1),
  }),
  name: z.string().trim().min(1).max(80).optional(),
});

function isHexPrefixed(value: string): value is `0x${string}` {
  return /^0x[0-9a-fA-F]+$/.test(value);
}

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = requestSchema.safeParse(json);

  if (!parsed.success) {
    return Response.json(
      {
        error: "Invalid request body",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const body = parsed.data;

  if (body.address.toLowerCase() !== body.message.evmAddress.toLowerCase()) {
    return Response.json(
      { error: "address and message.evmAddress must match" },
      { status: 400 },
    );
  }

  if (!isHexPrefixed(body.signature)) {
    return Response.json(
      { error: "signature must be a hex string (0x...)" },
      { status: 400 },
    );
  }

  const platformPrivateKey = serverEnv.FACILITATOR_PRIVATE_KEY;
  if (!platformPrivateKey || !isHexPrefixed(platformPrivateKey)) {
    return Response.json(
      { error: "Platform signing key not configured" },
      { status: 500 },
    );
  }

  const platformAddress = privateKeyToAccount(platformPrivateKey).address;
  const platformSignature = await signMessage({
    privateKey: platformPrivateKey,
    message: { raw: body.signature },
  });

  try {
    const caller = await getServerCaller();
    const result = await caller.link.evm.create({
      ...(body.name ? { name: body.name } : {}),
      address: body.address,
      userProof: {
        $type: "app.bumicerts.link.evm#eip712Proof",
        signature: body.signature,
        message: {
          $type: "app.bumicerts.link.evm#eip712Message",
          did: body.message.did,
          evmAddress: body.message.evmAddress,
          chainId: body.message.chainId,
          timestamp: body.message.timestamp,
          nonce: body.message.nonce,
        },
      },
      platformAttestation: {
        $type: "app.bumicerts.link.evm#eip712PlatformAttestation",
        signature: platformSignature,
        platformAddress,
        signedData: body.signature,
      },
    });

    return Response.json({ uri: result.uri, rkey: result.rkey });
  } catch (error) {
    if (error instanceof TRPCError) {
      if (error.code === "UNAUTHORIZED") {
        return Response.json({ error: error.message }, { status: 401 });
      }
      if (error.code === "BAD_REQUEST") {
        return Response.json({ error: error.message }, { status: 400 });
      }
      return Response.json({ error: error.message }, { status: 500 });
    }

    console.error("[identity-link] Failed to write link.evm record", error);
    return Response.json({ error: "Failed to link wallet" }, { status: 500 });
  }
}
