/**
 * Adapters: GraphQL types → canonical UI types (BumicertData, OrganizationData)
 *
 * These transform data from the GraphQL indexer into the UI-friendly shapes
 * used throughout the bumicerts application.
 *
 * Post-redesign schema shape:
 *   Every leaf returns { data: [XxxItem!]!, pageInfo: { endCursor, hasNextPage, count } }
 *   Each item: { metadata, creatorInfo, record }
 *     metadata   – AT Protocol envelope (+ labelTier/label for activities)
 *     creatorInfo – org name + logo resolved inline by the indexer (no second round-trip)
 *     record     – pure lexicon payload fields
 */

import type { BumicertData, BumicertContributor, OrganizationData } from "./types";
import { parseAtUri } from "@gainforest/atproto-mutations-next";

// ── GraphQL Response Types ───────────────────────────────────────────────────
// These match the post-redesign GraphQL schema from the indexer.

export interface GraphQLBlobRef {
  cid: string | null;
  mimeType: string | null;
  size: number | null;
  uri: string | null;
}

export interface GraphQLRecordMetadata {
  cid: string | null;
  did: string | null;
  indexedAt: string | null;
  createdAt: string | null;
  rkey: string | null;
  uri: string | null;
}

export interface GraphQLActivityMetadata extends GraphQLRecordMetadata {
  labelTier: string | null;
  label: {
    tier: string | null;
    labeler: string | null;
    labeledAt: string | null;
    syncedAt: string | null;
  } | null;
}

export interface GraphQLStrongRef {
  cid: string | null;
  uri: string | null;
}

export interface GraphQLCreatorInfo {
  did: string | null;
  organizationName: string | null;
  organizationLogo: GraphQLBlobRef | null;
}

/**
 * An HcActivityItem from the new indexer schema.
 * { metadata, creatorInfo, record }
 */
export interface GraphQLHcActivityItem {
  metadata: GraphQLActivityMetadata | null;
  creatorInfo: GraphQLCreatorInfo | null;
  record: {
    title: string | null;
    shortDescription: string | null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    description: any; // JSON scalar — now a LinearDocument (pub.leaflet.pages.linearDocument), not a string
    startDate: string | null;
    endDate: string | null;
    createdAt: string | null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    image: any; // JSON scalar - could be SmallImage wrapper or null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    workScope: any; // JSON scalar
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    contributors: any; // JSON scalar — array of contributor objects
    locations: GraphQLStrongRef[] | null;
  } | null;
}

/**
 * An OrgInfoItem from the new indexer schema.
 * { metadata, creatorInfo, record }
 */
export interface GraphQLOrgInfoItem {
  metadata: GraphQLRecordMetadata | null;
  creatorInfo: GraphQLCreatorInfo | null;
  record: {
    displayName: string | null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    shortDescription: any; // JSON scalar (Richtext)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    longDescription: any; // JSON scalar (LinearDocument)
    logo: GraphQLBlobRef | null;
    coverImage: GraphQLBlobRef | null;
    objectives: string[] | null;
    country: string | null;
    website: string | null;
    startDate: string | null;
    visibility: string | null;
    createdAt: string | null;
  } | null;
}

// Keep old name as alias for backward compatibility with any remaining consumers
/** @deprecated Use GraphQLHcActivityItem */
export type GraphQLHcActivity = GraphQLHcActivityItem;
/** @deprecated Use GraphQLOrgInfoItem */
export type GraphQLOrgInfo = GraphQLOrgInfoItem;

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Extract work scope objectives from the workScope JSON field.
 * Supports both { scope: string } and tags array formats.
 */
function extractWorkScopeObjectives(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  workScope: any
): string[] {
  if (!workScope) return [];
  // WorkScopeString format: { scope: string }
  if (typeof workScope === "object" && "scope" in workScope && typeof workScope.scope === "string") {
    return workScope.scope
      .split(",")
      .map((s: string) => s.trim())
      .filter(Boolean);
  }
  return [];
}

/**
 * Extract plain text from a Richtext JSON field.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractRichtext(rt: any): string {
  if (!rt) return "";
  if (typeof rt === "string") return rt;
  if (typeof rt === "object" && "text" in rt) return rt.text ?? "";
  return "";
}

/**
 * Extract plain text from a LinearDocument JSON field (array of blocks).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractLinearDocument(doc: any): string {
  if (!doc) return "";
  if (typeof doc === "string") return doc;
  if (typeof doc === "object" && "blocks" in doc && Array.isArray(doc.blocks)) {
    return doc.blocks
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((block: any) => block?.block?.plaintext ?? "")
      .filter(Boolean)
      .join("\n\n");
  }
  return "";
}

/**
 * Extract contributors from the activity record's `contributors` JSON field.
 * Each contributor has a `contributorIdentity` which is either:
 *   { $type: "...#contributorIdentity", identity: string }  — free-text / DID string
 *   A strong ref to a contributorInformation record
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractContributors(raw: any): BumicertContributor[] {
  if (!Array.isArray(raw)) return [];
  const result: BumicertContributor[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const identity = item["contributorIdentity"];
    if (!identity || typeof identity !== "object") continue;
    // contributorIdentity string variant
    if (typeof identity["identity"] === "string" && identity["identity"]) {
      result.push({ identity: identity["identity"] });
    }
  }
  return result;
}

// ── Activity item → BumicertData ─────────────────────────────────────────────

/**
 * Convert a GraphQL HcActivityItem to BumicertData.
 *
 * Org name and logo come from `item.creatorInfo`, which the indexer resolves
 * inline at query time — no separate org lookup needed.
 */
