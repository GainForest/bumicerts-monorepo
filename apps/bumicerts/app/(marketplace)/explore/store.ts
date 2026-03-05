/**
 * Explore Page Store
 *
 * Manages the state for the explore page, including:
 * - Organizations list
 * - Bumicerts (activities) list
 * - Loading and error states
 *
 * Data is fetched from the GraphQL indexer and transformed to UI types.
 */

import { create } from "zustand";
import { Nullable } from "nuqs";
import type { BumicertData, OrganizationData } from "@/lib/types";

// ── State Types ──────────────────────────────────────────────────────────────

type BaseExploreStoreState = {
  organizations: OrganizationData[];
  bumicerts: BumicertData[];
};

type ExploreStoreGoodState = BaseExploreStoreState & {
  loading: false;
  error: null;
};

type ExploreStoreBadState = Nullable<BaseExploreStoreState> & {
  loading: false;
  error: Error;
};

type ExploreStoreLoadingState = Nullable<BaseExploreStoreState> & {
  loading: true;
  error: null;
};

export type ExploreStoreState =
  | ExploreStoreGoodState
  | ExploreStoreBadState
  | ExploreStoreLoadingState;

// ── Actions ──────────────────────────────────────────────────────────────────

export type ExploreStoreActions = {
  /**
   * Update the store with new data.
   * - null: Set loading state (preserves existing data)
   * - Error: Set error state (preserves existing data)
   * - { organizations, bumicerts }: Set success state with new data
   */
  update: (
    data:
      | { organizations: OrganizationData[]; bumicerts: BumicertData[] }
      | null
      | Error
  ) => void;
};

// ── Store ────────────────────────────────────────────────────────────────────

const initialState: ExploreStoreState = {
  organizations: null,
  bumicerts: null,
  loading: true,
  error: null,
};

export const useExploreStore = create<ExploreStoreState & ExploreStoreActions>(
  (set, get) => ({
    ...initialState,

    update: (data) => {
      // data === null => loading state
      if (data === null) {
        set({
          loading: true,
          organizations: get().organizations,
          bumicerts: get().bumicerts,
          error: null,
        });
        return;
      }

      // data is an error => bad state
      if (data instanceof Error) {
        set({
          organizations: get().organizations,
          bumicerts: get().bumicerts,
          loading: false,
          error: data,
        });
        return;
      }

      // data is { organizations, bumicerts } => good state
      set({
        organizations: data.organizations,
        bumicerts: data.bumicerts,
        loading: false,
        error: null,
      });
    },
  })
);
