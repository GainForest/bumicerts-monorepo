/**
 * Shared server-side data helpers for all org sub-pages (home, bumicerts, …).
 *
 * `cache()` from React deduplicates calls within a single render pass, so
 * both layout.tsx and page.tsx can call getOrgData(did) independently and
 * only one network request is made.
 *
 * When the indexer hasn't indexed a record yet (common right after creation),
 * we fall back to reading directly from the user's PDS via the public
 * `com.atproto.repo.getRecord` XRPC endpoint.
 */

import { cache } from "react";
import {
  orgInfoToOrganizationData,
  activitiesToBumicertDataArray,
  type GraphQLOrgInfoItem,
  type GraphQLHcActivityItem,
} from "@/lib/adapters";
import type { OrganizationData, BumicertData } from "@/lib/types";
import { getIndexerCaller } from "@/lib/trpc/indexer/server";

// ── PDS direct-read fallback ─────────────────────────────────────────────────

const ORG_INFO_COLLECTION = "app.gainforest.organization.info";
const ORG_INFO_RKEY = "self";

/**
 * Resolve a did:plc DID to its PDS service endpoint.
 * Falls back to null if the DID document can't be fetched or has no PDS.
 */
async function resolvePdsEndpoint(did: string): Promise<string | null> {
  try {
    if (did.startsWith("did:plc:")) {
      const res = await fetch(`https://plc.directory/${did}`, {
        next: { revalidate: 3600 }, // cache DID doc for 1 hour
      });
      if (!res.ok) return null;
      const doc = await res.json();
      // DID document services: find atproto_pds
      const services = doc?.service;
      if (Array.isArray(services)) {
        const pds = services.find(
          (s: { id?: string; type?: string }) =>
            s.id === "#atproto_pds" || s.type === "AtprotoPersonalDataServer"
        );
        if (pds?.serviceEndpoint) return pds.serviceEndpoint as string;
      }
      return null;
    }
    // did:web — the PDS URL is derived from the DID itself
    if (did.startsWith("did:web:")) {
      return `https://${did.slice("did:web:".length)}`;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Read an organization info record directly from the user's PDS.
 *
 * Returns a GraphQLOrgInfoItem-compatible shape, or null if the record
 * doesn't exist or can't be fetched.
 *
 * Note: blob URIs (logo, coverImage) are stored as AT Protocol blob refs
 * in the PDS record. We resolve them to full URLs using the PDS blob endpoint.
 */
async function fetchOrgInfoFromPds(
  did: string,
): Promise<GraphQLOrgInfoItem | null> {
  const pdsUrl = await resolvePdsEndpoint(did);
  if (!pdsUrl) return null;

  try {
    const url = new URL(`${pdsUrl}/xrpc/com.atproto.repo.getRecord`);
    url.searchParams.set("repo", did);
    url.searchParams.set("collection", ORG_INFO_COLLECTION);
    url.searchParams.set("rkey", ORG_INFO_RKEY);

    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) return null;

    const data = await res.json();
    const record = data.value;
    if (!record) return null;

    // Resolve blob refs to PDS blob URLs
    const resolveBlob = (
      blob: { ref?: { $link?: string }; mimeType?: string; size?: number } | undefined | null,
    ) => {
      if (!blob?.ref?.$link) return null;
      return {
        cid: blob.ref.$link,
        mimeType: blob.mimeType ?? null,
        size: blob.size ?? null,
        // AT Protocol blob URL: {pds}/xrpc/com.atproto.sync.getBlob?did={did}&cid={cid}
        uri: `${pdsUrl}/xrpc/com.atproto.sync.getBlob?did=${encodeURIComponent(did)}&cid=${encodeURIComponent(blob.ref.$link)}`,
      };
    };

    // Extract shortDescription — could be { text: string } or string
    const shortDesc = record.shortDescription;

    return {
      metadata: {
        did,
        uri: data.uri ?? `at://${did}/${ORG_INFO_COLLECTION}/${ORG_INFO_RKEY}`,
        rkey: ORG_INFO_RKEY,
        cid: data.cid ?? null,
        createdAt: record.createdAt ?? null,
        indexedAt: null, // not indexed yet
      },
      creatorInfo: {
        did,
        organizationName: record.displayName ?? null,
        organizationLogo: resolveBlob(record.logo),
      },
      record: {
        displayName: record.displayName ?? null,
        shortDescription: shortDesc ?? null,
        longDescription: record.longDescription ?? null,
        logo: resolveBlob(record.logo),
        coverImage: resolveBlob(record.coverImage),
        objectives: record.objectives ?? null,
        country: record.country ?? null,
        website: record.website ?? null,
        startDate: record.startDate ?? null,
        visibility: record.visibility ?? null,
        createdAt: record.createdAt ?? null,
      },
    };
  } catch {
    return null;
  }
}

// ── Main data fetcher ────────────────────────────────────────────────────────

export const getOrgData = cache(async (did: string) => {
  try {
    const caller = await getIndexerCaller();
    const data = await caller.organization.byDid({ did });

    // If the indexer found the org, return it
    if (data?.org) {
      return { data, error: null };
    }

    // Indexer returned null — try reading directly from PDS
    const pdsOrg = await fetchOrgInfoFromPds(did);
    if (pdsOrg) {
      return {
        data: { org: pdsOrg, activities: data?.activities ?? [] },
        error: null,
      };
    }

    // Neither source has the record
    return { data, error: null };
  } catch (error) {
    // Indexer errored — still try PDS as last resort
    try {
      const pdsOrg = await fetchOrgInfoFromPds(did);
      if (pdsOrg) {
        return {
          data: { org: pdsOrg, activities: [] },
          error: null,
        };
      }
    } catch {
      // PDS fallback also failed
    }
    return { data: null, error };
  }
});

/** Transform raw GraphQL org data → UI-ready OrganizationData + BumicertData[]. */
export function transformOrgData(
  orgInfo: GraphQLOrgInfoItem,
  rawActivities: GraphQLHcActivityItem[]
): { organization: OrganizationData; bumicerts: BumicertData[] } {
  const organization = orgInfoToOrganizationData(orgInfo, rawActivities.length);
  const bumicerts = activitiesToBumicertDataArray(rawActivities);
  return { organization, bumicerts };
}

export type { GraphQLOrgInfoItem, GraphQLHcActivityItem };
