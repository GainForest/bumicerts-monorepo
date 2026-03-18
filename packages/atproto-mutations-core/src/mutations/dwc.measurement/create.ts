import { Effect } from "effect";
import { $parse } from "@gainforest/generated/app/gainforest/dwc/measurement.defs";
import { AtprotoAgent } from "../../services/AtprotoAgent";
import { createRecord } from "../../utils/shared";
import {
  DwcMeasurementValidationError,
  DwcMeasurementPdsError,
} from "./utils/errors";
import type {
  CreateDwcMeasurementInput,
  DwcMeasurementMutationResult,
  DwcMeasurementRecord,
} from "./utils/types";

const COLLECTION = "app.gainforest.dwc.measurement";

const makePdsError = (message: string, cause: unknown) =>
  new DwcMeasurementPdsError({ message, cause });

const makeValidationError = (message: string, cause: unknown) =>
  new DwcMeasurementValidationError({ message, cause });

export const createDwcMeasurement = (
  input: CreateDwcMeasurementInput
): Effect.Effect<
  DwcMeasurementMutationResult,
  DwcMeasurementValidationError | DwcMeasurementPdsError,
  AtprotoAgent
> =>
  Effect.gen(function* () {
    const {
      occurrenceRef,
      occurrenceID,
      flora,
      measuredBy,
      measurementDate,
      measurementMethod,
      measurementRemarks,
      rkey,
    } = input;

    // Build the floraMeasurement result object, omitting undefined fields.
    const floraResult: Record<string, unknown> = {
      $type: "app.gainforest.dwc.measurement#floraMeasurement",
    };
    if (flora.dbh !== undefined) floraResult.dbh = flora.dbh;
    if (flora.totalHeight !== undefined) floraResult.totalHeight = flora.totalHeight;
    if (flora.basalDiameter !== undefined) floraResult.basalDiameter = flora.basalDiameter;
    if (flora.canopyCoverPercent !== undefined) floraResult.canopyCoverPercent = flora.canopyCoverPercent;

    // Build the candidate record.
    const candidate: Record<string, unknown> = {
      $type: COLLECTION,
      occurrenceRef,
      result: floraResult,
      createdAt: new Date().toISOString(),
    };
    if (occurrenceID !== undefined) candidate.occurrenceID = occurrenceID;
    if (measuredBy !== undefined) candidate.measuredBy = measuredBy;
    if (measurementDate !== undefined) candidate.measurementDate = measurementDate;
    if (measurementMethod !== undefined) candidate.measurementMethod = measurementMethod;
    if (measurementRemarks !== undefined) candidate.measurementRemarks = measurementRemarks;

    // Validate with lexicon $parse.
    const record = yield* Effect.try({
      try: () => $parse(candidate),
      catch: (cause) =>
        makeValidationError(
          `dwc.measurement record failed lexicon validation: ${String(cause)}`,
          cause
        ),
    });

    // Write to PDS.
    const { uri, cid } = yield* createRecord(COLLECTION, record, rkey, makePdsError);
    const assignedRkey = uri.split("/").pop() ?? rkey ?? "unknown";

    return {
      uri,
      cid,
      rkey: assignedRkey,
      record: record as DwcMeasurementRecord,
    } satisfies DwcMeasurementMutationResult;
  });

export { DwcMeasurementValidationError, DwcMeasurementPdsError };
