export type ParsedDateState = "empty" | "valid" | "invalid";

type ParsedDateResult = {
  state: ParsedDateState;
  date: Date | null;
};

/**
 * Parses a date string that can be either:
 * - date-only (YYYY-MM-DD)
 * - ISO datetime (e.g. 2024-01-01T00:00:00Z)
 *
 * Returns an explicit state so callers can distinguish empty vs invalid values.
 */
export function parseOrganizationDate(value: string | null): ParsedDateResult {
  if (!value) {
    return { state: "empty", date: null };
  }

  const trimmed = value.trim();
  if (trimmed === "") {
    return { state: "empty", date: null };
  }

  // Keep date-only values timezone-stable while still supporting full ISO strings.
  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(trimmed);
  const parsedDate = new Date(isDateOnly ? `${trimmed}T00:00:00Z` : trimmed);

  if (Number.isNaN(parsedDate.getTime())) {
    return { state: "invalid", date: null };
  }

  return { state: "valid", date: parsedDate };
}

export function formatOrganizationSinceDate(value: string | null): {
  label: string | null;
  state: ParsedDateState;
} {
  const parsed = parseOrganizationDate(value);

  if (parsed.state !== "valid" || !parsed.date) {
    return { label: null, state: parsed.state };
  }

  return {
    label: parsed.date.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    }),
    state: "valid",
  };
}
