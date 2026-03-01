/**
 * Adapters: SDK types → canonical UI types (BumicertData, OrganizationData)
 *
 * These run server-side only and should NOT be imported in client components.
 * They depend on gainforest-sdk which is only safe on the server.
 */

import { getBlobUrl, parseAtUri } from "gainforest-sdk/utilities/atproto";
import { getEcocertsFromClaimActivities } from "gainforest-sdk/utilities/hypercerts";

type SupportedImageData = Parameters<typeof getBlobUrl>[1];
type ImageParam = SupportedImageData | { $type?: string } | null | undefined;
import type { BumicertData, OrganizationData } from "./types";
import { allowedPDSDomains } from "@/lib/config/gainforest-sdk";
import type {
  AppGainforestCommonDefs,
  AppGainforestOrganizationInfo,
  OrgHypercertsClaimActivity,
} from "gainforest-sdk/lex-api";
import type { GetRecordResponse, Ecocert } from "gainforest-sdk/types";

const pdsDomain = allowedPDSDomains[0];

// ── Helpers ──────────────────────────────────────────────────────────────────

function resolveSmallImageUrl(did: string, image: ImageParam): string | null {
  if (!image || typeof image === "string") return null;
  if (typeof image !== "object" || !("$type" in image) || !image.$type?.includes("smallImage")) return null;
  try {
    return getBlobUrl(did, image as SupportedImageData, pdsDomain);
  } catch {
    return null;
  }
}

function extractWorkScopeObjectives(
  workScope: OrgHypercertsClaimActivity.Record["workScope"]
): string[] {
  if (!workScope) return [];
  // workScope can be WorkScopeString ({ scope: string }) or a tags reference
  if ("scope" in workScope && typeof workScope.scope === "string") {
    return workScope.scope
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

function extractRichtext(rt: AppGainforestCommonDefs.Richtext | undefined): string {
  if (!rt) return "";
  return rt.text ?? "";
}

// ── Ecocert → BumicertData ────────────────────────────────────────────────────

export function ecocertToBumicertData(ecocert: Ecocert): BumicertData {
  const did = ecocert.repo.did;
  const record = ecocert.claimActivity.value;
  const { rkey } = parseAtUri(ecocert.claimActivity.uri);

  const imageUrl =
    resolveSmallImageUrl(did, record.image) ??
    ecocert.organizationInfo.coverImageUrl ??
    null;
  const logoUrl = ecocert.organizationInfo.logoUrl ?? null;

  return {
    id: `${did}-${rkey}`,
    organizationDid: did,
    rkey,

    title: record.title,
    shortDescription: record.shortDescription ?? "",
    description: record.description ?? record.shortDescription ?? "",

    coverImageUrl: imageUrl,
    logoUrl,
    organizationName: ecocert.organizationInfo.name,

    country: "",
    objectives: extractWorkScopeObjectives(record.workScope),

    startDate: record.startDate ?? null,
    endDate: record.endDate ?? null,
    createdAt: record.createdAt,
  };
}

// ── getAllAcrossOrgs response → BumicertData[] ────────────────────────────────

type ClaimsWithOrgInfo = {
  repo: { did: string };
  activities: Array<GetRecordResponse<OrgHypercertsClaimActivity.Record>>;
  organizationInfo: AppGainforestOrganizationInfo.Record;
};

export function claimsToEcocerts(data: ClaimsWithOrgInfo[]): Ecocert[] {
  return getEcocertsFromClaimActivities(data as Parameters<typeof getEcocertsFromClaimActivities>[0], pdsDomain);
}

export function claimsToBumicertDataArray(data: ClaimsWithOrgInfo[]): BumicertData[] {
  const ecocerts = claimsToEcocerts(data);
  return ecocerts.map((e) => ecocertToBumicertData(e));
}

// ── org info + claims → OrganizationData ─────────────────────────────────────

export function orgInfoToOrganizationData(
  did: string,
  orgInfo: AppGainforestOrganizationInfo.Record,
  bumicertCount: number
): OrganizationData {
  const logoUrl = resolveSmallImageUrl(did, orgInfo.logo);
  const coverImageUrl = resolveSmallImageUrl(did, orgInfo.coverImage);

  return {
    did,
    displayName: orgInfo.displayName,
    shortDescription: extractRichtext(orgInfo.shortDescription),
    longDescription:
      orgInfo.longDescription?.blocks
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ?.map((block) => (block.block as any)?.plaintext ?? "")
        .filter(Boolean)
        .join("\n\n") ?? "",

    logoUrl,
    coverImageUrl,

    objectives: orgInfo.objectives ?? [],
    country: orgInfo.country ?? "",
    website: orgInfo.website ?? null,
    startDate: orgInfo.startDate ?? null,
    visibility: (orgInfo.visibility as "Public" | "Unlisted") ?? "Public",
    createdAt: orgInfo.createdAt,

    bumicertCount,
  };
}

// ── getAllAcrossOrgs response → OrganizationData[] ────────────────────────────

export function claimsToOrganizationDataArray(
  data: ClaimsWithOrgInfo[]
): OrganizationData[] {
  return data
    .filter((org) => (org.organizationInfo.visibility as string) === "Public")
    .map((org) =>
      orgInfoToOrganizationData(org.repo.did, org.organizationInfo, org.activities.length)
    );
}
