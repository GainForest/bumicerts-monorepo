import { applyPatch as genericApplyPatch } from "../../../utils/shared/patch";

const REQUIRED_FIELDS: ReadonlySet<string> = new Set([
  "displayName",
  "shortDescription",
  "longDescription",
  "objectives",
  "country",
  "visibility",
]);

export const applyPatch = <T extends object>(
  existing: T,
  data: Partial<T>,
  unset?: ReadonlyArray<keyof T>
): T => genericApplyPatch(existing, data, unset, REQUIRED_FIELDS);
