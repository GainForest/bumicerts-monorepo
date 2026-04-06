import { Data } from "effect";

export class DwcOccurrenceValidationError extends Data.TaggedError(
  "DwcOccurrenceValidationError"
)<{
  message: string;
  cause?: unknown;
}> {}

export class DwcOccurrenceNotFoundError extends Data.TaggedError(
  "DwcOccurrenceNotFoundError"
)<{
  rkey: string;
}> {}

export class DwcOccurrencePdsError extends Data.TaggedError(
  "DwcOccurrencePdsError"
)<{
  message: string;
  cause?: unknown;
}> {}
