/**
 * Adapters: GraphQL types → canonical UI types (BumicertData, OrganizationData)
 *
 * These transform data from the GraphQL indexer into the UI-friendly shapes
 * used throughout the bumicerts application.
 *
 * Post-redesign schema shape:
 *   Every leaf returns { data: [XxxItem!]!, pageInfo: { endCursor, hasNextPage, count } }
 *   Each item: { metadata, specialMetadata?, creatorInfo, record, fundingConfig? }
 *     metadata        – standard AT Protocol envelope (RecordMeta)
 *     specialMetadata – per-collection extras (labelTier/label for activities)
 *     creatorInfo     – org name + logo resolved inline by the indexer (no second round-trip)
 *     record          – pure lexicon payload fields
 *     fundingConfig   – joined funding config record (activities only)
 */

import type { BumicertData, BumicertContributor, OrganizationData } from "./types";
import type { LeafletLinearDocument } from "@gainforest/leaflet-react";
import type { Facet, FacetFeature } from "@gainforest/leaflet-react/richtext";

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

/** @deprecated Alias for GraphQLRecordMetadata — activities now use the same base type. */
export type GraphQLActivityMetadata = GraphQLRecordMetadata;

export interface GraphQLActivitySpecialMetadata {
  labelTier: string | null;
  label: {
    tier: string | null;
    labeler: string | null;
    labeledAt: string | null;
    syncedAt: string | null;
  } | null;
}

export interface GraphQLFundingConfigRecord {
  receivingWallet: unknown | null;
  status: string | null;
  goalInUSD: string | null;
  minDonationInUSD: string | null;
  maxDonationInUSD: string | null;
  allowOversell: boolean | null;
  createdAt: string | null;
  updatedAt: string | null;
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
 * { metadata, specialMetadata, fundingConfig, creatorInfo, record }
 */
export interface GraphQLHcActivityItem {
  metadata: GraphQLRecordMetadata | null;
  specialMetadata: GraphQLActivitySpecialMetadata | null;
  fundingConfig: GraphQLFundingConfigRecord | null;
  creatorInfo: GraphQLCreatorInfo | null;
  record: {
    title: string | null;
    shortDescription: string | null;
    shortDescriptionFacets: unknown; // JSON scalar — app.bsky.richtext.facet.Main[]
    description: unknown; // JSON scalar — pub.leaflet.pages.linearDocument
    startDate: string | null;
    endDate: string | null;
    createdAt: string | null;
    image: unknown; // JSON scalar - could be SmallImage wrapper or null
    workScope: unknown; // JSON scalar
    contributors: unknown; // JSON scalar — array of contributor objects
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
    shortDescription: unknown; // JSON scalar (Richtext — { text: string, facets?: ... })
    longDescription: unknown; // JSON scalar (pub.leaflet.pages.linearDocument)
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
function extractWorkScopeObjectives(workScope: unknown): string[] {
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
 * Type guard: checks if a value is a valid FacetFeature.
 * Must have a string $type and the required feature-specific fields.
 */
function isFacetFeature(val: unknown): val is FacetFeature {
  if (!val || typeof val !== "object") return false;
  const obj = val as Record<string, unknown>;
  const t = obj["$type"];
  if (t === "app.bsky.richtext.facet#mention") return typeof obj["did"] === "string";
  if (t === "app.bsky.richtext.facet#link") return typeof obj["uri"] === "string";
  if (t === "app.bsky.richtext.facet#tag") return typeof obj["tag"] === "string";
  return false;
}

/**
 * Type guard: checks if a value is a valid Facet.
 * Requires index.byteStart, index.byteEnd (numbers) and features array.
 */
function isFacet(val: unknown): val is Facet {
  if (!val || typeof val !== "object") return false;
  const obj = val as Record<string, unknown>;
  const idx = obj["index"];
  if (!idx || typeof idx !== "object") return false;
  const index = idx as Record<string, unknown>;
  if (typeof index["byteStart"] !== "number" || typeof index["byteEnd"] !== "number") return false;
  if (!Array.isArray(obj["features"])) return false;
  return true;
}

/**
 * Parse a raw JSON value as Facet[].
 * Filters out any malformed entries and normalises feature arrays.
 */
function parseFacets(raw: unknown): Facet[] {
  if (!Array.isArray(raw)) return [];
  // After filter(isFacet), each element is a validated Facet
  return (raw as unknown[]).filter(isFacet).map((facet) => ({
    index: {
      byteStart: facet.index.byteStart,
      byteEnd: facet.index.byteEnd,
    },
    // Filter features to only those with recognised $types
    features: facet.features.filter(isFacetFeature),
  }));
}

/**
 * Extract text and facets from a Richtext JSON field.
 * For org shortDescription which is stored as { text, facets? }.
 * Also handles legacy plain-string values.
 */
function extractRichtextWithFacets(rt: unknown): { text: string; facets: Facet[] } {
  if (!rt) return { text: "", facets: [] };
  if (typeof rt === "string") return { text: rt, facets: [] };
  if (typeof rt === "object" && "text" in rt) {
    const obj = rt as Record<string, unknown>;
    return {
      text: typeof obj["text"] === "string" ? obj["text"] : "",
      facets: parseFacets(obj["facets"]),
    };
  }
  return { text: "", facets: [] };
}

/**
 * Type guard: checks if a value is a valid LeafletLinearDocument.
 * Validates the minimum required structure: an object with a `blocks` array.
 */
function isLinearDocument(value: unknown): value is LeafletLinearDocument {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  return Array.isArray(obj["blocks"]);
}

/**
 * Parse a raw JSON value as a LeafletLinearDocument.
 *
 * If the value is already a valid LinearDocument, returns it as-is.
 * If the value is a plain string (legacy data), wraps it in a single text block.
 * Otherwise returns an empty document.
 */
function parseLinearDocument(raw: unknown): LeafletLinearDocument {
  if (isLinearDocument(raw)) return raw;
  // Legacy: plain string stored before LinearDocument was adopted
  if (typeof raw === "string" && raw.trim()) {
    return {
      blocks: raw.split(/\n\n+/).filter((p) => p.trim()).map((paragraph) => ({
        block: {
          $type: "pub.leaflet.blocks.text" as const,
          plaintext: paragraph.trim(),
        },
      })),
    };
  }
  return { blocks: [] };
}

/**
 * Extract plain text from a LeafletLinearDocument for search / SEO purposes.
 *
 * This is the ONLY legitimate use of extracting text from a LinearDocument.
 * For display, always use <LeafletRenderer> instead.
 */
export function extractTextFromLinearDocument(doc: LeafletLinearDocument): string {
  const extractTextFromListItems = (value: unknown): string[] => {
    if (!Array.isArray(value)) return [];

    const result: string[] = [];

    for (const item of value) {
      if (!item || typeof item !== "object") continue;
      const listItem = item as Record<string, unknown>;

      const content = listItem["content"];
      if (content && typeof content === "object") {
        const contentObj = content as Record<string, unknown>;
        const plaintext = contentObj["plaintext"];
        if (typeof plaintext === "string" && plaintext.trim().length > 0) {
          result.push(plaintext);
        }
      }

      const nested = listItem["children"];
      result.push(...extractTextFromListItems(nested));
    }

    return result;
  };

  return doc.blocks
    .map((wrapper) => {
      const block = wrapper.block;
      if ("plaintext" in block && typeof block.plaintext === "string") {
        return block.plaintext;
      }

      if (block.$type === "pub.leaflet.blocks.unorderedList") {
        const childrenText = extractTextFromListItems(block.children);
        return childrenText.join("\n");
      }

      return "";
    })
    .filter(Boolean)
    .join("\n\n");
}

/**
 * Extract contributors from the activity record's `contributors` JSON field.
 * Each contributor has a `contributorIdentity` which is either:
 *   { $type: "...#contributorIdentity", identity: string }  — free-text / DID string
 *   A strong ref to a contributorInformation record
 */
function extractContributors(raw: unknown): BumicertContributor[] {
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
      const img = record.image as Record<string, unknown>;
      if (typeof img["uri"] === "string" && img["uri"]) {
        coverImageUrl = img["uri"];
      } else if (typeof img["image"] === "object" && img["image"] !== null) {
        const nested = img["image"] as Record<string, unknown>;
        if (typeof nested["uri"] === "string" && nested["uri"]) {
          coverImageUrl = nested["uri"];
        }
      }
    }
  }

