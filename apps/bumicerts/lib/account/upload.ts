import "server-only";

import type { OrganizationData } from "@/lib/types";
import type { AuthenticatedAccountState } from "./types";
import { resolveAccountMediaUrl } from "./media";
import {
  buildOrganizationDataFromOrganizationAccount,
} from "./organization-data";

export type UploadAccountPageData = {
  did: string;
  kind: AuthenticatedAccountState["kind"];
  organization: OrganizationData | null;
};

export async function buildUploadAccountPageData(
  account: AuthenticatedAccountState,
): Promise<UploadAccountPageData> {
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
