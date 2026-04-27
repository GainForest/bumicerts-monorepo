import { TRPCClientError } from "@trpc/client";
import type { AppRouter } from "@gainforest/atproto-mutations-next/trpc";
import {
  formatValidationIssues,
  FIELD_LABELS,
  type ValidationIssue,
  type FormattedError,
} from "@gainforest/atproto-mutations-core";

type TRPCAppError = TRPCClientError<AppRouter>;

const BUMICERT_PAYLOAD_LIMIT_MESSAGE =
  "Your request payload is too large. Please use a cover image that is 4MB or smaller (JPG, PNG, or WebP).";

function isNonJsonRequestEntityError(message: string): boolean {
  const normalized = message.toLowerCase();

  return (
    normalized.includes("unexpected token") &&
    normalized.includes("not valid json") &&
    (normalized.includes("request en") || normalized.includes("entity too large"))
  );
}

/**
 * Type guard for tRPC client errors.
 */
export function isTRPCError(error: unknown): error is TRPCAppError {
  return error instanceof TRPCClientError;
}

/**
 * Get the tRPC error code (e.g. "NOT_FOUND", "BAD_REQUEST").
 */
export function getErrorCode(error: unknown): string | undefined {
  if (isTRPCError(error)) {
    return error.data?.code;
  }
  return undefined;
}

/**
 * Get the original Effect error tag if available (for debugging).
 */
export function getEffectTag(error: unknown): string | undefined {
  if (isTRPCError(error)) {
    return error.data?.effectTag;
  }
  return undefined;
}

/**
 * Check if error matches a specific tRPC code.
 */
export function isErrorCode(error: unknown, code: string): boolean {
  return getErrorCode(error) === code;
}

/**
 * Get formatted errors with field-level details.
 * Returns array of FormattedError objects for displaying per-field errors.
 *
 * @param error - Unknown error from tRPC mutation
 * @param fieldLabels - Optional custom field labels to merge with defaults
 * @returns Array of formatted error objects with userMessage and field info
 *
 * @example
 * ```tsx
 * const mutation = trpc.organization.info.update.useMutation({
 *   onError: (err) => {
 *     const formatted = getFormattedErrors(err);
 *     setError(formatted[0]?.userMessage); // "Organization name must be at least 8 characters"
 *
 *     // Optional: set field-specific errors
 *     const fieldErrs: Record<string, string> = {};
 *     formatted.forEach(f => {
 *       if (f.field) fieldErrs[f.field] = f.userMessage;
 *     });
 *     setFieldErrors(fieldErrs);
 *   }
 * });
 * ```
 */
export function getFormattedErrors(
  error: unknown,
  fieldLabels?: Record<string, string>
): FormattedError[] {
  if (!isTRPCError(error)) {
    return [
      {
        userMessage: error instanceof Error ? error.message : "An error occurred",
        developerMessage: String(error),
      },
    ];
  }

  const issues = (error.data as Record<string, unknown> | undefined)
    ?.issues as ValidationIssue[] | undefined;

  if (issues && issues.length > 0) {
    return formatValidationIssues(issues, { ...FIELD_LABELS, ...fieldLabels });
  }

  // Fallback to single error
  return [
    {
      userMessage: formatError(error),
      developerMessage: error.message,
    },
  ];
}

/**
 * Format a tRPC error into a user-friendly string.
 * Handles validation errors specially to provide clear field-level feedback.
 *
 * The userMessage from the server is already formatted by the error mapper
 * with field-specific details for validation errors. This function just
 * extracts it.
 */
export function formatError(error: unknown): string {
  if (!isTRPCError(error)) {
    if (error instanceof Error && isNonJsonRequestEntityError(error.message)) {
      return BUMICERT_PAYLOAD_LIMIT_MESSAGE;
    }
    if (error instanceof Error && error.message.trim()) return error.message;
    if (typeof error === "string" && error.trim()) return error;
    return "An error occurred";
  }

  if (isNonJsonRequestEntityError(error.message)) {
    return BUMICERT_PAYLOAD_LIMIT_MESSAGE;
  }

  const userMessage = (error.data as Record<string, unknown> | undefined)?.userMessage;
  if (typeof userMessage === "string" && userMessage.trim()) {
    return userMessage;
  }

  const code = error.data?.code;

  switch (code) {
    case "NOT_FOUND":
      return "The requested resource was not found";
    case "CONFLICT":
      return "This resource already exists";
    case "BAD_REQUEST":
      return error.message ?? "Invalid input provided";
    case "UNAUTHORIZED":
      return "Please sign in to continue";
    case "PRECONDITION_FAILED":
      return error.message ?? "Cannot complete this action";
    case "INTERNAL_SERVER_ERROR":
      return "Something went wrong. Please try again.";

    default:
      return error.message ?? "An error occurred";
  }
}
