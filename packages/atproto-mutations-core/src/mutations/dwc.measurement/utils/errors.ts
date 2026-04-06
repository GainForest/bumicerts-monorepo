import { Data } from "effect";

export class DwcMeasurementValidationError extends Data.TaggedError(
  "DwcMeasurementValidationError"
)<{
  message: string;
  cause?: unknown;
}> {}

export class DwcMeasurementNotFoundError extends Data.TaggedError(
  "DwcMeasurementNotFoundError"
)<{
  rkey: string;
}> {}

export class DwcMeasurementPdsError extends Data.TaggedError(
  "DwcMeasurementPdsError"
)<{
  message: string;
  cause?: unknown;
}> {}
