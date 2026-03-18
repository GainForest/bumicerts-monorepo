import { Data } from "effect";

export class DwcOccurrenceValidationError extends Data.TaggedError(
  "DwcOccurrenceValidationError"
)<{
  message: string;
  cause?: unknown;
}> {}

export class DwcOccurrencePdsError extends Data.TaggedError(
  "DwcOccurrencePdsError"
)<{
  message: string;
  cause?: unknown;
}> {}
