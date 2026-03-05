import type { ValidationIssue } from "./result";

/**
 * MutationError — thrown by adapt() when a server action returns a failure
 * result. Carries the typed error code so consumers can pattern-match in
 * React Query's onError without instanceof-checking a generic Error.
 *
 * Deliberately serializable: code and message are plain strings, making it
 * safe to log, display in UI, or forward to error tracking.
 *
 * When the failure is caused by a lexicon validation error
 * (code === "INVALID_RECORD"), `issues` is populated with structured
 * per-field details extracted from @atproto/lex-schema's ValidationError.
 * Pass these to `formatMutationError()` to produce user-friendly messages.
 */
export class MutationError<TCode extends string = string> extends Error {
  readonly code: TCode;
  /**
   * Structured validation issues. Present when the failure originated from
   * a lexicon validation error (e.g. code === "INVALID_RECORD").
   * Undefined for auth, network, and PDS errors.
   */
  readonly issues?: ValidationIssue[];

  constructor(code: TCode, message: string, issues?: ValidationIssue[]) {
    super(message);
    this.name = "MutationError";
    this.code = code;
    if (issues !== undefined) this.issues = issues;

    // Maintain proper prototype chain in environments that transpile classes.
    Object.setPrototypeOf(this, new.target.prototype);
  }

  /**
   * Type guard — narrows an unknown catch value to MutationError.
   * Useful in onError callbacks where the type is unknown.
   *
   * @example
   * onError: (e) => {
   *   if (MutationError.is(e)) {
   *     console.log(e.code); // typed as string
   *   }
   * }
   */
  static is(value: unknown): value is MutationError {
    return value instanceof MutationError;
  }

  /**
   * Narrowed type guard — checks both instanceof and a specific code value.
   *
   * @example
   * if (MutationError.isCode(e, "UNAUTHORIZED")) {
   *   redirectToLogin();
   * }
   */
  static isCode<TCode extends string>(
    value: unknown,
    code: TCode
  ): value is MutationError<TCode> {
    return MutationError.is(value) && value.code === code;
  }
}
