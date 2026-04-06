/**
 * USDC on Base — constants and minimal ABI for EIP-3009 TransferWithAuthorization.
 *
 * Contract: https://basescan.org/address/0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
 * EIP-3009: https://eips.ethereum.org/EIPS/eip-3009
 */

// ---------------------------------------------------------------------------
// Network constants
// ---------------------------------------------------------------------------

export const CHAIN_ID = 8453 as const;           // Base mainnet
export const CHAIN_ID_TESTNET = 84532 as const;  // Base Sepolia

export const USDC_CONTRACT = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as const;
export const DECIMALS = 6 as const;

// ---------------------------------------------------------------------------
// EIP-3009 typed data domain
// ---------------------------------------------------------------------------

export const EIP3009_DOMAIN_NAME = "USD Coin" as const;
export const EIP3009_DOMAIN_VERSION = "2" as const;

export const EIP3009_TYPES = {
  TransferWithAuthorization: [
    { name: "from",        type: "address" },
    { name: "to",          type: "address" },
    { name: "value",       type: "uint256" },
    { name: "validAfter",  type: "uint256" },
    { name: "validBefore", type: "uint256" },
    { name: "nonce",       type: "bytes32" },
  ],
} as const;

// ---------------------------------------------------------------------------
// Minimal EIP-3009 ABI — only the functions we call
// ---------------------------------------------------------------------------

export const USDC_ABI = [
  // balanceOf(address owner) view returns (uint256)
  {
    inputs: [{ name: "owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  // transferWithAuthorization(from, to, value, validAfter, validBefore, nonce, v, r, s)
  {
    inputs: [
      { name: "from",        type: "address" },
      { name: "to",          type: "address" },
      { name: "value",       type: "uint256" },
      { name: "validAfter",  type: "uint256" },
      { name: "validBefore", type: "uint256" },
      { name: "nonce",       type: "bytes32" },
      { name: "v",           type: "uint8"   },
      { name: "r",           type: "bytes32" },
      { name: "s",           type: "bytes32" },
    ],
    name: "transferWithAuthorization",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert a human-readable USDC amount (e.g. "25.00") to the 6-decimal bigint */
export function toUsdcUnits(amount: number): bigint {
  return BigInt(Math.round(amount * 10 ** DECIMALS));
}

/** Convert raw USDC units (bigint) back to a human-readable string */
export function fromUsdcUnits(units: bigint): string {
  const whole = units / BigInt(10 ** DECIMALS);
  const frac  = units % BigInt(10 ** DECIMALS);
  const fracStr = frac.toString().padStart(DECIMALS, "0").replace(/0+$/, "");
  return fracStr ? `${whole}.${fracStr}` : `${whole}`;
}
