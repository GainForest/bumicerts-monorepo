"use client";

import { createContext, useContext, ReactNode } from "react";
import { useAtprotoStore } from "@/components/stores/atproto";
import { create } from "zustand";

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
}

const HeaderContext = createContext<HeaderContextValue>({
  isUnauthenticated: false,
});

export function HeaderProvider({ children }: { children: ReactNode }) {
  const auth = useAtprotoStore((s) => s.auth);
  const isUnauthenticated = auth.status === "UNAUTHENTICATED";

  return (
    <HeaderContext.Provider value={{ isUnauthenticated }}>
      {children}
    </HeaderContext.Provider>
  );
}

export function useHeaderContext() {
  return useContext(HeaderContext);
}
