# Bumicerts Donation Feature — Implementation Plan

## Executive Summary

| Aspect | Decision |
|--------|----------|
| **Payment Method** | USDC on Base (Chain ID 8453) via x402 protocol |
| **Transaction Model** | Facilitator-sponsored (server pays gas, never holds USDC) |
| **Donor Auth** | Anonymous allowed (wallet address stored in receipt) |
| **Donor ID (anonymous)** | EVM wallet address (0x...) |
| **Receipt Storage** | Facilitator's own ATProto repo (no org delegation needed) |
| **Stripe** | Deferred to Phase 2 — "Coming soon" label on button |
| **Donate Button Visibility** | Always visible and enabled on every bumicert, regardless of whether org has set up wallet |
| **Org Eligibility Check** | Never gate the button — surface "org hasn't set up donations" inside the modal if wallet attestation is missing |
| **Modal System** | Existing `useModal()` + `ModalContent`/`ModalHeader`/`ModalFooter` components |
| **Mutations** | New mutations added in `mutations-core` and `mutations-next` packages |

---

## Answers to Key Design Questions

### Who creates the funding receipt and acknowledgment records?

**Funding Receipt (`org.hypercerts.funding.receipt`):**
- **Created by:** The server/facilitator after the on-chain transaction succeeds.
- **Written to:** A central **facilitator's own ATProto repo** (e.g. `did:plc:gainforest-facilitator`). This avoids requiring OAuth delegation from every org.
- **Contains:** `from` (donor wallet address or donor DID), `to` (recipient org DID), `amount`, `currency`, `transactionId`, `for` (bumicert AT-URI), `paymentRail: "x402-usdc-base"`, `paymentNetwork: "base"`.

**Funding Acknowledgment (`org.bumicerts.funding.acknowledgment`):**
- **Created by:** The donor (optional, requires ATProto login).
- **Written to:** The donor's own ATProto repo.
- **Purpose:** Counter-signature proving "I made this donation" — adds a higher verification tier.
- **When:** After receipt exists, donor can choose to "claim" the donation, triggering an EIP-712 acknowledgment.
- **Phase:** Deferred — implement after core donation flow works.

### Do we need new mutations in the monorepo packages?

**Yes.** Two new entities in `mutations-core`, with corresponding server actions in `mutations-next`:

| Package | New Mutations |
|---------|---------------|
| `mutations-core` | `funding.receipt/create.ts`, `link.attestation/create.ts` |
| `mutations-next/actions` | `createFundingReceiptAction()`, `createLinkAttestationAction()` |

