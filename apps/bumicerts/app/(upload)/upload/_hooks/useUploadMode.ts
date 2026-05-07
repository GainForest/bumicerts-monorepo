"use client";

import { parseAsStringLiteral, useQueryState } from "nuqs";

const MODE_VALUES = ["edit"] as const;
type ManageMode = (typeof MODE_VALUES)[number];

const modeParser = parseAsStringLiteral(MODE_VALUES);

/**
 * Reads and writes the `?mode=` query param for the /manage page.
 *
 * - `mode === "edit"` → edit mode active
 * - `mode === null`   → view mode (param absent)
 *
 * Using nuqs makes the URL the single source of truth:
 * - The Edit button sets mode → "edit" (shallow push)
 * - Cancel sets mode → null  (removes the param, stays on /manage)
 * - No Zustand isEditing flag, no useRef guards, no sync bugs.
 */
export function useManageMode(): [
  ManageMode | null,
  (mode: ManageMode | null) => void,
] {
  const [mode, setMode] = useQueryState(
    "mode",
    modeParser.withOptions({ shallow: true, history: "push" }),
  );

  const setModeCasted = (value: ManageMode | null) => {
    void setMode(value);
  };

  return [mode, setModeCasted];
}
