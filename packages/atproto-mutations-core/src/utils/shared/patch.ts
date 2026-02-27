/**
 * Merge a partial patch over an existing record.
 *
 * Steps (in order):
 *   1. Start with a shallow copy of `existing`.
 *   2. For each key in `unset`, delete it from the copy — UNLESS the key is
 *      present in `requiredFields`, in which case it is silently left alone.
 *   3. For each key in `data`, overwrite the copy — skipping keys whose
 *      value is `undefined` (absent optional fields in a partial input).
 *
 * The caller is responsible for re-pinning system fields (`$type`, `createdAt`)
 * after calling this function, as they are not touched here.
 */
export function applyPatch<T extends object>(
  existing: T,
  data: Partial<T>,
  unset: ReadonlyArray<keyof T> | undefined,
  requiredFields: ReadonlySet<string>
): T {
  const result = { ...existing } as Record<string, unknown>;

  if (unset) {
    for (const key of unset) {
      if (!requiredFields.has(key as string)) {
        delete result[key as string];
      }
    }
  }

  for (const [key, value] of Object.entries(data as object)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }

  return result as T;
}