  // Get logo from creatorInfo (resolved inline by indexer)
  const logoUrl = creatorInfo?.organizationLogo?.uri ?? null;

  // Extract location strong refs — keep only entries that have a non-null uri
  const locationRefs = (record?.locations ?? [])
    .filter((ref): ref is { uri: string; cid: string | null } => typeof ref?.uri === "string")
    .map((ref) => ({ uri: ref.uri, cid: ref.cid ?? null }));

  return {
    id: `${did}-${rkey}`,
    organizationDid: did,
    rkey,
    cid: metadata?.cid ?? null,
    title: record?.title ?? "",
    shortDescription: record?.shortDescription ?? "",
    shortDescriptionFacets: parseFacets(record?.shortDescriptionFacets),
    description: parseLinearDocument(record?.description),
    coverImageUrl,
    logoUrl,
    organizationName: creatorInfo?.organizationName ?? "",
    country: "", // country is on the org record, not the activity — populated via org query if needed
    objectives: extractWorkScopeObjectives(record?.workScope),
    contributors: extractContributors(record?.contributors),
    startDate: record?.startDate ?? null,
    endDate: record?.endDate ?? null,
    createdAt: record?.createdAt ?? metadata?.createdAt ?? "",
    locationRefs,
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

  const shortDesc = extractRichtextWithFacets(record?.shortDescription);

  return {
    did,
    displayName: record?.displayName ?? "",
    shortDescription: shortDesc.text,
    shortDescriptionFacets: shortDesc.facets,
    longDescription: parseLinearDocument(record?.longDescription),
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
      shortDescriptionFacets: [],
      longDescription: { blocks: [] },
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
