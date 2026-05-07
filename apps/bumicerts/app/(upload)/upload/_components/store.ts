"use client";

import { create } from "zustand";
import type { LeafletLinearDocument } from "@gainforest/leaflet-react";
import type { Facet } from "@gainforest/leaflet-react/richtext";

// ─── Editable field shape ────────────────────────────────────────────────────

/**
 * Fields that can be modified in edit mode.
 * `null` means "unchanged from the server value".
 */
export type EditableFields = {
  displayName: string | null;
  shortDescription: string | null;
  /**
   * Richtext facets for shortDescription.
   * null = no change from the server value (empty array = facets cleared).
   */
  shortDescriptionFacets: Facet[] | null;
  /**
   * Long-form about section as a Leaflet LinearDocument.
   * null = no change from the server value.
   */
  longDescription: LeafletLinearDocument | null;
  /** New cover image file to upload (null = no change) */
  coverImage: File | null;
  /** New logo file to upload (null = no change) */
  logo: File | null;
  country: string | null;
  website: string | null;
  startDate: string | null;
  visibility: "Public" | "Unlisted" | null;
};

// ─── Store state ─────────────────────────────────────────────────────────────

type ManageDashboardState = {
  /** Whether a save mutation is in flight. */
  isSaving: boolean;
  /** Error message from the last save attempt (null = no error). */
  saveError: string | null;
  /** Buffered edits. */
  edits: EditableFields;
};

// ─── Store actions ────────────────────────────────────────────────────────────

type ManageDashboardActions = {
  /** Discard buffered edits (called on cancel). */
  cancelEditing: () => void;
  /** Update a single editable field. */
  setEdit: <K extends keyof EditableFields>(
    key: K,
    value: EditableFields[K],
  ) => void;
  /** True when at least one field has been modified. */
  hasChanges: () => boolean;
  /** Mark save as in-flight. */
  setSaving: (saving: boolean) => void;
  /** Record a save error (null to clear). */
  setSaveError: (error: string | null) => void;
  /**
   * Called on successful save — reset edits and isSaving flag.
   * The caller is responsible for updating the query cache so the page
   * shows the new data immediately.
   */
  onSaveSuccess: () => void;
};

// ─── Initial edits ────────────────────────────────────────────────────────────

const EMPTY_EDITS: EditableFields = {
  displayName: null,
  shortDescription: null,
  shortDescriptionFacets: null,
  longDescription: null,
  coverImage: null,
  logo: null,
  country: null,
  website: null,
  startDate: null,
  visibility: null,
};

// ─── Store ───────────────────────────────────────────────────────────────────

export const useManageDashboardState = create<
  ManageDashboardState & ManageDashboardActions
>((set, get) => ({
  // State
  isSaving: false,
  saveError: null,
  edits: { ...EMPTY_EDITS },

  // Actions
  cancelEditing: () => set({ edits: { ...EMPTY_EDITS }, saveError: null }),

  setEdit: (key, value) =>
    set((state) => ({ edits: { ...state.edits, [key]: value } })),

  hasChanges: () => {
    const { edits } = get();
    return (Object.keys(edits) as (keyof EditableFields)[]).some(
      (k) => edits[k] !== null,
    );
  },

  setSaving: (saving) => set({ isSaving: saving }),

  setSaveError: (error) => set({ saveError: error }),

  onSaveSuccess: () =>
    set({
      isSaving: false,
      saveError: null,
      edits: { ...EMPTY_EDITS },
    }),
}));
