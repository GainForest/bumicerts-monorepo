"use client";

import { create } from "zustand";
import type { LeafletLinearDocument } from "@gainforest/leaflet-react";
import type { Facet } from "@gainforest/leaflet-react/richtext";

export const UNCHANGED_EDIT = Symbol("unchanged-edit");

export function isUnchangedEdit<T>(
  value: T | typeof UNCHANGED_EDIT,
): value is typeof UNCHANGED_EDIT {
  return value === UNCHANGED_EDIT;
}

// ─── Editable field shape ────────────────────────────────────────────────────

/**
 * Fields that can be modified in edit mode.
 * `UNCHANGED_EDIT` means "unchanged from the server value".
 */
export type EditableFields = {
  displayName: string | typeof UNCHANGED_EDIT;
  shortDescription: string | null | typeof UNCHANGED_EDIT;
  /**
   * Richtext facets for shortDescription.
   * UNCHANGED_EDIT = no change from the server value.
   * [] = facets explicitly cleared.
   */
  shortDescriptionFacets: Facet[] | typeof UNCHANGED_EDIT;
  /**
   * Long-form about section as a Leaflet LinearDocument.
    * null = no change from the server value.
   */
  longDescription: LeafletLinearDocument | null;
  /** New cover image file to upload (null = no change) */
  coverImage: File | null;
  /** New logo file to upload (null = no change) */
  logo: File | null;
  country: string | null | typeof UNCHANGED_EDIT;
  website: string | null | typeof UNCHANGED_EDIT;
  startDate: string | null | typeof UNCHANGED_EDIT;
  visibility: "Public" | "Unlisted" | typeof UNCHANGED_EDIT;
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
  displayName: UNCHANGED_EDIT,
  shortDescription: UNCHANGED_EDIT,
  shortDescriptionFacets: UNCHANGED_EDIT,
  longDescription: null,
  coverImage: null,
  logo: null,
  country: UNCHANGED_EDIT,
  website: UNCHANGED_EDIT,
  startDate: UNCHANGED_EDIT,
  visibility: UNCHANGED_EDIT,
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
      (k) => edits[k] !== EMPTY_EDITS[k],
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
