import { TRPCError } from "@trpc/server";

/**
 * Maps Effect tagged errors to TRPCError.
 * Preserves original error in cause for debugging.
 */
export function mapEffectErrorToTRPC(error: unknown): TRPCError {
  if (error && typeof error === "object" && "_tag" in error) {
    const tag = (error as { _tag: string })._tag;
    const message = "message" in error ? String((error as { message: unknown }).message) : tag;

    // Not found errors
    if (tag.includes("NotFound")) {
      return new TRPCError({ code: "NOT_FOUND", message, cause: error });
    }

    // Validation errors
    if (tag.includes("Validation") || tag.includes("Invalid") || tag.includes("Constraint")) {
      return new TRPCError({ code: "BAD_REQUEST", message, cause: error });
    }

    // Already exists
    if (tag.includes("AlreadyExists")) {
      return new TRPCError({ code: "CONFLICT", message, cause: error });
    }

    // Auth errors
    if (tag.includes("Unauthorized") || tag.includes("SessionExpired")) {
      return new TRPCError({ code: "UNAUTHORIZED", message, cause: error });
    }

    // Is default (can't delete)
    if (tag.includes("IsDefault")) {
      return new TRPCError({ code: "PRECONDITION_FAILED", message, cause: error });
    }

    // PDS errors
    if (tag.includes("PdsError") || tag.includes("BlobUpload")) {
      return new TRPCError({ code: "INTERNAL_SERVER_ERROR", message, cause: error });
    }

    // GeoJSON errors
    if (tag.includes("GeoJson")) {
      return new TRPCError({ code: "BAD_REQUEST", message, cause: error });
    }
  }

  // Fallback for unknown errors
  const message = error instanceof Error ? error.message : String(error);
  return new TRPCError({ code: "INTERNAL_SERVER_ERROR", message, cause: error });
}
