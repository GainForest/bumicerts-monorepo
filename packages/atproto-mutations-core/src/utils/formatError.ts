import type { ValidationIssue } from "../result";
import { MutationError } from "../error";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * A human-readable representation of a single mutation error.
 */
export type FormattedError = {
  /**
   * User-facing message suitable for display in UI.
   * Plain English, no JSONPath or technical jargon.
   * @example "Organization name must be at least 8 characters"
   */
  userMessage: string;
  /**
   * Developer-facing message with technical context.
   * Identical to the raw error message from the mutations package.
   * @example "string too small (minimum 8) at $.displayName (got 6)"
   */
  developerMessage: string;
  /**
   * Top-level field name that caused the error, if identifiable.
   * Extracted from the first path segment of the validation issue.
   * @example "displayName"
   */
  field?: string;
  /** Structured constraint that was violated, if applicable. */
  constraint?: {
    type:
      | "minLength"
      | "maxLength"
      | "required"
      | "format"
      | "type"
      | "value"
      | "other";
    /** The threshold or expected value */
    expected?: number | string | string[];
    /** The actual value that was received */
    actual?: number | string;
  };
};

/**
 * Mapping from field names (as they appear in the ATProto lexicon) to
 * user-friendly display labels.
 *
 * @example
 * const labels: FieldLabels = {
 *   displayName: "Organization name",
 *   shortDescription: "Short description",
 * };
 */
export type FieldLabels = Record<string, string>;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Extracts the top-level field key from a path array.
 * Nested paths (e.g. ["longDescription", "blocks", 0]) resolve to the
 * top-level key so the consumer can look up a label without knowing the
 * internal document structure.
 */
function extractField(path: (string | number)[]): string | undefined {
  const first = path[0];
  return typeof first === "string" ? first : undefined;
}

/**
 * Converts a camelCase identifier to a readable Title-case label.
 * Used as a fallback when no explicit label is provided.
 * @example "displayName" → "Display name"
 */
function camelToLabel(field: string): string {
  return field
    .replace(/([A-Z])/g, " $1")
    .replace(/^(.)/, (s) => s.toUpperCase())
    .trim();
}

/** Resolves a label for a field, falling back to auto-generated form. */
function resolveLabel(field: string | undefined, fieldLabels?: FieldLabels): string {
  if (!field) return "This field";
  return fieldLabels?.[field] ?? camelToLabel(field);
}

// ---------------------------------------------------------------------------
// Issue → FormattedError
// ---------------------------------------------------------------------------

function formatIssue(
  issue: ValidationIssue,
  fieldLabels?: FieldLabels
): FormattedError {
  const field = extractField(issue.path);
  const label = resolveLabel(field, fieldLabels);

  switch (issue.code) {
    case "too_small": {
      const min = issue.minimum ?? "?";
      const isChars = issue.type === "string";
      return {
        userMessage: isChars
          ? `${label} must be at least ${min} characters`
          : `${label} must be at least ${min}`,
        developerMessage: issue.message,
        field,
        constraint: { type: "minLength", expected: issue.minimum, actual: issue.actual },
      };
    }

    case "too_big": {
      const max = issue.maximum ?? "?";
      const isChars = issue.type === "string";
      return {
        userMessage: isChars
          ? `${label} must be no more than ${max} characters`
          : `${label} must be no more than ${max}`,
        developerMessage: issue.message,
        field,
        constraint: { type: "maxLength", expected: issue.maximum, actual: issue.actual },
      };
    }

    case "required_key": {
      const missingLabel = issue.key !== undefined
        ? resolveLabel(String(issue.key), fieldLabels)
        : label;
      return {
        userMessage: `${missingLabel} is required`,
        developerMessage: issue.message,
        field,
        constraint: { type: "required" },
      };
    }

    case "invalid_format":
      return {
        userMessage: `${label} has an invalid format`,
        developerMessage: issue.message,
        field,
        constraint: { type: "format", expected: issue.format },
      };

    case "invalid_type":
      return {
        userMessage: `${label} has an unexpected type`,
        developerMessage: issue.message,
        field,
        constraint: { type: "type", expected: issue.expected },
      };

    case "invalid_value":
      return {
        userMessage: `${label} has an invalid value`,
        developerMessage: issue.message,
        field,
        constraint: { type: "value", expected: issue.values as string[] | undefined },
      };

    default:
      return {
        userMessage: `There's an issue with ${label.toLowerCase()}`,
        developerMessage: issue.message,
        field,
        constraint: { type: "other" },
      };
  }
}

// ---------------------------------------------------------------------------
// Message-string fallback parser
// ---------------------------------------------------------------------------
// When `error.issues` is absent (e.g. the action pre-dates this feature or
// was called directly without adapt()), we fall back to pattern-matching
// the raw error message string.

type ParsedConstraint =
  | { kind: "too_small"; field: string; min: number }
  | { kind: "too_big"; field: string; max: number }
  | { kind: "required"; field: string }
  | null;

