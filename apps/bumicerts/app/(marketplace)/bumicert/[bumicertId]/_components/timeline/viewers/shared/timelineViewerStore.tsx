"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { useStore } from "zustand";
import { createStore, type StoreApi } from "zustand/vanilla";

type TimelineViewerState = {
  isOwner: boolean;
  selectedPreviewTileByEntryId: Record<string, string>;
};

type TimelineViewerActions = {
  setSelectedPreviewTile: (entryId: string, tileId: string) => void;
};

type TimelineViewerStore = TimelineViewerState & TimelineViewerActions;

type TimelineViewerStoreApi = StoreApi<TimelineViewerStore>;

function createTimelineViewerStore(init: { isOwner: boolean }): TimelineViewerStoreApi {
  return createStore<TimelineViewerStore>((set) => ({
    isOwner: init.isOwner,
    selectedPreviewTileByEntryId: {},
    setSelectedPreviewTile: (entryId, tileId) =>
      set((state) => ({
        selectedPreviewTileByEntryId: {
          ...state.selectedPreviewTileByEntryId,
          [entryId]: tileId,
        },
      })),
  }));
}

const TimelineViewerStoreContext = createContext<TimelineViewerStoreApi | null>(
  null,
);

export function TimelineViewerStoreProvider({
  isOwner,
  children,
}: {
  isOwner: boolean;
  children: ReactNode;
}) {
  const [store] = useState(() => createTimelineViewerStore({ isOwner }));

  return (
    <TimelineViewerStoreContext.Provider value={store}>
      {children}
    </TimelineViewerStoreContext.Provider>
  );
}

export function useTimelineViewerStore<T>(
  selector: (state: TimelineViewerStore) => T,
): T {
  const store = useContext(TimelineViewerStoreContext);

  if (!store) {
    throw new Error(
      "useTimelineViewerStore must be used within TimelineViewerStoreProvider",
    );
  }

  return useStore(store, selector);
}
