/**
 * cartBumicert query module.
 *
 * Fetches the minimal data needed to display and validate a single bumicert
 * inside the CartModal. Each cart item is identified by a bumicert ID with
 * the format "{ownerDid}-{rkey}".
 *
 * Returns: title, organizationName, organizationDid, rkey, fundingConfig
 * (status + receivingWallet URI) — everything needed to group items into
 * "accepting donations" vs "unavailable".
 *
 * Note: wallet validity (specialMetadata + platformAttestation) is checked
 * separately via the linkEvm query, exactly as on the bumicert page.
 */

import { graphqlClient } from "@/lib/graphql-dev/client";
import { graphql } from "@/lib/graphql-dev/tada";
import type { QueryModule } from "@/lib/graphql-dev/create-query";
import type { FundingConfigData } from "@/lib/types";

// ── Document ──────────────────────────────────────────────────────────────────

const cartItemDocument = graphql(`
  query CartBumicert($did: String!, $rkey: String!) {
    hypercerts {
      claim {
        activity(where: { did: $did, rkey: $rkey }, limit: 1) {
          data {
            metadata {
              did
              rkey
            }
            creatorInfo {
              organizationName
            }
            record {
              title
            }
            fundingConfig {
              receivingWallet
              status
            }
          }
        }
      }
    }
  }
`);

// ── Types ─────────────────────────────────────────────────────────────────────

export type Params = { id: string }; // "{ownerDid}-{rkey}"

export type CartBumicertItem = {
  /** The full bumicert ID, e.g. "did:plc:abc-self123key" */
  id: string;
  /** ATProto record key */
  rkey: string;
  /** Owner/org DID */
  organizationDid: string;
  /** Display title */
  title: string;
  /** Organisation display name */
  organizationName: string;
  /**
   * Funding config fields needed to determine acceptability.
   * null means no funding config exists.
   */
  fundingConfig: Pick<FundingConfigData, "receivingWallet" | "status"> | null;
};

// ── Fetch ─────────────────────────────────────────────────────────────────────

export async function fetch(params: Params): Promise<CartBumicertItem | null> {
  // ID format: "{did}-{rkey}". The DID itself may contain hyphens, so we split
  // on the LAST hyphen-separated segment that looks like an rkey.
  // Safer: split on first "-" only if DID is "did:method:..." format.
  const firstDash = params.id.indexOf("-");
  if (firstDash === -1) return null;

  // The rkey is everything after the first "-" that follows the DID.
  // DID format: "did:method:identifier" — identifier may contain colons but not hyphens.
  // So the first "-" separates did from rkey.
  const did = params.id.slice(0, firstDash);
  const rkey = params.id.slice(firstDash + 1);

  if (!did || !rkey) return null;

  const res = await graphqlClient.request(cartItemDocument, { did, rkey });
  const item = res.hypercerts?.claim?.activity?.data?.[0];
  if (!item) return null;

  const rawFc = item.fundingConfig;
  const fundingConfig: CartBumicertItem["fundingConfig"] = rawFc
    ? {
        receivingWallet: (() => {
          const rw = rawFc.receivingWallet;
          if (rw && typeof rw === "object" && "uri" in (rw as object)) {
            return { uri: (rw as { uri: string }).uri };
          }
          return null;
        })(),
        status: (rawFc.status ?? null) as FundingConfigData["status"],
      }
    : null;

  return {
    id: params.id,
    rkey: item.metadata?.rkey ?? rkey,
    organizationDid: item.metadata?.did ?? did,
    title: item.record?.title ?? "",
    organizationName: item.creatorInfo?.organizationName ?? "",
    fundingConfig,
  };
}

// ── Default options ───────────────────────────────────────────────────────────

export const defaultOptions = {
  staleTime: 60 * 1_000, // 1 minute — config changes are infrequent
  retry: false,
} satisfies QueryModule<Params, CartBumicertItem | null>["defaultOptions"];

// ── Enabled ───────────────────────────────────────────────────────────────────

export function enabled(params: Params): boolean {
  return !!params.id;
}
