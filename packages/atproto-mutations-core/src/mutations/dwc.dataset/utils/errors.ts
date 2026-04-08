import { Data } from "effect";

export class DwcDatasetValidationError extends Data.TaggedError(
  "DwcDatasetValidationError"
)<{
  message: string;
  cause?: unknown;
}> {}

export class DwcDatasetNotFoundError extends Data.TaggedError(
  "DwcDatasetNotFoundError"
)<{
  rkey: string;
}> {}

export class DwcDatasetPdsError extends Data.TaggedError(
  "DwcDatasetPdsError"
)<{
  message: string;
  cause?: unknown;
}> {}