function parseMessageFallback(message: string): ParsedConstraint {
  // "string too small (minimum 8) at $.displayName (got 6)"
  const tooSmall = message.match(
    /too small \(minimum (\d+)\) at \$\.(\w+)/
  );
  if (tooSmall) {
    return { kind: "too_small", field: tooSmall[2]!, min: parseInt(tooSmall[1]!, 10) };
  }

  // "string too big (maximum 255) at $.displayName (got 300)"
  const tooBig = message.match(
    /too big \(maximum (\d+)\) at \$\.(\w+)/
  );
  if (tooBig) {
    return { kind: "too_big", field: tooBig[2]!, max: parseInt(tooBig[1]!, 10) };
  }

  // "Missing required key \"displayName\" at $"
  const required = message.match(/Missing required key "(\w+)"/);
  if (required) {
    return { kind: "required", field: required[1]! };
  }

  return null;
}

function fallbackFormattedError(
  error: MutationError,
  fieldLabels?: FieldLabels
): FormattedError[] {
  const parsed = parseMessageFallback(error.message);
  if (parsed) {
    const label = resolveLabel(parsed.field, fieldLabels);

    switch (parsed.kind) {
      case "too_small":
        return [{
          userMessage: `${label} must be at least ${parsed.min} characters`,
          developerMessage: error.message,
          field: parsed.field,
          constraint: { type: "minLength", expected: parsed.min },
        }];
      case "too_big":
        return [{
          userMessage: `${label} must be no more than ${parsed.max} characters`,
          developerMessage: error.message,
          field: parsed.field,
          constraint: { type: "maxLength", expected: parsed.max },
        }];
      case "required":
        return [{
          userMessage: `${label} is required`,
          developerMessage: error.message,
          field: parsed.field,
          constraint: { type: "required" },
        }];
    }
  }

  // Fully generic — map known non-validation codes to sensible messages
  const genericMessage =
    error.code === "UNAUTHORIZED"
      ? "You're not authorized to perform this action."
      : error.code === "SESSION_EXPIRED"
      ? "Your session has expired. Please log in again."
      : error.code === "NOT_FOUND"
      ? "The requested item was not found."
      : error.code === "ALREADY_EXISTS"
      ? "This record already exists."
      : error.code === "FILE_CONSTRAINT"
      ? "The uploaded file doesn't meet the requirements."
      : error.code === "BLOB_UPLOAD_ERROR"
      ? "Failed to upload the file. Please try again."
      : error.code === "PDS_ERROR"
      ? "The server rejected this request. Please try again."
      : "Something went wrong. Please try again.";

  return [{
    userMessage: genericMessage,
    developerMessage: error.message,
  }];
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Formats a `MutationError` into an array of structured, human-readable
 * error descriptors — one per validation issue.
 *
 * Requires the `error` to have been thrown by `adapt()` (the client
 * mutations namespace). When `error.issues` is present, each issue is
 * individually formatted. When absent (older actions / direct calls),
 * the function falls back to pattern-matching the raw message string.
 *
 * @param error - The `MutationError` to format.
 * @param fieldLabels - Optional map of lexicon field names to display labels.
 *   Unknown fields are auto-converted from camelCase (e.g. "displayName" →
 *   "Display name").
 * @returns One `FormattedError` per validation issue, or a single generic
 *   error object for non-validation failures.
 *
 * @example
 * ```ts
 * import { MutationError, formatMutationError } from "@gainforest/atproto-mutations-next";
 *
 * catch (err) {
 *   if (MutationError.is(err)) {
 *     const errors = formatMutationError(err, { displayName: "Organization name" });
 *     // errors[0].userMessage → "Organization name must be at least 8 characters"
 *     // errors[0].developerMessage → "string too small (minimum 8) at $.displayName (got 6)"
 *     console.error("Dev:", errors.map(e => e.developerMessage));
 *   }
 * }
 * ```
 */
export function formatMutationError(
  error: MutationError,
  fieldLabels?: FieldLabels
): FormattedError[] {
  if (error.issues && error.issues.length > 0) {
    return error.issues.map((issue) => formatIssue(issue, fieldLabels));
  }
  return fallbackFormattedError(error, fieldLabels);
}

/**
 * Convenience wrapper around `formatMutationError` that returns a single
 * joined string — suitable for setting a form error state directly.
 *
 * When there are multiple issues, messages are joined with ". ".
 *
 * @example
 * ```ts
 * setSubmitError(formatMutationErrorMessage(err, { displayName: "Organization name" }));
 * // → "Organization name must be at least 8 characters"
 * ```
 */
export function formatMutationErrorMessage(
  error: MutationError,
  fieldLabels?: FieldLabels
): string {
  return formatMutationError(error, fieldLabels)
    .map((e) => e.userMessage)
    .join(". ");
}
