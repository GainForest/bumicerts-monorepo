import { Effect } from "effect";
import { $parse } from "@gainforest/generated/app/gainforest/dwc/occurrence.defs";
import { AtprotoAgent } from "../../services/AtprotoAgent";
import { applyPatch, fetchRecord, putRecord } from "../../utils/shared";
import {
  DwcOccurrenceValidationError,
  DwcOccurrenceNotFoundError,
  DwcOccurrencePdsError,
} from "./utils/errors";
import type {
  DwcOccurrenceMutationResult,
  DwcOccurrenceRecord,
  UpdateDwcOccurrenceInput,
} from "./utils/types";

const COLLECTION = "app.gainforest.dwc.occurrence";
const REQUIRED_FIELDS = new Set<string>([
  "scientificName",
  "eventDate",
  "basisOfRecord",
]);

const makePdsError = (message: string, cause: unknown) =>
  new DwcOccurrencePdsError({ message, cause });

const makeValidationError = (message: string, cause: unknown) =>
  new DwcOccurrenceValidationError({ message, cause });

export const updateDwcOccurrence = (
  input: UpdateDwcOccurrenceInput
): Effect.Effect<
  DwcOccurrenceMutationResult,
  | DwcOccurrenceValidationError
  | DwcOccurrenceNotFoundError
  | DwcOccurrencePdsError,
  AtprotoAgent
> =>
  Effect.gen(function* () {
    const { rkey, data, unset } = input;

    const existing = yield* fetchRecord<
      DwcOccurrenceRecord,
      DwcOccurrencePdsError
    >(COLLECTION, rkey, makePdsError);

    if (existing === null) {
      return yield* Effect.fail(new DwcOccurrenceNotFoundError({ rkey }));
    }

    const merged = applyPatch(
      existing,
      data as Partial<DwcOccurrenceRecord>,
      unset as readonly string[] | undefined,
      REQUIRED_FIELDS
    );

    const candidate = {
      ...merged,
      $type: COLLECTION,
      createdAt: existing.createdAt,
    };

    const record = yield* Effect.try({
      try: () => $parse(candidate),
      catch: (cause) =>
        makeValidationError(
          `dwc.occurrence record failed lexicon validation: ${String(cause)}`,
          cause
        ),
    });

    const { uri, cid } = yield* putRecord(COLLECTION, rkey, record, makePdsError);

    return {
      uri,
      cid,
      rkey,
      record: record as DwcOccurrenceRecord,
    } satisfies DwcOccurrenceMutationResult;
  });

export {
  DwcOccurrenceValidationError,
  DwcOccurrenceNotFoundError,
  DwcOccurrencePdsError,
};
