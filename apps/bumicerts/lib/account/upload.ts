import "server-only";

import type { OrganizationData } from "@/lib/types";
import type { AuthenticatedAccountState } from "./types";
import {
  buildOrganizationDataFromUserAccount,
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

  if (account.kind === "user") {
    return {
      kind: "user",
      did: account.did,
      organization: buildOrganizationDataFromUserAccount(account),
    };
  }

  return {
    kind: "organization",
    did: account.did,
    organization: buildOrganizationDataFromOrganizationAccount(account),
  };
}
