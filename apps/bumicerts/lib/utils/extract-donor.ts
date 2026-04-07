/**
 * Donor information extracted from a funding receipt's `from` field.
 */
export type DonorInfo =
  | { type: "did"; id: string }
  | { type: "wallet"; id: string }
  | null;

/**
 * Recipient information extracted from a funding receipt's `to` field.
 */
export type RecipientInfo =
  | { type: "did"; id: string }
  | { type: "wallet"; id: string }
  | null;

/**
 * Extracts donor information from a funding receipt's `from` field.
 *
 * The `from` field can be:
 * - `{ $type: "app.certified.defs#did", did: "did:..." }` - Identified donor (ATProto DID)
 * - `{ $type: "org.hypercerts.funding.receipt#text", value: "0x..." }` - Anonymous donor (wallet address)
 * - `undefined` / `null` - Unknown donor (shouldn't happen after migration)
 *
 * @param from - The `from` field from a funding receipt
 * @returns Donor information or null if unknown
 */
export function extractDonor(from: unknown): DonorInfo {
  if (!from || typeof from !== "object" || Array.isArray(from)) {
    return null;
  }

  const obj = from as Record<string, unknown>;

  // Identified donor: DID type
  if (obj.$type === "app.certified.defs#did" && typeof obj.did === "string") {
    return { type: "did", id: obj.did };
  }

  // Anonymous donor: Text type with wallet/identifier
  if (obj.$type === "org.hypercerts.funding.receipt#text" && typeof obj.value === "string") {
    return { type: "wallet", id: obj.value };
  }

  return null;
}

/**
 * Extracts recipient information from a funding receipt's `to` field.
 *
 * The `to` field can be:
 * - `{ $type: "org.hypercerts.funding.receipt#text", value: "0x..." }` - Recipient wallet address
 * - `{ $type: "app.certified.defs#did", did: "did:..." }` - Recipient DID (fallback, rarely used)
 * - `undefined` / `null` - Unknown recipient
 *
 * @param to - The `to` field from a funding receipt
 * @returns Recipient information or null if unknown
 */
export function extractRecipient(to: unknown): RecipientInfo {
  if (!to || typeof to !== "object" || Array.isArray(to)) {
    return null;
  }

  const obj = to as Record<string, unknown>;

  // Recipient wallet: Text type
  if (obj.$type === "org.hypercerts.funding.receipt#text" && typeof obj.value === "string") {
    return { type: "wallet", id: obj.value };
  }

  // Fallback: DID type (for older receipts or special cases)
  if (obj.$type === "app.certified.defs#did" && typeof obj.did === "string") {
    return { type: "did", id: obj.did };
  }

  return null;
}

/**
 * Extracts the organization DID from a funding receipt's `for` field.
 *
 * The `for` field is a StrongRef pointing to an activity record:
 * `{ uri: "at://did:plc:org456/org.hypercerts.claim.activity/rkey", cid: "..." }`
 *
 * The org DID is embedded in the AT-URI as the authority component.
 *
 * @param forField - The `for` field from a funding receipt (StrongRef)
 * @returns The organization DID or null if not found
 */
export function extractOrgDidFromFor(forField: unknown): string | null {
  if (!forField || typeof forField !== "object" || Array.isArray(forField)) {
    return null;
  }

  const obj = forField as Record<string, unknown>;

  if (typeof obj.uri !== "string") {
    return null;
  }

  // Parse AT-URI: at://did:plc:org456/collection/rkey
  // Extract the DID (authority component)
  const match = obj.uri.match(/^at:\/\/(did:[^/]+)/);
  if (match?.[1]) {
    return match[1];
  }

  return null;
}
