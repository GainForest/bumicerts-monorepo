/**
 * Facilitator — on-chain execution layer.
 *
 * Uses the facilitator's private key to call USDC.transferWithAuthorization()
 * on Base mainnet. The facilitator pays gas but NEVER holds USDC — funds move
 * directly from the donor's wallet to the recipient's wallet.
 */

import {
  createPublicClient,
  createWalletClient,
  http,
  parseUnits,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import { serverEnv } from "@/lib/env/server";
import { USDC_ABI, USDC_CONTRACT, DECIMALS } from "./usdc";
import { splitSignature, type Eip3009Authorization } from "./eip3009";

// ---------------------------------------------------------------------------
// Viem clients (lazily initialised — avoids module-level env access at import)
// ---------------------------------------------------------------------------

function getFacilitatorAccount() {
  const pk = serverEnv.FACILITATOR_PRIVATE_KEY;
  return privateKeyToAccount(pk as `0x${string}`);
}

function getPublicClient() {
  return createPublicClient({
    chain: base,
    transport: http(serverEnv.BASE_RPC_URL),
  });
}

function getWalletClient() {
  return createWalletClient({
    chain: base,
    transport: http(serverEnv.BASE_RPC_URL),
    account: getFacilitatorAccount(),
  });
}

// ---------------------------------------------------------------------------
// executeTransferWithAuthorization
// ---------------------------------------------------------------------------

export type TransferWithAuthParams = {
  authorization: Eip3009Authorization;
  signature: `0x${string}`;
};

export type TransferWithAuthResult = {
  transactionHash: `0x${string}`;
};

/**
 * Calls USDC.transferWithAuthorization() on Base mainnet.
 * The facilitator pays gas; USDC moves directly donor → recipient.
 */
export async function executeTransferWithAuthorization(
  params: TransferWithAuthParams
): Promise<TransferWithAuthResult> {
  const { authorization, signature } = params;
  const { v, r, s } = splitSignature(signature);

  const walletClient = getWalletClient();
  const publicClient = getPublicClient();

  const account = getFacilitatorAccount();

  const txHash = await walletClient.writeContract({
    address: USDC_CONTRACT,
    abi:     USDC_ABI,
    functionName: "transferWithAuthorization",
    account,
    args: [
      authorization.from,
      authorization.to,
      BigInt(authorization.value),
      BigInt(authorization.validAfter),
      BigInt(authorization.validBefore),
      authorization.nonce as `0x${string}`,
      v,
      r,
      s,
    ],
  });

  // Wait for confirmation
  await publicClient.waitForTransactionReceipt({ hash: txHash });

  return { transactionHash: txHash };
}

// ---------------------------------------------------------------------------
// executeSimpleTransfer — direct USDC transfer from facilitator to recipient
// ---------------------------------------------------------------------------

export type SimpleTransferParams = {
  to: `0x${string}`;
  amount: number;
};

export type SimpleTransferResult = {
  transactionHash: `0x${string}`;
};

/**
 * Executes a direct USDC transfer from the facilitator's wallet to a recipient.
 * Used for batch checkout distribution — facilitator receives total from donor,
 * then distributes to each org.
 */
export async function executeSimpleTransfer(
  params: SimpleTransferParams
): Promise<SimpleTransferResult> {
  const { to, amount } = params;

  const walletClient = getWalletClient();
  const publicClient = getPublicClient();
  const account = getFacilitatorAccount();

  // Convert amount to USDC units (6 decimals)
  const value = parseUnits(amount.toString(), DECIMALS);

  const txHash = await walletClient.writeContract({
    address:      USDC_CONTRACT,
    abi:          USDC_TRANSFER_ABI,
    functionName: "transfer",
    account,
    args:         [to, value],
  });

  // Wait for confirmation
  await publicClient.waitForTransactionReceipt({ hash: txHash });

  return { transactionHash: txHash };
}

// Minimal ABI for simple transfer
const USDC_TRANSFER_ABI = [
  {
    inputs: [
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
    ],
    name: "transfer",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;
