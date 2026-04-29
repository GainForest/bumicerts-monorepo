import { Data } from "effect";
import type { ValidationIssue } from "../../../result";

export class DwcDatasetValidationError extends Data.TaggedError(
  "DwcDatasetValidationError"
)<{
  message: string;
  cause?: unknown;
  issues?: ValidationIssue[];
}> {}

export class DwcDatasetNotFoundError extends Data.TaggedError(
  "DwcDatasetNotFoundError"
)<{
  rkey: string;
}> {}

export class DwcDatasetUnavailableError extends Data.TaggedError(
  "DwcDatasetUnavailableError"
)<{
  message: string;
  cause?: unknown;
}> {}

export class DwcDatasetPdsError extends Data.TaggedError(
  "DwcDatasetPdsError"
)<{
  message: string;
  cause?: unknown;
}> {}
