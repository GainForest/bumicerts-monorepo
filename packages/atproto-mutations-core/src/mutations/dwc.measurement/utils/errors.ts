import { Data } from "effect";

export class DwcMeasurementValidationError extends Data.TaggedError(
  "DwcMeasurementValidationError"
)<{
  message: string;
  cause?: unknown;
}> {}

export class DwcMeasurementPdsError extends Data.TaggedError(
  "DwcMeasurementPdsError"
)<{
  message: string;
  cause?: unknown;
}> {}
