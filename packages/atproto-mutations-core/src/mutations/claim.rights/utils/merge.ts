import { applyPatch as genericApplyPatch } from "../../../utils/shared/patch";

const REQUIRED_FIELDS: ReadonlySet<string> = new Set([
  "rightsName",
  "rightsType",
  "rightsDescription",
]);

export const applyPatch = <T extends object>(
  existing: T,
  data: Partial<T>,
  unset?: readonly string[]
): T => genericApplyPatch(existing, data, unset, REQUIRED_FIELDS);
