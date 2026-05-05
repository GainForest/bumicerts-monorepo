import { countries } from "@/lib/countries";
import type { OrganizationData } from "@/lib/types";
import { textToLinearDocument } from "@/lib/utils/linearDocument";
import type {
  AccountLocationRef,
  OrganizationAccountState,
  UserAccountState,
} from "./types";
import { resolveAccountMediaUrl } from "./media";

export function normalizeAccountOrganizationVisibility(
  visibility: string | null | undefined,
): OrganizationData["visibility"] {
  return visibility === "unlisted" ? "Unlisted" : "Public";
}

function isLeafletLinearDocument(
  value: unknown,
): value is OrganizationData["longDescription"] {
  if (!value || typeof value !== "object") {
    return false;
  }

  return Array.isArray((value as { blocks?: unknown }).blocks);
}

function resolveOrganizationLongDescription(
  value: unknown,
): OrganizationData["longDescription"] {
  const fromPlainText = (text: string): OrganizationData["longDescription"] =>
    text.trim().length > 0 ? textToLinearDocument(text) : { blocks: [] };

  if (value === undefined || value === null) {
    return { blocks: [] };
  }

  if (isLeafletLinearDocument(value)) {
    return value;
  }

  if (typeof value !== "object") {
    return fromPlainText(String(value));
  }

  const record = value as Record<string, unknown>;

  if (typeof record["value"] === "string") {
    return fromPlainText(record["value"]);
  }

  return { blocks: [] };
}

function findCountryCodeByLocationRef(location: AccountLocationRef): string {
  for (const [code, definition] of Object.entries(countries)) {
    if (definition.uri === location.uri || definition.cid === location.cid) {
      return code;
    }
  }

  return "";
}

export function buildOrganizationDataFromUserAccount(
  account: UserAccountState,
  options?: {
    displayNameFallback?: string;
    bumicertCount?: number;
  },
): OrganizationData {
  const logoUrl = resolveAccountMediaUrl(account.profile.avatar);
  const coverImageUrl = resolveAccountMediaUrl(account.profile.banner);
  const displayName = account.profile.displayName?.trim();

  return {
    did: account.did,
    displayName:
      displayName && displayName.length > 0
        ? displayName
        : (options?.displayNameFallback ?? ""),
    shortDescription: account.profile.description ?? "",
    shortDescriptionFacets: [],
    longDescription: { blocks: [] },
    logoUrl,
    coverImageUrl,
    objectives: [],
    country: "",
    website: account.profile.website ?? null,
    startDate: null,
    visibility: "Public",
    createdAt: account.profile.createdAt,
    bumicertCount: options?.bumicertCount ?? 0,
  };
}

export function buildOrganizationDataFromOrganizationAccount(
  account: OrganizationAccountState,
  bumicertCount: number = 0,
): OrganizationData {
  const logoUrl = resolveAccountMediaUrl(account.profile.avatar);
  const coverImageUrl = resolveAccountMediaUrl(account.profile.banner);
  const country = account.organization.location
    ? findCountryCodeByLocationRef(account.organization.location)
    : "";

  return {
    did: account.did,
    displayName:
      account.profile.displayName ??
      account.organization.organizationType?.[0] ??
      "",
    shortDescription: account.profile.description ?? "",
    shortDescriptionFacets: [],
    longDescription: resolveOrganizationLongDescription(
      account.organization.longDescription,
    ),
    logoUrl,
    coverImageUrl,
    objectives: [],
    country,
    website: account.profile.website ?? null,
    startDate: account.organization.foundedDate ?? null,
    visibility: normalizeAccountOrganizationVisibility(
      account.organization.visibility,
    ),
    createdAt: account.profile.createdAt,
    bumicertCount,
  };
}
