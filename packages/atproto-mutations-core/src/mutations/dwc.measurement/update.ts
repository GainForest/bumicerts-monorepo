import { Effect } from "effect";
import { $parse } from "@gainforest/generated/app/gainforest/dwc/measurement.defs";
import { AtprotoAgent } from "../../services/AtprotoAgent";
import { applyPatch, fetchRecord, putRecord } from "../../utils/shared";
import {
  DwcMeasurementValidationError,
  DwcMeasurementNotFoundError,
  DwcMeasurementPdsError,
} from "./utils/errors";
import type {
  DwcMeasurementMutationResult,
  DwcMeasurementRecord,
  UpdateDwcMeasurementInput,
} from "./utils/types";

const COLLECTION = "app.gainforest.dwc.measurement";
const REQUIRED_FIELDS = new Set<string>(["occurrenceRef", "result"]);
const FLORA_MEASUREMENT_TYPE =
  "app.gainforest.dwc.measurement#floraMeasurement";

const makePdsError = (message: string, cause: unknown) =>
  new DwcMeasurementPdsError({ message, cause });

const makeValidationError = (message: string, cause: unknown) =>
  new DwcMeasurementValidationError({ message, cause });

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export const updateDwcMeasurement = (
  input: UpdateDwcMeasurementInput
): Effect.Effect<
  DwcMeasurementMutationResult,
  | DwcMeasurementValidationError
  | DwcMeasurementNotFoundError
  | DwcMeasurementPdsError,
  AtprotoAgent
> =>
  Effect.gen(function* () {
    const { rkey, data, unset } = input;

    if (data.result !== undefined && data.flora !== undefined) {
      return yield* Effect.fail(
        new DwcMeasurementValidationError({
          message: "Provide either data.result or data.flora, not both",
        })
      );
    }

    const existing = yield* fetchRecord<
      DwcMeasurementRecord,
      DwcMeasurementPdsError
    >(COLLECTION, rkey, makePdsError);

    if (existing === null) {
      return yield* Effect.fail(new DwcMeasurementNotFoundError({ rkey }));
    }

    const topLevelData = {
      ...(data.occurrenceRef !== undefined
        ? { occurrenceRef: data.occurrenceRef }
        : {}),
      ...(data.occurrenceID !== undefined ? { occurrenceID: data.occurrenceID } : {}),
      ...(data.measuredBy !== undefined ? { measuredBy: data.measuredBy } : {}),
      ...(data.measuredByID !== undefined
        ? { measuredByID: data.measuredByID }
        : {}),
      ...(data.measurementDate !== undefined
        ? { measurementDate: data.measurementDate }
        : {}),
      ...(data.measurementMethod !== undefined
        ? { measurementMethod: data.measurementMethod }
        : {}),
      ...(data.measurementRemarks !== undefined
        ? { measurementRemarks: data.measurementRemarks }
        : {}),
    };

    const patched = applyPatch(
      existing,
      topLevelData as Partial<DwcMeasurementRecord>,
      unset as readonly string[] | undefined,
      REQUIRED_FIELDS
    );

    let result = existing.result;

    if (data.result !== undefined) {
      result = data.result;
    } else if (data.flora !== undefined) {
      const existingResult: Record<string, unknown> = isObject(existing.result)
        ? existing.result
        : {};
      const existingType =
        typeof existingResult["$type"] === "string"
          ? existingResult["$type"]
          : undefined;

      if (
        existingType !== undefined &&
        existingType !== FLORA_MEASUREMENT_TYPE
      ) {
        return yield* Effect.fail(
          new DwcMeasurementValidationError({
            message:
              "data.flora can only be used to update existing flora measurement records",
          })
        );
      }

      const mergedFlora = applyPatch(
        existingResult,
        data.flora as Record<string, unknown>,
        undefined,
        new Set<string>()
      );

      result = {
        ...mergedFlora,
        $type: FLORA_MEASUREMENT_TYPE,
      } as DwcMeasurementRecord["result"];
    }

    const candidate = {
      ...patched,
      $type: COLLECTION,
      createdAt: existing.createdAt,
      result,
    };

    const record = yield* Effect.try({
      try: () => $parse(candidate),
      catch: (cause) =>
        makeValidationError(
          `dwc.measurement record failed lexicon validation: ${String(cause)}`,
          cause
        ),
    });

    const { uri, cid } = yield* putRecord(COLLECTION, rkey, record, makePdsError);

    return {
      uri,
      cid,
      rkey,
      record: record as DwcMeasurementRecord,
    } satisfies DwcMeasurementMutationResult;
  });

export {
  DwcMeasurementValidationError,
  DwcMeasurementNotFoundError,
  DwcMeasurementPdsError,
};
