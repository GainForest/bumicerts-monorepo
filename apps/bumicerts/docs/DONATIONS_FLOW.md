# Donations Flow (Bumicerts)

This document is the source of truth for donation behavior in the Bumicerts app.

## 1) Scope

Covers:

- Single donation flow (`/api/fund`, donation modal)
- Batch checkout flow (`/api/fund/batch`, `/checkout`)
- Receipt writing (`org.hypercerts.funding.receipt`)
- Donor identity vs anonymous behavior
- Read models that interpret donor identity (`/leaderboard`, bumicert donations, dashboard)

Does not cover:

- Card payments (not active)
- Legacy experiments that are not in active routes

---

## 2) Actors and systems

- **Donor wallet (frontend + wagmi):** signs EIP-3009 authorization.
- **Bumicerts frontend:** collects donation details and sends settlement requests.
- **Facilitator API:** validates request, executes on-chain transfers, writes receipts.
- **ATProto (facilitator repo):** stores immutable funding receipt records.
- **Indexer:** serves receipts for leaderboard, bumicert donation history, dashboard.

---

## 3) Receipt model used by app

Collection: `org.hypercerts.funding.receipt`

Important fields in use:

- `from`: donor identity source
  - DID mode: `{ $type: "app.certified.defs#did", did: "did:..." }`
  - Anonymous mode: `{ $type: "org.hypercerts.funding.receipt#text", value: "0x..." }`
- `to`: recipient wallet text
  - `{ $type: "org.hypercerts.funding.receipt#text", value: "0x..." }`
- `for`: activity strongRef
  - `{ uri: "at://.../org.hypercerts.claim.activity/...", cid: "..." }`
- `amount`, `currency`, `paymentRail`, `paymentNetwork`, `transactionId`, `occurredAt`
- `notes`: human-readable payment sentence

---

## 4) Identity and anonymity rules (authoritative)

The backend enforces these rules for both single and batch donations:

| Donor session | UI choice | Stored mode | `from` shape |
|---|---|---|---|
| Authenticated | Anonymous OFF | `did` | `{ $type: "app.certified.defs#did", did }` |
| Authenticated | Anonymous ON | `wallet` | `{ $type: "org.hypercerts.funding.receipt#text", value: wallet }` |
| Unauthenticated | N/A (treated anonymous) | `wallet` | `{ $type: "org.hypercerts.funding.receipt#text", value: wallet }` |

Validation rule:

- If `anonymous=false`, backend requires a valid `donorDid`.
- If this combination is invalid, API returns:
  - HTTP `422`
  - code: `NON_ANONYMOUS_DONATION_REQUIRES_DONOR_DID`
  - user-friendly message

There is no silent downgrade from non-anonymous to anonymous.

---

## 5) API contracts

## 5.1 Single funding (`POST /api/fund`)

Request body (settlement mode):

```json
{
  "activityUri": "at://did:.../org.hypercerts.claim.activity/rkey",
  "orgDid": "did:...",
  "amount": "25",
  "currency": "USDC",
  "anonymous": false,
  "donorDid": "did:..."
}
```

Success response:

```json
{
  "success": true,
  "transactionHash": "0x...",
  "receiptUri": "at://did:.../org.hypercerts.funding.receipt/...",
  "donorRecordedAs": "did"
}
```

`donorRecordedAs` is authoritative for UI messaging.

## 5.2 Batch funding (`POST /api/fund/batch`)

Request body:

```json
{
  "items": [
    {
      "activityUri": "at://did:.../org.hypercerts.claim.activity/rkey",
      "orgDid": "did:...",
      "amount": "10"
    }
  ],
  "totalAmount": "10",
  "currency": "USDC",
  "anonymous": true
}
```

Success response:

```json
{
  "success": true,
  "donorToFacilitatorHash": "0x...",
  "totalAmount": "10",
  "donorRecordedAs": "wallet",
  "itemCount": 1,
  "successCount": 1,
  "results": [
    {
      "activityUri": "at://...",
      "orgDid": "did:...",
      "amount": "10",
      "recipientWallet": "0x...",
      "transactionHash": "0x...",
      "receiptUri": "at://...",
      "success": true
    }
  ]
}
```

---

## 6) Single donation sequence

1. User opens donation modal and enters amount.
2. If authenticated, user may toggle anonymous mode.
3. Frontend derives request mode:
   - unauthenticated => anonymous
   - authenticated + toggle off => DID mode
4. Wallet signs EIP-3009 authorization.
5. Frontend calls `/api/fund` with `PAYMENT-SIGNATURE`.
6. Backend validates recipient wallet and identity combination.
7. Backend executes transfer.
8. Backend writes receipt in facilitator repo.
9. UI success screen uses `donorRecordedAs` to describe identity recording accurately.

---

## 7) Batch checkout sequence

1. User selects multiple bumicerts in cart and amounts.
2. Frontend derives anonymity mode with same rules as single donation.
3. Wallet signs one authorization for total amount to facilitator wallet.
4. Frontend calls `/api/fund/batch`.
5. Backend validates totals, recipient wallets, identity combination.
6. Backend receives donor->facilitator transfer.
7. Backend distributes to each org wallet.
8. Backend writes one receipt per successful item.
9. UI success screen uses top-level `donorRecordedAs`.

---

## 8) Read-model interpretation

Identity classification must come from `record.from`:

- DID sender => identified donor
- text sender => anonymous/wallet donor

Used by:

- `/leaderboard`
- `/bumicert/[id]?tab=donations`
- dashboard aggregations (top donors, recent transactions)

Shared helper:

- `lib/utils/extract-donor.ts`

---

## 9) Failure modes

- Missing/invalid signature header -> `400`
- Recipient wallet not linked -> `422`
- Recipient mismatch / invalid amount checks -> `422`
- Non-anonymous request without valid `donorDid` -> `422`
- On-chain execution failure -> `500`

Batch-specific:

- Missing wallets for any item -> `422` with missing org list
- Missing activity CID for any item -> `422`
- Item-level distribution can fail; response contains per-item success/error

---

## 10) Security and integrity invariants

- Backend verifies target wallets before transfer.
- Identity recording mode is validated server-side, not trusted from UI alone.
- Non-anonymous requests never silently become anonymous.
- Receipt writes are append-only.

---

## 11) If you change this flow

Update these together:

- `app/api/fund/route.ts`
- `app/api/fund/batch/route.ts`
- `components/global/modals/donate/*`
- `app/(marketplace)/checkout/_components/*`
- `lib/utils/extract-donor.ts`
- `lib/utils/leaderboard.ts`
- `app/(marketplace)/dashboard/_utils/aggregations.ts`
- this file (`docs/DONATIONS_FLOW.md`)

Keep API responses and success-copy logic in sync.
