/**
 * Adapters: GraphQL types → canonical UI types (BumicertData, OrganizationData)
 *
 * These transform data from the GraphQL indexer into the UI-friendly shapes
 * used throughout the bumicerts application.
 */

import type { BumicertData, OrganizationData } from "./types";
import { parseAtUri } from "@gainforest/atproto-mutations-next";

// ── GraphQL Response Types ───────────────────────────────────────────────────
// These match the GraphQL schema from the indexer

export interface GraphQLBlobRef {
  cid: string | null;
  mimeType: string | null;
  size: number | null;
  uri: string | null;
}

export interface GraphQLRecordMeta {
  cid: string | null;
  collection: string | null;
  createdAt: string | null;
  did: string | null;
  indexedAt: string | null;
  rkey: string | null;
  uri: string | null;
}

export interface GraphQLStrongRef {
  cid: string | null;
  uri: string | null;
}

export interface GraphQLHcActivity {
  title: string | null;
  shortDescription: string | null;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  createdAt: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  image: any; // JSON scalar - could be SmallImage wrapper or null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  workScope: any; // JSON scalar
  locations: GraphQLStrongRef[] | null;
  meta: GraphQLRecordMeta | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  contributors: any; // JSON scalar
  rights: GraphQLStrongRef | null;
}

export interface GraphQLOrgInfo {
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
  meta: GraphQLRecordMeta | null;
}

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

// ── Activity → BumicertData ──────────────────────────────────────────────────

/**
 * Convert a GraphQL HcActivity to BumicertData.
 * Requires the associated organization info for logo/name.
 */
export function activityToBumicertData(
  activity: GraphQLHcActivity,
  orgInfo?: GraphQLOrgInfo | null
): BumicertData {
  const meta = activity.meta;
  const did = meta?.did ?? "";
  const rkey = meta?.rkey ?? "";

  // Extract image URL - the indexer resolves blob URIs
  let coverImageUrl: string | null = null;
  if (activity.image) {
    // Could be { image: { uri: "..." } } wrapper or direct blob
    if (typeof activity.image === "object") {
      if ("uri" in activity.image && activity.image.uri) {
        coverImageUrl = activity.image.uri;
      } else if ("image" in activity.image && activity.image.image?.uri) {
        coverImageUrl = activity.image.image.uri;
      }
    }
  }
  // Fallback to org cover image
  if (!coverImageUrl && orgInfo?.coverImage?.uri) {
    coverImageUrl = orgInfo.coverImage.uri;
  }

  // Get logo from org info
  const logoUrl = orgInfo?.logo?.uri ?? null;

  return {
    id: `${did}-${rkey}`,
    organizationDid: did,
    rkey,
    title: activity.title ?? "",
    shortDescription: activity.shortDescription ?? "",
    description: activity.description ?? activity.shortDescription ?? "",
    coverImageUrl,
    logoUrl,
    organizationName: orgInfo?.displayName ?? "",
    country: orgInfo?.country ?? "",
    objectives: extractWorkScopeObjectives(activity.workScope),
    startDate: activity.startDate ?? null,
    endDate: activity.endDate ?? null,
    createdAt: activity.createdAt ?? meta?.createdAt ?? "",
  };
}

// ── OrgInfo → OrganizationData ───────────────────────────────────────────────

/**
 * Convert a GraphQL OrgInfo to OrganizationData.
 */
export function orgInfoToOrganizationData(
  orgInfo: GraphQLOrgInfo,
  bumicertCount: number = 0
): OrganizationData {
  const did = orgInfo.meta?.did ?? "";

  return {
    did,
    displayName: orgInfo.displayName ?? "",
    shortDescription: extractRichtext(orgInfo.shortDescription),
    longDescription: extractLinearDocument(orgInfo.longDescription),
    logoUrl: orgInfo.logo?.uri ?? null,
    coverImageUrl: orgInfo.coverImage?.uri ?? null,
    objectives: orgInfo.objectives ?? [],
    country: orgInfo.country ?? "",
    website: orgInfo.website ?? null,
    startDate: orgInfo.startDate ?? null,
    visibility: (orgInfo.visibility as "Public" | "Unlisted") ?? "Public",
    createdAt: orgInfo.createdAt ?? orgInfo.meta?.createdAt ?? "",
    bumicertCount,
  };
}

// ── Combined Query Adapters ──────────────────────────────────────────────────

/**
 * Convert a list of activities with their org info to BumicertData[].
 * Used for the explore page.
 */
export function activitiesToBumicertDataArray(
  activities: GraphQLHcActivity[],
  orgInfoByDid: Map<string, GraphQLOrgInfo>
): BumicertData[] {
  return activities.map((activity) => {
    const did = activity.meta?.did ?? "";
    const orgInfo = orgInfoByDid.get(did);
    return activityToBumicertData(activity, orgInfo);
  });
}

/**
 * Convert a list of org infos with activity counts to OrganizationData[].
 * Used for the organizations list page.
 */
export function orgInfosToOrganizationDataArray(
  orgInfos: GraphQLOrgInfo[],
  activityCountByDid: Map<string, number>
): OrganizationData[] {
  return orgInfos
    .filter((org) => org.visibility === "Public")
    .map((org) => {
      const did = org.meta?.did ?? "";
      const count = activityCountByDid.get(did) ?? 0;
      return orgInfoToOrganizationData(org, count);
    });
}
