"use client";

import { useAccount } from "@/components/providers/AccountProvider";
import { useAtprotoStore } from "@/components/stores/atproto";
import { resolveAccountMediaUrl } from "@/lib/account/media";

export function useCurrentAccountIdentity() {
  const auth = useAtprotoStore((state) => state.auth);
  const accountContext = useAccount();
  const account = accountContext.account;

  const onboardedAccount =
    account?.kind === "user" || account?.kind === "organization"
      ? account
      : null;

  const displayName =
    onboardedAccount?.profile.displayName ??
    auth.user?.displayName ??
    auth.user?.handle ??
    "";

  const logoUrl = onboardedAccount
    ? resolveAccountMediaUrl(onboardedAccount.profile.avatar)
    : null;

  return {
    auth,
    account,
    query: accountContext.query,
    displayName,
    logoUrl,
    isOrganization: account?.kind === "organization",
  };
}
