import { Data } from "effect";
import type { ValidationIssue } from "../../../result";

export class ActorOrganizationValidationError extends Data.TaggedError(
  "ActorOrganizationValidationError",
)<{
  message: string;
  cause?: unknown;
  issues?: ValidationIssue[];
}> {}

export class ActorOrganizationAlreadyExistsError extends Data.TaggedError(
  "ActorOrganizationAlreadyExistsError",
)<{
  uri: string;
}> {}

export class ActorOrganizationNotFoundError extends Data.TaggedError(
  "ActorOrganizationNotFoundError",
)<{
  repo: string;
}> {}

export class ActorOrganizationPdsError extends Data.TaggedError(
  "ActorOrganizationPdsError",
)<{
  message: string;
  cause?: unknown;
}> {}
