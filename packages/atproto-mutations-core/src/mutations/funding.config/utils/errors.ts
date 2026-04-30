import { Data } from "effect";
import type { ValidationIssue } from "../../../result";

/**
 * Input failed validation against the app.gainforest.funding.config lexicon.
 * Raised by all operations (create, update, upsert) before any PDS call.
 */
export class FundingConfigValidationError extends Data.TaggedError(
  "FundingConfigValidationError"
)<{
  message: string;
  cause?: unknown;
  issues?: ValidationIssue[];
}> {}

/**
 * An update, upsert (with rkey), or delete was attempted but no record with
 * that rkey exists in the repo.
 */
export class FundingConfigNotFoundError extends Data.TaggedError(
  "FundingConfigNotFoundError"
)<{
  /** The rkey that was looked up */
  rkey: string;
}> {}

/**
 * The PDS rejected or failed to process the record operation.
 * Wraps the raw error from agent.com.atproto.repo.* calls.
 */
export class FundingConfigPdsError extends Data.TaggedError(
  "FundingConfigPdsError"
)<{
  message: string;
  cause?: unknown;
}> {}
