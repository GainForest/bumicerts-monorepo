import { Data } from "effect";

export class AcMultimediaValidationError extends Data.TaggedError(
  "AcMultimediaValidationError"
)<{
  message: string;
  cause?: unknown;
}> {}

export class AcMultimediaPdsError extends Data.TaggedError(
  "AcMultimediaPdsError"
)<{
  message: string;
  cause?: unknown;
}> {}
