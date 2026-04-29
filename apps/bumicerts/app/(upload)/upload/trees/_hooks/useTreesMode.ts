"use client";

import { parseAsStringLiteral, useQueryState } from "nuqs";

const MODE_VALUES = ["upload"] as const;
type TreesMode = (typeof MODE_VALUES)[number];

const modeParser = parseAsStringLiteral(MODE_VALUES);

/**
 * Reads and writes the `?mode=` query param for the /upload/trees page.
 *
 * - `mode === "upload"` → upload wizard active
 * - `mode === null`     → tree manager active
 */
export function useTreesMode(): [
  TreesMode | null,
  (mode: TreesMode | null) => void,
] {
  const [mode, setMode] = useQueryState(
    "mode",
    modeParser.withOptions({ shallow: true, history: "push" }),
  );

  const setModeCasted = (value: TreesMode | null) => {
    void setMode(value);
  };

  return [mode, setModeCasted];
}