The `funding.receipt` mutation is used **server-side only** (by the facilitator). The `link.attestation` mutation is used when an org admin (or donor) links their wallet — signed with the user's own ATProto OAuth session.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                    BUMICERTS DONATION ARCHITECTURE                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐                        ┌──────────────────────┐  │
│  │   FRONTEND   │                        │      FACILITATOR     │  │
│  │  (Next.js)   │                        │      (Server)        │  │
│  └──────┬───────┘                        └──────────┬───────────┘  │
│         │                                           │              │
│         │ 1. User signs EIP-3009                    │              │
│         │    authorization (gasless)                │              │
│         ▼                                           │              │
│  ┌──────────────┐    2. POST /api/fund    ┌─────────▼──────────┐  │
│  │  Wallet      │──────────────────────▶ │ Parse signature     │  │
│  │  (RainbowKit)│    (PAYMENT-SIGNATURE)  │ Verify recipient    │  │
│  └──────────────┘                         └─────────┬──────────┘  │
│                                                      │             │
│                                    3. Execute on-chain             │
│                                    ┌─────────────────▼───────────┐ │
│                                    │  USDC.transferWithAuth()    │ │
│                                    │  Base Network (Chain 8453)  │ │
│                                    └─────────────────┬───────────┘ │
│                                                      │             │
│                                    4. Write receipt to ATProto    │
│                                    ┌─────────────────▼───────────┐ │
│                                    │  org.hypercerts.funding     │ │
│                                    │  .receipt                   │ │
│                                    │  (Facilitator's PDS repo)   │ │
│                                    └─────────────────────────────┘ │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### USDC / Chain Constants

```ts
// lib/facilitator/usdc.ts
export const USDC_CONTRACT     = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
export const CHAIN_ID          = 8453          // Base mainnet
export const CHAIN_ID_TESTNET  = 84532         // Base Sepolia
export const DECIMALS          = 6
```

### EIP-3009 Flow (gasless USDC transfer)

1. Frontend builds a `TransferWithAuthorization` typed-data payload.
2. User signs with their wallet (no gas required from user).
3. Signature is sent to `/api/fund` as the `PAYMENT-SIGNATURE` header (base64-encoded JSON).
4. Facilitator calls `USDC.transferWithAuthorization(from, to, value, validAfter, validBefore, nonce, v, r, s)` — facilitator pays gas from its own ETH balance.
5. USDC moves directly from donor wallet → recipient wallet. Facilitator never holds USDC.

---

## Complete File Structure

```
├── app/
│   ├── api/
│   │   ├── fund/
│   │   │   └── route.ts                     # x402-style: 402 discovery + settlement
│   │   ├── verify-recipient/
│   │   │   └── route.ts                     # Check if org has wallet attestation
│   │   └── identity-link/
│   │       └── route.ts                     # Write wallet attestation (user's session)
│   │
│   └── (marketplace)/
│       └── bumicert/[bumicertId]/
│           └── _components/
│               ├── BumicertSidebar.tsx      # MODIFY: Replace buttons with DonateButton
│               └── donate/                  # NEW DIRECTORY
│                   ├── DonateButton.tsx     # Button + sign-in prompt (auth-aware)
│                   ├── AmountModal.tsx      # Modal 1: Amount input + method selection
│                   ├── WalletModal.tsx      # Modal 2: Connect wallet + switch network
│                   ├── ConfirmModal.tsx     # Modal 3+4: Confirm + live tx status
│                   ├── SuccessModal.tsx     # Modal 5: Success + receipt
│                   ├── LinkWalletModal.tsx  # Identity-linking sub-flow
│                   ├── hooks/
│                   │   ├── useDonateFlow.ts      # State machine for the full flow
│                   │   ├── useRecipientVerify.ts  # Check org wallet attestation
│                   │   └── useUSDCBalance.ts      # Read USDC balance from Base
│                   └── constants.ts         # Modal IDs, preset amounts
│
├── components/
│   └── providers/
│       └── WagmiProvider.tsx                # NEW: Wallet connection config for Base
│
├── hooks/
│   └── useWalletAttestation.ts              # NEW: EIP-712 sign + write attestation
│
└── lib/
    ├── facilitator/
    │   ├── index.ts                         # On-chain tx execution
    │   ├── eip3009.ts                       # EIP-3009 types + server-side verification
    │   └── usdc.ts                          # USDC contract address, ABI, constants
    └── env.ts                               # MODIFY: Add new env vars

packages/atproto-mutations-core/
└── src/
    └── mutations/
        ├── funding.receipt/                 # NEW ENTITY
        │   ├── create.ts
        │   ├── utils/
        │   │   ├── types.ts
        │   │   └── errors.ts
        │   └── tests/
        │       └── create.test.ts
        │
        └── link.attestation/               # NEW ENTITY
            ├── create.ts
            ├── utils/
            │   ├── types.ts
            │   └── errors.ts
            └── tests/
                └── create.test.ts

packages/atproto-mutations-next/
└── src/
    └── actions/
        └── index.ts                         # MODIFY: Add funding + attestation actions
```

---

## Lexicons (Already Exist in GENERATED/)

### `org.hypercerts.funding.receipt`
Path: `GENERATED/lexicons/org/hypercerts/funding/receipt.json`

```json
{
  "required": ["from", "to", "amount", "currency", "createdAt"],
  "properties": {
    "from":           { "type": "ref", "ref": "app.certified.defs#did",  "description": "DID or empty for anonymous" },
    "to":             { "type": "string",   "maxLength": 2048,            "description": "Recipient DID or name" },
    "amount":         { "type": "string",   "maxLength": 50,              "description": "e.g. '25.00'" },
    "currency":       { "type": "string",   "maxLength": 10,              "description": "e.g. 'USDC'" },
    "paymentRail":    { "type": "string",   "maxLength": 50,              "description": "e.g. 'x402-usdc-base'" },
    "paymentNetwork": { "type": "string",   "maxLength": 50,              "description": "e.g. 'base'" },
    "transactionId":  { "type": "string",   "maxLength": 256,             "description": "On-chain tx hash" },
    "for":            { "type": "string",   "format": "at-uri",           "description": "The bumicert AT-URI" },
    "notes":          { "type": "string",   "maxLength": 500 },
    "occurredAt":     { "type": "string",   "format": "datetime" },
    "createdAt":      { "type": "string",   "format": "datetime" }
  }
}
```

**Key note:** `from` is optional per the lexicon description ("Leave empty if sender wants to stay anonymous"). For anonymous donors we store wallet address in `notes` or leave `from` empty. For identified donors (ATProto logged in, anonymous mode off), `from` is their DID.

### `org.impactindexer.link.attestation`
Path: `GENERATED/lexicons/org/impactindexer/link/attestation.json`

```json
{
  "required": ["address", "chainId", "signature", "message", "signatureType", "createdAt"],
  "properties": {
    "address":       { "type": "string", "minLength": 42, "maxLength": 42 },
    "chainId":       { "type": "integer", "minimum": 1 },
    "signature":     { "type": "string", "minLength": 132, "maxLength": 1000 },
    "message":       { "type": "ref", "ref": "#eip712Message" },
    "signatureType": { "type": "string", "knownValues": ["eoa", "erc1271", "erc6492"] },
    "createdAt":     { "type": "string", "format": "datetime" }
  },
  "eip712Message": {
    "required": ["did", "evmAddress", "chainId", "timestamp", "nonce"],
    "properties": {
      "did":        { "type": "string" },
      "evmAddress": { "type": "string" },
      "chainId":    { "type": "string" },
      "timestamp":  { "type": "string" },
      "nonce":      { "type": "string" }
    }
  }
}
```

---

## Environment Variables

```env
# Facilitator wallet (pays gas — never holds USDC)
FACILITATOR_PRIVATE_KEY=0x...

# Facilitator ATProto service account (writes funding receipts to its own PDS)
FACILITATOR_DID=did:plc:...
FACILITATOR_PDS_URL=https://...
FACILITATOR_HANDLE=facilitator.gainforest.app
FACILITATOR_PASSWORD=...    # or use app password / service auth

# Base network RPC
BASE_RPC_URL=https://mainnet.base.org
# For development: BASE_RPC_URL=https://sepolia.base.org

# USDC on Base (already constant in lib/facilitator/usdc.ts, kept here for reference)
# USDC_CONTRACT_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
```

---

## Button State Logic

The Donate button is **always visible and always enabled** on every bumicert.

```tsx
// BumicertSidebar.tsx — replace the static <Button> with <DonateButton>
import { DonateButton } from "./donate/DonateButton";

// Inside render:
<DonateButton bumicert={bumicert} />
```

```tsx
// donate/DonateButton.tsx
"use client";
import { useAtprotoStore } from "@/components/stores/atproto";
import { useModal } from "@/components/ui/modal/context";
import { Button } from "@/components/ui/button";
import { HeartIcon } from "lucide-react";
import { AmountModal } from "./AmountModal";
import { MODAL_IDS } from "./constants";

export function DonateButton({ bumicert }) {
  const auth = useAtprotoStore((state) => state.auth);
  const { show, pushModal } = useModal();

  const isAuthenticated = auth.status === "AUTHENTICATED";

  const handleDonate = async () => {
    pushModal({ id: MODAL_IDS.AMOUNT, content: <AmountModal bumicert={bumicert} /> }, true);
    await show();
  };

  const handleSignIn = () => {
    // Opens existing AuthModal
    pushModal({ id: "auth", content: <AuthModal /> }, true);
    show();
  };

  return (
    <div className="flex flex-col gap-1 w-full">
      {!isAuthenticated && (
        <button onClick={handleSignIn} className="text-sm text-primary hover:underline text-center">
          Sign in to donate under your name
        </button>
      )}
      <Button onClick={handleDonate}>
        <HeartIcon />
        {isAuthenticated ? "Donate" : "Donate Anonymously"}
      </Button>
    </div>
  );
}
```

---

## Modal Flow Specification

### Modal IDs (constants.ts)

```ts
export const MODAL_IDS = {
  AMOUNT:           "donate/amount",
  WALLET:           "donate/wallet",
  CONFIRM:          "donate/confirm",
  SUCCESS:          "donate/success",
  LINK_WALLET:      "donate/link-wallet",
  RECIPIENT_ERROR:  "donate/recipient-error",
} as const;

export const PRESET_AMOUNTS = [5, 10, 25, 50, 100] as const;
```

---

### Modal 1: Amount & Method — `AmountModal.tsx`

**Triggered by:** Clicking Donate button (always, no eligibility check)

```
┌─────────────────────────────────────────┐
│  Support [Bumicert Title]               │
│  by [Organization Name]                 │
├─────────────────────────────────────────┤
│                                         │
│  How much would you like to donate?     │
│  ┌─────────────────────────────────┐    │
│  │ $  [______25_______]            │    │
│  └─────────────────────────────────┘    │
│                                         │
│  [$5]  [$10]  [$25]  [$50]  [$100]     │
│                                         │
│  ─────────────────────────────────────  │
│                                         │
│  [If signed in, show:]                  │
│  ☐ Donate anonymously                   │
│    Your wallet address will be          │
│    recorded, but not your identity      │
│                                         │
├─────────────────────────────────────────┤
│  [Continue with Wallet]                 │
│  [Continue with Card ·· Coming soon]    │  ← disabled, grayed out
└─────────────────────────────────────────┘
```

**State produced:** `{ amount: number, anonymous: boolean }`
**On "Continue with Wallet":** Push `WalletModal` onto modal stack

---

### Modal 2: Wallet Connection — `WalletModal.tsx`

**Triggered by:** Clicking "Continue with Wallet" in AmountModal

**CRITICAL:** Set `dismissible={false}` when RainbowKit is open to prevent accidental modal dismissal.

**Scenario A — Not connected:**
```
┌─────────────────────────────────────────┐
│ ← Back          Connect Wallet          │
├─────────────────────────────────────────┤
│                                         │
│  Connect your wallet to continue        │
│                                         │
│  [Connect Wallet]                       │
│  (opens RainbowKit — our modal is       │
│   set to dismissible={false} first)     │
│                                         │
│  USDC on Base network required          │
│                                         │
└─────────────────────────────────────────┘
```

**Scenario B — Connected, wrong network:**
```
┌─────────────────────────────────────────┐
│ ← Back          Switch Network          │
├─────────────────────────────────────────┤
│                                         │
│  ⚠️  You're on the wrong network        │
│                                         │
│  Switch to Base to complete             │
│  your donation                          │
│                                         │
│  [Switch to Base]                       │
│                                         │
└─────────────────────────────────────────┘
```

**Scenario C — Connected & correct network:** Auto-advances to ConfirmModal.
On auto-advance, also call `GET /api/verify-recipient?did=<orgDid>`:
- If org has wallet attestation → push `ConfirmModal`
- If org has NO wallet attestation → push `RecipientErrorModal`

---

### Modal 2b: Recipient Not Set Up — (inline state in WalletModal or separate push)

**Shown when:** Org has no `link.attestation` record

```
┌─────────────────────────────────────────┐
│ ← Back       Donations Not Set Up       │
├─────────────────────────────────────────┤
│                                         │
│        ⚠️                               │
│                                         │
│  [Organization Name] hasn't linked      │
│  a wallet to receive donations yet.     │
│                                         │
│  They need to set up their wallet       │
│  in their organization settings first.  │
│                                         │
├─────────────────────────────────────────┤
│  [Close]                                │
└─────────────────────────────────────────┘
```

---

### Modal 3: Confirmation — `ConfirmModal.tsx`

**Triggered by:** Auto-advance from WalletModal (connected + correct network + org verified)

```
┌─────────────────────────────────────────┐
│ ← Back         Confirm Donation         │
├─────────────────────────────────────────┤
│                                         │
│  Your Wallet                            │
│  ┌───────────────────────────────────┐  │
│  │ 🦊  0x1234...abcd                 │  │
│  │     Balance: 150.00 USDC on Base  │  │
│  └───────────────────────────────────┘  │
│                                         │
│  [If signed in + not anonymous +        │
│   wallet NOT linked to DID, show:]      │
│  ─────────────────────────────────────  │
│  ⚠️  This wallet isn't linked to your  │
│      Bumicerts identity yet.            │
│  [Link wallet to my account →]          │
│  ─────────────────────────────────────  │
│                                         │
│  You're donating                        │
│  ┌───────────────────────────────────┐  │
│  │  $25.00 USDC                      │  │
│  │  → [Organization Name]            │  │
│  │  for "[Bumicert Title]"            │  │
│  └───────────────────────────────────┘  │
│                                         │
│  [If insufficient balance, show:]       │
│  ⚠️  Insufficient USDC balance         │
│                                         │
├─────────────────────────────────────────┤
│  [Pay $25.00]                           │
└─────────────────────────────────────────┘
```

---

### Modal 4: Transaction Status — (same `ConfirmModal.tsx`, content changes)

The modal content transitions through these states in-place (no push/pop):

**State: `waiting-signature`**
```
┌─────────────────────────────────────────┐
│           Waiting for Signature         │
├─────────────────────────────────────────┤
│                                         │
│        ⏳  (spinner)                    │
│                                         │
│  Please sign the transaction            │
│  in your wallet                         │
│                                         │
│  This authorizes $25.00 USDC to         │
│  [Organization Name]                    │
│                                         │
│  No gas required from you              │
│                                         │
└─────────────────────────────────────────┘
```

**State: `processing`**
```
┌─────────────────────────────────────────┐
│           Processing Donation           │
├─────────────────────────────────────────┤
│                                         │
│        ⏳  (spinner)                    │
│                                         │
│  Your donation is being confirmed       │
│  on the Base network                    │
│                                         │
│  This usually takes a few seconds       │
│                                         │
└─────────────────────────────────────────┘
```

**State: `rejected`**
```
┌─────────────────────────────────────────┐
│           Transaction Rejected          │
├─────────────────────────────────────────┤
│                                         │
│        ✕  (error icon)                  │
│                                         │
│  The transaction was rejected           │
│  in your wallet                         │
│                                         │
├─────────────────────────────────────────┤
│  [Try Again]           [Cancel]         │
└─────────────────────────────────────────┘
```

---

### Modal 5: Success — `SuccessModal.tsx`

**Triggered by:** Server returns success from `/api/fund`

```
┌─────────────────────────────────────────┐
│         Donation Complete! 🎉           │
├─────────────────────────────────────────┤
│                                         │
│  ✓  (animated checkmark)               │
│     (pulsing glow background)          │
│                                         │
│  Thank you for your support!            │
│                                         │
│  $25.00 USDC donated to                 │
│  [Organization Name]                    │
│                                         │
│  Transaction: 0xabc1...def9             │
│  [View on BaseScan ↗]                  │
│                                         │
│  [If signed in + not anonymous:]        │
│  This donation is linked to your        │
│  Bumicerts identity.                    │
│                                         │
├─────────────────────────────────────────┤
│  [Done]                                 │
└─────────────────────────────────────────┘
```

---

### Identity Linking Sub-Flow — `LinkWalletModal.tsx`

**Triggered by:** Clicking "Link wallet to my account" in ConfirmModal.
**Requires:** User is ATProto-authenticated + wallet connected.

**Step 1: Explain**
```
┌─────────────────────────────────────────┐
│ ← Back        Link Your Wallet          │
├─────────────────────────────────────────┤
│                                         │
│  Linking your wallet lets you:          │
│                                         │
│  ✓  Donations appear under your name   │
│  ✓  Prove donations you've made        │
│  ✓  Receive donations to your org      │
│                                         │
│  You'll sign a message to prove         │
│  you own this wallet.                   │
│  (No gas fee required)                  │
│                                         │
├─────────────────────────────────────────┤
│  [Sign Message to Link]                 │
└─────────────────────────────────────────┘
```

**Step 2: Signing (content changes in-place)**
```
┌─────────────────────────────────────────┐
│           Sign to Link                  │
├─────────────────────────────────────────┤
│                                         │
│        ⏳  (spinner)                    │
│                                         │
│  Please sign the message                │
│  in your wallet                         │
│                                         │
│  This does not cost any gas             │
│                                         │
└─────────────────────────────────────────┘
```

**Step 3: Success**
```
┌─────────────────────────────────────────┐
│           Wallet Linked! ✓              │
├─────────────────────────────────────────┤
│                                         │
│  0x1234...abcd is now linked to         │
│  @yourhandle.bsky.social                │
│                                         │
├─────────────────────────────────────────┤
│  [Continue with Donation]               │  ← popModal(), back to ConfirmModal
└─────────────────────────────────────────┘
```

---

## Complete Data Flow Diagram

```
USER CLICKS DONATE
│
├─ Not signed in? → Show "Donate Anonymously" + sign-in link above button
└─ Signed in?     → Show "Donate" button

MODAL 1: AMOUNT
│
├─ Enter amount ($5 / $10 / $25 / $50 / $100 / custom)
├─ [If signed in] Show "Donate anonymously" checkbox
└─ Click "Continue with Wallet"

MODAL 2: WALLET
│
├─ Not connected?   → Show [Connect Wallet] → RainbowKit (dismissible=false)
├─ Wrong network?   → Show [Switch to Base]
└─ Connected + Base → GET /api/verify-recipient?did=<orgDid>
                        │
                        ├─ Org has NO wallet attestation
                        │   → Show "Recipient not set up" state → [Close]
                        │
                        └─ Org HAS wallet attestation
                            → Push ConfirmModal

MODAL 3: CONFIRM
│
├─ Show: wallet address, USDC balance
├─ [If signed in + not anonymous + wallet NOT linked to DID]
│   → Show "Link wallet to my account" → push LinkWalletModal
│       ↳ LinkWalletModal: explain → sign EIP-712 → POST /api/identity-link
│           → write org.impactindexer.link.attestation to user's PDS
│           → [Continue with Donation] → popModal() back to ConfirmModal
│
├─ Show donation summary ($25.00 → Org Name → Bumicert Title)
├─ [If insufficient balance] → show error, disable Pay button
└─ Click "Pay $25.00"

STATE: waiting-signature
│
├─ Sign EIP-3009 typed data in wallet (no gas)
├─ User rejects → show "Transaction Rejected" + [Try Again] [Cancel]
└─ User signs   → state: processing

STATE: processing
│
└─ POST /api/fund with PAYMENT-SIGNATURE header
    │
    ├─ Server: parse EIP-3009 authorization
    ├─ Server: verify org wallet attestation (cryptographic check)
    ├─ Server: call USDC.transferWithAuthorization() on Base
    ├─ Server: write org.hypercerts.funding.receipt to facilitator repo
    └─ Return { success, transactionHash, receiptUri }

MODAL 5: SUCCESS
│
├─ Show tx hash + BaseScan link
└─ [Done] → hide() + clear()
```

---

## Backend API Specification

### `POST /api/fund`

**Mode A — Discovery (no `PAYMENT-SIGNATURE` header):**
Returns 402 with payment options.

```ts
// Request body
{ activityUri: string, amount: string, currency: "USDC" }

// Response 402
{
  paymentRequired: true,
  options: {
    crypto: {
      protocol: "x402",
      network: "Base",
      payTo: "0x...",   // org's verified wallet from attestation
      token: "USDC",
      decimals: 6,
    }
  }
}
```

**Mode B — Settlement (with `PAYMENT-SIGNATURE` header):**

```ts
// PAYMENT-SIGNATURE header: base64(JSON.stringify(payload))
// payload shape:
{
  x402Version: 2,
  scheme: "exact",
  networkId: "eip155:8453",
  payload: {
    signature: "0x...",
    authorization: {
      from: "0x...",
      to: "0x...",
      value: "25000000",      // 25 USDC in 6 decimals
      validAfter: "0",
      validBefore: "1234567890",
      nonce: "0x...",
    }
  }
}

// Response 200 on success
{
  success: true,
  transactionHash: "0x...",
  receiptUri: "at://did:plc:facilitator/org.hypercerts.funding.receipt/tid"
}
```

---

### `GET /api/verify-recipient?did=<orgDid>`

Queries the indexer (GraphQL) for `org.impactindexer.link.attestation` records by the org's DID.

```ts
// Response
{
  hasAttestation: boolean,
  address?: string,    // org's linked wallet (if found)
  chainId?: number,
}
```

---

### `POST /api/identity-link`

Uses the **authenticated user's ATProto session** to write an `org.impactindexer.link.attestation` record to **their own PDS**.

```ts
// Request body
{
  address: string,       // EVM wallet address
  chainId: number,       // 8453
  signature: string,     // EIP-712 signature from wallet
  message: {
    did: string,
    evmAddress: string,
    chainId: string,
    timestamp: string,
    nonce: string,
  },
  signatureType: "eoa" | "erc1271" | "erc6492",
}

// Response 200
{ uri: string, rkey: string }
```

---

## mutations-core — New Entities

### `funding.receipt/create.ts`

Pattern follows `claim.activity/create.ts` exactly.

```ts
// utils/types.ts
export type { Main as FundingReceiptRecord } from "@gainforest/generated/org/hypercerts/funding/receipt.defs";
export type CreateFundingReceiptInput = Omit<FundingReceiptRecord, "$type" | "createdAt">;
export type FundingReceiptMutationResult = { uri: string; cid: string; rkey: string; record: FundingReceiptRecord };
```

```ts
// utils/errors.ts
export class FundingReceiptPdsError extends Data.TaggedError("FundingReceiptPdsError")<{ message: string; cause: unknown }> {}
export class FundingReceiptValidationError extends Data.TaggedError("FundingReceiptValidationError")<{ message: string; cause: unknown }> {}
```

```ts
// create.ts — key points:
// - COLLECTION = "org.hypercerts.funding.receipt"
// - record is immutable (no update.ts, no delete.ts, no upsert.ts)
// - Uses createRecord() shared util, same as other mutations
```

**Note:** `funding.receipt` is **append-only / immutable** — no `update.ts`, `delete.ts`, or `upsert.ts`. Only `create.ts`.

---

### `link.attestation/create.ts`

```ts
// utils/types.ts
export type { Main as LinkAttestationRecord } from "@gainforest/generated/org/impactindexer/link/attestation.defs";
export type CreateLinkAttestationInput = Omit<LinkAttestationRecord, "$type" | "createdAt">;
export type LinkAttestationMutationResult = { uri: string; cid: string; rkey: string; record: LinkAttestationRecord };
```

```ts
// utils/errors.ts
export class LinkAttestationPdsError extends Data.TaggedError("LinkAttestationPdsError")<{ message: string; cause: unknown }> {}
export class LinkAttestationValidationError extends Data.TaggedError("LinkAttestationValidationError")<{ message: string; cause: unknown }> {}
```

**Note:** `link.attestation` is also **immutable** (append-only log of wallet links). Only `create.ts`.

---

## mutations-next — New Server Actions

```ts
// Added to packages/atproto-mutations-next/src/actions/index.ts

type FundingReceiptErrorCode = "UNAUTHORIZED" | "SESSION_EXPIRED" | "INVALID_RECORD" | "PDS_ERROR";
type LinkAttestationErrorCode = "UNAUTHORIZED" | "SESSION_EXPIRED" | "INVALID_RECORD" | "PDS_ERROR";

export async function createFundingReceiptAction(
  input: CreateFundingReceiptInput,
  agentLayer: AgentLayer
): Promise<MutationResult<FundingReceiptMutationResult, FundingReceiptErrorCode>>

export async function createLinkAttestationAction(
  input: CreateLinkAttestationInput,
  agentLayer: AgentLayer
): Promise<MutationResult<LinkAttestationMutationResult, LinkAttestationErrorCode>>
```

---

## Organization Wallet Setup (Phase 5)

Organizations must link a wallet before donations can be received. Add a `WalletLinkSection` component to the organization settings page.

**Location:** `app/(marketplace)/organization/[did]/_components/WalletLinkSection.tsx`

**Flow:**
1. Org admin visits their org page.
2. A "Set Up Donations" card is shown if no attestation exists.
3. Admin connects wallet + signs EIP-712 message.
4. Frontend calls `POST /api/identity-link` with user's ATProto session → writes `link.attestation` to their PDS.
5. Indexer picks it up, making the org queryable via `GET /api/verify-recipient`.

**EIP-712 Typed Data Structure:**
```ts
const domain = {
  name: "ATProto EVM Attestation",
  version: "1",
}

const types = {
  AttestLink: [
    { name: "did",        type: "string" },
    { name: "evmAddress", type: "string" },
    { name: "chainId",    type: "string" },
    { name: "timestamp",  type: "string" },
    { name: "nonce",      type: "string" },
  ]
}

const message = {
  did:        "did:plc:abc123",
  evmAddress: "0x1234...",
  chainId:    "8453",
  timestamp:  String(Math.floor(Date.now() / 1000)),
  nonce:      String(Date.now()),
}
```

---

## Security Considerations

| Concern | Mitigation |
|---------|------------|
| Facilitator private key exposed | Server env var only, never in client bundle, never logged |
| Replay attacks on EIP-3009 | Nonce + `validBefore` (5-min window from signing time) |
| Fake recipient (wrong wallet) | Verify `link.attestation` cryptographic signature before settling |
| Amount manipulation in transit | Server re-validates amount from the signed authorization payload |
| Front-running | Short `validBefore` window, nonce uniqueness |
| Modal dismissed during RainbowKit | Set `dismissible={false}` on ModalStack before opening RainbowKit, restore after |
| Double-spend | EIP-3009 nonce is consumed on-chain — replay reverts automatically |

---

## Dependencies to Add

```json
// package.json — add to dependencies:
{
  "viem": "^2.x",
  "wagmi": "^2.x",
  "@rainbow-me/rainbowkit": "^2.x"
}
```

---

## Implementation Phases

### Phase 1: Infrastructure (Week 1)
- [ ] Add `viem`, `wagmi`, `@rainbow-me/rainbowkit` to `package.json`
- [ ] Create `components/providers/WagmiProvider.tsx` (configured for Base, chain ID 8453)
- [ ] Wrap `app/layout.tsx` with `WagmiProvider`
- [ ] Add env vars to `lib/env.ts`: `FACILITATOR_PRIVATE_KEY`, `FACILITATOR_DID`, `FACILITATOR_PDS_URL`, `BASE_RPC_URL`
- [ ] Create `lib/facilitator/usdc.ts` (contract address, ABI, constants)

### Phase 2: Mutations (Week 1)
- [ ] Create `mutations-core/src/mutations/funding.receipt/utils/types.ts`
- [ ] Create `mutations-core/src/mutations/funding.receipt/utils/errors.ts`
- [ ] Create `mutations-core/src/mutations/funding.receipt/create.ts`
- [ ] Create `mutations-core/src/mutations/funding.receipt/tests/create.test.ts`
- [ ] Create `mutations-core/src/mutations/link.attestation/utils/types.ts`
- [ ] Create `mutations-core/src/mutations/link.attestation/utils/errors.ts`
- [ ] Create `mutations-core/src/mutations/link.attestation/create.ts`
- [ ] Create `mutations-core/src/mutations/link.attestation/tests/create.test.ts`
- [ ] Export new mutations from `mutations-core/src/index.ts`
- [ ] Add `createFundingReceiptAction` + `createLinkAttestationAction` to `mutations-next/src/actions/index.ts`

### Phase 3: Backend APIs (Week 2)
- [ ] Create `app/api/verify-recipient/route.ts` (query indexer GraphQL for attestation by DID)
- [ ] Create `lib/facilitator/eip3009.ts` (EIP-3009 typed data + server-side signature verification)
- [ ] Create `lib/facilitator/index.ts` (call `transferWithAuthorization` on-chain)
- [ ] Create `app/api/fund/route.ts` (Mode A: 402 discovery, Mode B: settlement + write receipt)
- [ ] Create `app/api/identity-link/route.ts` (write attestation using user's OAuth session)

### Phase 4: Donation Modal UI (Week 2–3)
- [ ] Create `donate/constants.ts` (modal IDs, preset amounts)
- [ ] Create `donate/hooks/useDonateFlow.ts` (state machine: idle → amount → wallet → confirm → processing → success/rejected)
- [ ] Create `donate/hooks/useRecipientVerify.ts` (calls `/api/verify-recipient`, caches result)
- [ ] Create `donate/hooks/useUSDCBalance.ts` (reads USDC balance from Base via `viem`)
- [ ] Create `donate/DonateButton.tsx` (auth-aware button text + sign-in prompt)
- [ ] Create `donate/AmountModal.tsx` (amount input, presets, anonymous checkbox, method buttons)
- [ ] Create `donate/WalletModal.tsx` (connect + switch network + recipient check)
- [ ] Create `donate/ConfirmModal.tsx` (wallet info, balance, summary, transaction states)
- [ ] Create `donate/SuccessModal.tsx` (success state, tx link)
- [ ] Create `donate/LinkWalletModal.tsx` (EIP-712 sign + write attestation sub-flow)
- [ ] Update `BumicertSidebar.tsx` to use `<DonateButton bumicert={bumicert} />`

### Phase 5: Organization Wallet Setup (Week 3)
- [ ] Create `hooks/useWalletAttestation.ts` (EIP-712 sign hook for identity linking)
- [ ] Create `organization/[did]/_components/WalletLinkSection.tsx` (org settings wallet UI)
- [ ] Integrate `WalletLinkSection` into organization settings/profile page

### Phase 6: Testing & Polish (Week 4)
- [ ] Unit tests for new mutations in `mutations-core`
- [ ] Integration tests on Base Sepolia testnet
- [ ] End-to-end test for complete donation flow
- [ ] Handle edge cases: network errors, insufficient funds, expired signatures
- [ ] Production deployment on Base mainnet
