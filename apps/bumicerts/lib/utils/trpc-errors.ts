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

// ── Validation message parsing ────────────────────────────────────────────────

/**
 * Field name mappings for user-friendly display.
 * Maps camelCase field names to readable labels.
 */
const FIELD_LABELS: Record<string, string> = {
  displayName: "Organization name",
  shortDescription: "Short description",
  longDescription: "About section",
  website: "Website",
  startDate: "Start date",
  country: "Country",
  name: "Name",
  description: "Description",
  title: "Title",
  coordinates: "Coordinates",
  location: "Location",
  address: "Address",
  email: "Email",
  logo: "Logo",
  coverImage: "Cover image",
  image: "Image",
  audioFile: "Audio file",
  shapefile: "Shapefile",
  visibility: "Visibility",
  objectives: "Objectives",
  contributors: "Contributors",
  receivingWallet: "Receiving wallet",
  goalInUSD: "Funding goal",
  minDonationInUSD: "Minimum donation",
  maxDonationInUSD: "Maximum donation",
};

/**
 * Convert a camelCase field name to a readable label.
 * Uses FIELD_LABELS if available, otherwise adds spaces before capitals.
 */
function formatFieldName(field: string): string {
  if (FIELD_LABELS[field]) {
    return FIELD_LABELS[field];
  }
  // Convert camelCase to "Camel case"
  const withSpaces = field.replace(/([A-Z])/g, " $1").trim();
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1).toLowerCase();
}

/**
 * Parse lexicon validation error messages into user-friendly format.
 *
 * Example inputs:
 * - "ValidationError: [InvalidRequest] string too small (minimum 8) at $.displayName (got 6)"
 * - "ValidationError: [InvalidRequest] must be a valid datetime at $.startDate"
 *
 * Example outputs:
 * - "Organization name must be at least 8 characters"
 * - "Start date must be a valid date"
 */
function parseValidationMessage(message: string): string | null {
  // Extract field name from "at $.fieldName" or "at $.parent.fieldName"
  const fieldMatch = message.match(/at \$\.(?:\w+\.)*(\w+)/);
  const field = fieldMatch?.[1];
  const friendlyField = field ? formatFieldName(field) : null;

  // Pattern: string too small / too short
  if (message.includes("too small") || message.includes("too short")) {
    const minMatch = message.match(/minimum (\d+)/);
    const min = minMatch?.[1];
    if (friendlyField && min) {
      return `${friendlyField} must be at least ${min} characters`;
    }
  }

  // Pattern: string too large / too long
  if (message.includes("too large") || message.includes("too long")) {
    const maxMatch = message.match(/maximum (\d+)/);
    const max = maxMatch?.[1];
    if (friendlyField && max) {
      return `${friendlyField} must be at most ${max} characters`;
    }
  }

  // Pattern: must be a valid X
  const validMatch = message.match(/must be a valid (\w+)/i);
  if (validMatch && friendlyField) {
    const type = validMatch[1].toLowerCase();
    // Make some types more readable
    const friendlyType =
      type === "datetime" ? "date" : type === "uri" ? "URL" : type;
    return `${friendlyField} must be a valid ${friendlyType}`;
  }

  // Pattern: Invalid Datetime: Got ("...")
  const invalidDatetimeMatch = message.match(/Invalid Datetime:.*at \$\.(\w+)/i);
  if (invalidDatetimeMatch) {
    const field = invalidDatetimeMatch[1];
    const friendlyField = formatFieldName(field);
    return `${friendlyField} has an invalid date format. Please select a valid date.`;
  }

  // Pattern: required / missing
  if (
    (message.includes("required") || message.includes("missing")) &&
    friendlyField
  ) {
    return `${friendlyField} is required`;
  }

  // Pattern: must match pattern / invalid format
  if (
    (message.includes("pattern") || message.includes("invalid format")) &&
    friendlyField
  ) {
    return `${friendlyField} has an invalid format`;
  }

  // Pattern: invalid type (e.g., "Expected string, received number")
  if (message.includes("Expected") && message.includes("received") && friendlyField) {
    return `${friendlyField} has an incorrect type`;
  }

  // Pattern: out of range / invalid value
  if ((message.includes("out of range") || message.includes("invalid value")) && friendlyField) {
    return `${friendlyField} contains an invalid value`;
  }

  return null;
}

/**
 * Format a tRPC error into a user-friendly string.
 * Handles validation errors specially to provide clear field-level feedback.
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
    case "BAD_REQUEST": {
      // Try to parse validation errors into friendly messages
      const parsed = parseValidationMessage(error.message);
      if (parsed) return parsed;
      // Fallback: clean up common prefixes from validation errors
      const cleanMessage = error.message
        .replace(/^ValidationError:\s*/i, "")
        .replace(/^\[InvalidRequest\]\s*/i, "")
        .replace(/^\[InvalidRecord\]\s*/i, "")
        .trim();
      return cleanMessage || "Invalid input provided";
    }
    case "UNAUTHORIZED":
      return "Please sign in to continue";
    case "PRECONDITION_FAILED":
      return error.message || "Cannot complete this action";
    case "INTERNAL_SERVER_ERROR": {
      const causeMessage = (error.data as Record<string, unknown> | undefined)
        ?.causeMessage;
      if (causeMessage && typeof causeMessage === "string") {
        return `Something went wrong: ${causeMessage}`;
      }
      return "Something went wrong. Please try again.";
    }
    default:
      return error.message || "An error occurred";
  }
}
