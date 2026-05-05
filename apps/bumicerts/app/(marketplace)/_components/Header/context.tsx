"use client";

import { createContext, useContext, ReactNode } from "react";
import { create } from "zustand";
import type { AccountKind } from "@/lib/account";
import { useAccount } from "@/components/providers/AccountProvider";

// ─── Zustand store for header slots ─────────────────────────────────────────
// Slots live outside React state so that calling setters does NOT trigger a
// re-render of the provider tree — only the Header component that subscribes
// to the slot values re-renders. This breaks the infinite loop caused by
// useEffect + setState when JSX props are new references every render.

type HeaderSlots = {
  leftContent: ReactNode;
  rightContent: ReactNode;
  subHeaderContent: ReactNode;
  setLeftContent: (node: ReactNode) => void;
  setRightContent: (node: ReactNode) => void;
  setSubHeaderContent: (node: ReactNode) => void;
};

export const useHeaderSlots = create<HeaderSlots>((set) => ({
  leftContent: null,
  rightContent: null,
  subHeaderContent: null,
  setLeftContent: (node) => set({ leftContent: node }),
  setRightContent: (node) => set({ rightContent: node }),
  setSubHeaderContent: (node) => set({ subHeaderContent: node }),
}));

// ─── Context — only carries isUnauthenticated ────────────────────────────────

interface HeaderContextValue {
  /** True when the user is confirmed unauthenticated — use to downgrade primary CTAs */
  isUnauthenticated: boolean;
  /** Null while the account query is still loading. */
  accountKind: AccountKind | null;
  isAccountLoading: boolean;
}

const HeaderContext = createContext<HeaderContextValue>({
  isUnauthenticated: false,
  accountKind: null,
  isAccountLoading: true,
});

export function HeaderProvider({ children }: { children: ReactNode }) {
  const { kind, query } = useAccount();
  const isUnauthenticated = kind === "unauthenticated";
  const accountKind = query.isLoading ? null : kind;

  return (
    <HeaderContext.Provider
      value={{
        isUnauthenticated,
        accountKind,
        isAccountLoading: query.isLoading,
      }}
    >
      {children}
    </HeaderContext.Provider>
  );
}

export function useHeaderContext() {
  return useContext(HeaderContext);
}
