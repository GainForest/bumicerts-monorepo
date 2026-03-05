/**
 * A single structured validation issue extracted from a lexicon ValidationError.
 * Shape mirrors the `toJSON()` output of each `Issue` subclass in
 * @atproto/lex-schema so that consumers can pattern-match without
 * importing that package directly.
 */
export type ValidationIssue = {
  /** The issue category code */
  code:
    | "too_small"
    | "too_big"
    | "required_key"
    | "invalid_type"
    | "invalid_value"
    | "invalid_format"
    | "custom";
  /** JSONPath segments to the invalid value. e.g. ["displayName"] or ["blocks", 0] */
  path: (string | number)[];
  /** Human-readable message produced by the lex-schema Issue class */
  message: string;
  // ── Constraint-specific fields (only present for relevant issue codes) ──
  /** Minimum allowed length/value (too_small) */
  minimum?: number;
  /** Maximum allowed length/value (too_big) */
  maximum?: number;
  /** Value type that violated the constraint (too_small / too_big) */
  type?: string;
  /** Actual length/value that was received (too_small / too_big) */
  actual?: number | string;
  /** Expected type names (invalid_type) */
  expected?: string[];
  /** Allowed literal values (invalid_value) */
  values?: unknown[];
  /** Expected AT Protocol format name (invalid_format) */
  format?: string;
  /** The missing key name (required_key) */
  key?: string | number;
};

/**
 * The return type of every raw server action in @gainforest/atproto-mutations-next.
 *
 * - Raw server actions (./actions) return this — safe to use server-to-server.
 * - The client namespace (./client) wraps this via adapt(), converting the
 *   error branch into a thrown MutationError so React Query's onError fires.
 */
export type MutationResult<TData, TCode extends string> =
  | { success: true; data: TData }
  | {
      success: false;
      code: TCode;
      message: string;
      /**
       * Structured validation issues, populated when the failure is caused
       * by a lexicon ValidationError (code === "INVALID_RECORD").
       * Undefined for non-validation failures.
       */
      issues?: ValidationIssue[];
    };

// ---------------------------------------------------------------------------
// Constructors — use these inside action implementations, never build the
// object literal directly. Keeps the shape consistent and refactor-safe.
// ---------------------------------------------------------------------------

export const ok = <TData>(data: TData): MutationResult<TData, never> => ({
  success: true,
  data,
});

export const err = <TCode extends string>(
  code: TCode,
  message: string,
  issues?: ValidationIssue[]
): MutationResult<never, TCode> => ({
  success: false,
  code,
  message,
  ...(issues !== undefined && { issues }),
});
