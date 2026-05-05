import type { AuthenticatedAccountState } from "@/lib/account";
import { buildOrganizationDataFromOrganizationAccount } from "@/lib/account/organization-data";
import { resolveAccountMediaUrl } from "@/lib/account/media";
import type { OrganizationData } from "@/lib/types";

export type UploadAccountPageData = {
  did: string;
  kind: AuthenticatedAccountState["kind"];
  organization: OrganizationData | null;
};

export function buildUploadAccountPageDataFromAccount(
  account: AuthenticatedAccountState,
): UploadAccountPageData {
  if (account.kind === "unknown") {
    return {
      kind: "unknown",
      did: account.did,
      organization: null,
    };
  }

  const logoUrl = resolveAccountMediaUrl(account.profile.avatar);
  const coverImageUrl = resolveAccountMediaUrl(account.profile.banner);

  if (account.kind === "user") {
    return {
      kind: "user",
      did: account.did,
      organization: {
        did: account.did,
        displayName: account.profile.displayName ?? "",
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
        bumicertCount: 0,
      },
    };
  }

  return {
    kind: "organization",
    did: account.did,
    organization: buildOrganizationDataFromOrganizationAccount(account),
  };
}
