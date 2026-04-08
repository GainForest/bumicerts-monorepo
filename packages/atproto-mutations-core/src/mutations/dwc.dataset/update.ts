import { Effect } from "effect";
import { $parse } from "@gainforest/generated/app/gainforest/dwc/dataset.defs";
import { AtprotoAgent } from "../../services/AtprotoAgent";
import { applyPatch, fetchRecord, putRecord } from "../../utils/shared";
import {
  DwcDatasetValidationError,
  DwcDatasetNotFoundError,
  DwcDatasetPdsError,
} from "./utils/errors";
import type {
  DwcDatasetMutationResult,
  DwcDatasetRecord,
  UpdateDwcDatasetInput,
} from "./utils/types";

const COLLECTION = "app.gainforest.dwc.dataset";
const REQUIRED_FIELDS = new Set<string>(["name"]);

const makePdsError = (message: string, cause: unknown) =>
  new DwcDatasetPdsError({ message, cause });

const makeValidationError = (message: string, cause: unknown) =>
  new DwcDatasetValidationError({ message, cause });

export const updateDwcDataset = (
  input: UpdateDwcDatasetInput
): Effect.Effect<
  DwcDatasetMutationResult,
  DwcDatasetValidationError | DwcDatasetNotFoundError | DwcDatasetPdsError,
  AtprotoAgent
> =>
  Effect.gen(function* () {
    const { rkey, data, unset } = input;

    const existing = yield* fetchRecord<DwcDatasetRecord, DwcDatasetPdsError>(
      COLLECTION,
      rkey,
      makePdsError
    );

    if (existing === null) {
      return yield* Effect.fail(new DwcDatasetNotFoundError({ rkey }));
    }

    const merged = applyPatch(
      existing,
      data as Partial<DwcDatasetRecord>,
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
          `dwc.dataset record failed lexicon validation: ${String(cause)}`,
          cause
        ),
    });

    const { uri, cid } = yield* putRecord(COLLECTION, rkey, record, makePdsError);

    return {
      uri,
      cid,
      rkey,
      record: record as DwcDatasetRecord,
    } satisfies DwcDatasetMutationResult;
  });

export { DwcDatasetValidationError, DwcDatasetNotFoundError, DwcDatasetPdsError };
