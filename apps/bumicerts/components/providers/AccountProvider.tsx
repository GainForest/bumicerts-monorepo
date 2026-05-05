"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { AccountSummary } from "@/lib/account";
import { useCurrentAccount } from "@/hooks/use-account";

type AccountQueryResult = ReturnType<typeof useCurrentAccount>;

type AccountContextValue = {
  query: AccountQueryResult;
  account: AccountSummary | undefined;
  kind: AccountSummary["kind"] | null;
  isResolved: boolean;
  isLoading: boolean;
  isUnauthenticated: boolean;
  isUnknown: boolean;
  isUser: boolean;
  isOrganization: boolean;
};

const AccountContext = createContext<AccountContextValue | null>(null);

export function AccountProvider({ children }: { children: ReactNode }) {
  const query = useCurrentAccount();
  const account = query.data;
  const kind = account?.kind ?? null;

  const value: AccountContextValue = {
    query,
    account,
    kind,
    isResolved: query.status === "success",
    isLoading: query.isLoading,
    isUnauthenticated: kind === "unauthenticated",
    isUnknown: kind === "unknown",
    isUser: kind === "user",
    isOrganization: kind === "organization",
  };

  return (
    <AccountContext.Provider value={value}>{children}</AccountContext.Provider>
  );
}

export function useAccount() {
  const context = useContext(AccountContext);

  if (!context) {
    throw new Error("useAccount must be used within an AccountProvider");
  }

  return context;
}
