import { TRPCError } from "@trpc/server";
import { Cause } from "effect";
import {
  formatValidationIssuesMessage,
  FIELD_LABELS,
  type ValidationIssue,
} from "@gainforest/atproto-mutations-core";

// Symbol used by Effect to store the Cause in FiberFailure
const FiberFailureCauseSymbol = Symbol.for("effect/Runtime/FiberFailure/Cause");

/**
 * Extracts the actual error from an Effect FiberFailure.
 * Effect wraps errors in FiberFailure when runPromise rejects.
 * The actual tagged error is buried inside: FiberFailure[Symbol] -> Cause -> failure
 */
function extractEffectError(error: unknown): unknown {
  if (error && typeof error === "object" && FiberFailureCauseSymbol in error) {
    const cause = (error as Record<symbol, unknown>)[FiberFailureCauseSymbol];
    if (cause && Cause.isCause(cause)) {
      // Cause.squash extracts the primary failure from the Cause
      return Cause.squash(cause);
    }
  }
  return error;
}

function toUserMessage(tag: string, message: string, issues?: ValidationIssue[]): string {
  if (tag.includes("Validation") || tag.includes("Invalid") || tag.includes("Constraint")) {
    // If we have structured issues, format them into a specific message
    if (issues && issues.length > 0) {
      return formatValidationIssuesMessage(issues, FIELD_LABELS);
    }
    return "Some fields are invalid. Please review and try again.";
  }
  if (tag.includes("NotFound")) {
    return "The requested resource could not be found.";
  }
  if (tag.includes("AlreadyExists")) {
    return "This resource already exists.";
  }
  if (tag.includes("Unauthorized") || tag.includes("SessionExpired")) {
    return "Your session has expired. Please sign in again.";
  }
  if (tag.includes("Unavailable")) {
    return message || "This action cannot be completed right now.";
  }
  if (tag.includes("IsDefault")) {
    return "This action cannot be completed right now.";
  }
  if (tag.includes("PdsError") || tag.includes("BlobUpload")) {
    return "A server error occurred while saving your changes. Please try again.";
  }
  if (tag.includes("GeoJson")) {
    return "The uploaded file has invalid geographic data.";
  }

  return message || "Something went wrong. Please try again.";
}

/**
 * Maps Effect tagged errors to TRPCError.
 * Preserves original error in cause for debugging.
 * Extracts structured validation issues for field-specific error messages.
 */
export function mapEffectErrorToTRPC(error: unknown): TRPCError {
  // Extract the actual error from Effect's FiberFailure wrapper
  const actualError = extractEffectError(error);

  if (actualError && typeof actualError === "object" && "_tag" in actualError) {
    const tag = (actualError as { _tag: string })._tag;
    const message =
      "message" in actualError ? String((actualError as { message: unknown }).message) : tag;
    const issues =
      "issues" in actualError
        ? ((actualError as { issues?: ValidationIssue[] }).issues)
        : undefined;
    const userMessage = toUserMessage(tag, message, issues);

    // Not found errors
    if (tag.includes("NotFound")) {
      return new TRPCError({ code: "NOT_FOUND", message: userMessage, cause: actualError });
    }

    // Validation errors
    if (tag.includes("Validation") || tag.includes("Invalid") || tag.includes("Constraint")) {
      return new TRPCError({ code: "BAD_REQUEST", message: userMessage, cause: actualError });
    }

    // Already exists
    if (tag.includes("AlreadyExists")) {
      return new TRPCError({ code: "CONFLICT", message: userMessage, cause: actualError });
    }

    // Auth errors
    if (tag.includes("Unauthorized") || tag.includes("SessionExpired")) {
      return new TRPCError({ code: "UNAUTHORIZED", message: userMessage, cause: actualError });
    }

    // Resource unavailable / no longer valid
    if (tag.includes("Unavailable")) {
      return new TRPCError({ code: "PRECONDITION_FAILED", message: userMessage, cause: actualError });
    }

    // Is default (can't delete)
    if (tag.includes("IsDefault")) {
      return new TRPCError({ code: "PRECONDITION_FAILED", message: userMessage, cause: actualError });
    }

    // PDS errors
    if (tag.includes("PdsError") || tag.includes("BlobUpload")) {
      return new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: userMessage, cause: actualError });
    }

    // GeoJSON errors
    if (tag.includes("GeoJson")) {
      return new TRPCError({ code: "BAD_REQUEST", message: userMessage, cause: actualError });
    }
  }

  // Fallback for unknown errors
  const fallbackMessage = actualError instanceof Error ? actualError.message : String(actualError);
  return new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: fallbackMessage, cause: actualError });
}
