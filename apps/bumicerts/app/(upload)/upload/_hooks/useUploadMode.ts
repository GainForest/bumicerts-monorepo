"use client";

import { parseAsStringLiteral, useQueryState } from "nuqs";

const MODE_VALUES = ["edit", "onboard-user", "onboard-org"] as const;
type ManageMode = (typeof MODE_VALUES)[number];

const modeParser = parseAsStringLiteral(MODE_VALUES);

/**
 * Reads and writes the `?mode=` query param for the /upload page.
 *
 * - `mode === "edit"`         → edit mode active
 * - `mode === "onboard-user"` → user onboarding active
 * - `mode === "onboard-org"`  → organization onboarding active
 * - `mode === null`            → view mode or onboarding chooser
 *
 * Using nuqs makes the URL the single source of truth:
 * - The Edit button sets mode → "edit" (shallow push)
 * - Onboarding choices can deep-link directly into their respective setup flow
 * - Cancel/back sets mode → null  (removes the param, stays on /upload)
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
