import { Data } from "effect";
import type { ValidationIssue } from "../../../result";

export class ActorProfileValidationError extends Data.TaggedError(
  "ActorProfileValidationError",
)<{
  message: string;
  cause?: unknown;
  issues?: ValidationIssue[];
}> {}

export class ActorProfileAlreadyExistsError extends Data.TaggedError(
  "ActorProfileAlreadyExistsError",
)<{
  uri: string;
}> {}

export class ActorProfileNotFoundError extends Data.TaggedError(
  "ActorProfileNotFoundError",
)<{
  repo: string;
}> {}

export class ActorProfilePdsError extends Data.TaggedError(
  "ActorProfilePdsError",
)<{
  message: string;
  cause?: unknown;
}> {}
