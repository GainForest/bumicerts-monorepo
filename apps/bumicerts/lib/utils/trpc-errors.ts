import { TRPCClientError } from "@trpc/client";
import type { AppRouter } from "@gainforest/atproto-mutations-next/trpc";

type TRPCAppError = TRPCClientError<AppRouter>;

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (error.data as any)?.effectTag;
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
 * Format a tRPC error into a user-friendly string.
 */
export function formatError(error: unknown): string {
  if (!isTRPCError(error)) {
    return error instanceof Error ? error.message : "An error occurred";
  }

  const code = error.data?.code;

  switch (code) {
    case "NOT_FOUND":
      return "The requested resource was not found";
    case "CONFLICT":
      return "This resource already exists";
    case "BAD_REQUEST":
      return error.message || "Invalid input provided";
    case "UNAUTHORIZED":
      return "Please sign in to continue";
    case "PRECONDITION_FAILED":
      return error.message || "Cannot complete this action";
    case "INTERNAL_SERVER_ERROR":
      return "Something went wrong. Please try again.";
    default:
      return error.message || "An error occurred";
  }
}
