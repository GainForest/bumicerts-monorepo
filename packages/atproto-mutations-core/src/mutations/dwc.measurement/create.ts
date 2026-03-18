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
      measurementType,
      measurementValue,
      measurementUnit,
      measurementID,
      occurrenceID,
      measurementAccuracy,
      measurementMethod,
      measurementDeterminedBy,
      measurementDeterminedDate,
      measurementRemarks,
      rkey,
    } = input;

    // Build the candidate record with required fields.
    const candidate: Record<string, unknown> = {
      $type: COLLECTION,
      occurrenceRef,
      measurementType,
      measurementValue,
      createdAt: new Date().toISOString(),
    };

    // Add optional fields only if defined.
    if (measurementUnit !== undefined) candidate.measurementUnit = measurementUnit;
    if (measurementID !== undefined) candidate.measurementID = measurementID;
    if (occurrenceID !== undefined) candidate.occurrenceID = occurrenceID;
    if (measurementAccuracy !== undefined) candidate.measurementAccuracy = measurementAccuracy;
    if (measurementMethod !== undefined) candidate.measurementMethod = measurementMethod;
    if (measurementDeterminedBy !== undefined) candidate.measurementDeterminedBy = measurementDeterminedBy;
    if (measurementDeterminedDate !== undefined) candidate.measurementDeterminedDate = measurementDeterminedDate;
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
