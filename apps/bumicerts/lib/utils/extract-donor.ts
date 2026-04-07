/**
 * Donor information extracted from a funding receipt's `from` field.
 */
export type DonorInfo =
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