export function activityToBumicertData(item: GraphQLHcActivityItem): BumicertData {
  const metadata = item.metadata;
  const record = item.record;
  const creatorInfo = item.creatorInfo;

  const did = metadata?.did ?? "";
  const rkey = metadata?.rkey ?? "";

  // Extract image URL — the indexer resolves blob URIs inside JSON fields
  let coverImageUrl: string | null = null;
  if (record?.image) {
    if (typeof record.image === "object") {
      if ("uri" in record.image && record.image.uri) {
        coverImageUrl = record.image.uri;
      } else if ("image" in record.image && record.image.image?.uri) {
        coverImageUrl = record.image.image.uri;
      }
    }
  }

  // Get logo from creatorInfo (resolved inline by indexer)
  const logoUrl = creatorInfo?.organizationLogo?.uri ?? null;

  // Use org logo as cover image fallback if activity has no image
  if (!coverImageUrl && !logoUrl) {
    // no fallback available
  }

  // Extract description: now a LinearDocument, use extractLinearDocument to get plaintext
  // Fall back to shortDescription if description is empty
  const descriptionText = extractLinearDocument(record?.description);
  const description = descriptionText || record?.shortDescription || "";

  return {
    id: `${did}-${rkey}`,
    organizationDid: did,
    rkey,
    title: record?.title ?? "",
    shortDescription: record?.shortDescription ?? "",
    description,
    coverImageUrl,
    logoUrl,
    organizationName: creatorInfo?.organizationName ?? "",
    country: "", // country is on the org record, not the activity — populated via org query if needed
    objectives: extractWorkScopeObjectives(record?.workScope),
    contributors: extractContributors(record?.contributors),
    startDate: record?.startDate ?? null,
    endDate: record?.endDate ?? null,
    createdAt: record?.createdAt ?? metadata?.createdAt ?? "",
  };
}

// ── OrgInfoItem → OrganizationData ───────────────────────────────────────────

/**
 * Convert a GraphQL OrgInfoItem to OrganizationData.
 */
export function orgInfoToOrganizationData(
  item: GraphQLOrgInfoItem,
  bumicertCount: number = 0
): OrganizationData {
  const metadata = item.metadata;
  const record = item.record;
  const did = metadata?.did ?? "";

  return {
    did,
    displayName: record?.displayName ?? "",
    shortDescription: extractRichtext(record?.shortDescription),
    longDescription: extractLinearDocument(record?.longDescription),
    logoUrl: record?.logo?.uri ?? null,
    coverImageUrl: record?.coverImage?.uri ?? null,
    objectives: record?.objectives ?? [],
    country: record?.country ?? "",
    website: record?.website ?? null,
    startDate: record?.startDate ?? null,
    visibility: (record?.visibility as "Public" | "Unlisted") ?? "Public",
    createdAt: record?.createdAt ?? metadata?.createdAt ?? "",
    bumicertCount,
  };
}

// ── Combined Query Adapters ──────────────────────────────────────────────────

/**
 * Convert a list of HcActivityItems to BumicertData[].
 *
 * Org info (name, logo) comes from `item.creatorInfo` — no separate org map
 * needed since the indexer resolves it inline per item.
 */
export function activitiesToBumicertDataArray(
  activities: GraphQLHcActivityItem[]
): BumicertData[] {
  return activities.map((item) => activityToBumicertData(item));
}

/**
 * Derive a deduplicated list of OrganizationData from activity items.
 *
 * Since creatorInfo is inline on each activity, we don't need a separate
 * org info query. We aggregate: one entry per unique DID, with a bumicertCount.
 *
 * Note: `country`, `objectives`, and full org details are NOT available from
 * activity items alone. Those fields are left as empty defaults here.
 * For a full org profile, use the organization query directly.
 */
export function orgInfosToOrganizationDataArray(
  activities: GraphQLHcActivityItem[]
): OrganizationData[] {
  // Count activities per org DID
  const countByDid = new Map<string, number>();
  for (const item of activities) {
    const did = item.metadata?.did ?? "";
    if (did) countByDid.set(did, (countByDid.get(did) ?? 0) + 1);
  }

  // Deduplicate by DID — take the first occurrence of each org's creatorInfo
  const seenDids = new Set<string>();
  const orgs: OrganizationData[] = [];

  for (const item of activities) {
    const did = item.metadata?.did ?? "";
    if (!did || seenDids.has(did)) continue;
    seenDids.add(did);

    const creatorInfo = item.creatorInfo;
    orgs.push({
      did,
      displayName: creatorInfo?.organizationName ?? "",
      shortDescription: "",
      longDescription: "",
      logoUrl: creatorInfo?.organizationLogo?.uri ?? null,
      coverImageUrl: null,
      objectives: [],
      country: "",
      website: null,
      startDate: null,
      visibility: "Public",
      createdAt: item.metadata?.createdAt ?? "",
      bumicertCount: countByDid.get(did) ?? 0,
    });
  }

  return orgs;
}
