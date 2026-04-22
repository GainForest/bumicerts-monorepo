"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { LeafletLinearDocument } from "@gainforest/leaflet-react";
import { useStore } from "zustand";
import { createStore, type StoreApi } from "zustand/vanilla";
import type { EvidenceTabId } from "./evidenceRegistry";

const EMPTY_DOC: LeafletLinearDocument = { blocks: [] };

type EvidenceAdderState = {
  activeTab: EvidenceTabId | undefined;
  description: LeafletLinearDocument;
  isSubmitting: boolean;
  activityUri: string;
  activityCid: string;
};

type EvidenceAdderActions = {
  setActiveTab: (value: EvidenceTabId | undefined) => void;
  setDescription: (value: LeafletLinearDocument) => void;
  resetDescription: () => void;
  setIsSubmitting: (value: boolean) => void;
};

type EvidenceAdderStore = EvidenceAdderState & EvidenceAdderActions;

type EvidenceAdderStoreApi = StoreApi<EvidenceAdderStore>;

function createEvidenceAdderStore(init: {
  activityUri: string;
  activityCid: string;
}): EvidenceAdderStoreApi {
  return createStore<EvidenceAdderStore>((set) => ({
    activeTab: undefined,
    description: EMPTY_DOC,
    isSubmitting: false,
    activityUri: init.activityUri,
    activityCid: init.activityCid,
    setActiveTab: (value) => set({ activeTab: value }),
    setDescription: (value) => set({ description: value }),
    resetDescription: () => set({ description: EMPTY_DOC }),
    setIsSubmitting: (value) => set({ isSubmitting: value }),
  }));
}

const EvidenceAdderStoreContext = createContext<EvidenceAdderStoreApi | null>(
  null,
);

export function EvidenceAdderStoreProvider({
  activityUri,
  activityCid,
  children,
}: {
  activityUri: string;
  activityCid: string;
  children: ReactNode;
}) {
  const [store] = useState(() =>
    createEvidenceAdderStore({ activityUri, activityCid }),
  );

  return (
    <EvidenceAdderStoreContext.Provider value={store}>
      {children}
    </EvidenceAdderStoreContext.Provider>
  );
}

export function useEvidenceAdderStore<T>(
  selector: (state: EvidenceAdderStore) => T,
): T {
  const store = useContext(EvidenceAdderStoreContext);

  if (!store) {
    throw new Error(
      "useEvidenceAdderStore must be used within EvidenceAdderStoreProvider",
    );
  }

  return useStore(store, selector);
}
