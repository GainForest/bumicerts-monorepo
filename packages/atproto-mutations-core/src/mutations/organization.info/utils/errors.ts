import { Data } from "effect";

/**
 * Input failed validation against the app.gainforest.organization.info lexicon.
 * Raised by all three operations (create, update, upsert) before any PDS call.
 */
export class OrganizationInfoValidationError extends Data.TaggedError(
  "OrganizationInfoValidationError"
)<{
  message: string;
  cause?: unknown;
}> {}

/**
 * A create was attempted but a record already exists in the repo.
 * organization.info uses key=literal:self — only one record per repo.
 * Use upsertOrganizationInfo if you want create-or-update semantics.
 */
export class OrganizationInfoAlreadyExistsError extends Data.TaggedError(
  "OrganizationInfoAlreadyExistsError"
)<{
  /** AT-URI of the existing record */
  uri: string;
}> {}

/**
 * An update or upsert was attempted but no record exists in the repo,
 * and the operation requires one (i.e. plain update, not upsert).
 */
export class OrganizationInfoNotFoundError extends Data.TaggedError(
  "OrganizationInfoNotFoundError"
)<{
  /** DID or handle of the repo that was checked */
  repo: string;
}> {}

/**
 * The PDS rejected or failed to process the record operation.
 * Wraps the raw error from agent.com.atproto.repo.* calls.
 */
export class OrganizationInfoPdsError extends Data.TaggedError(
  "OrganizationInfoPdsError"
)<{
  message: string;
  cause?: unknown;
}> {}
