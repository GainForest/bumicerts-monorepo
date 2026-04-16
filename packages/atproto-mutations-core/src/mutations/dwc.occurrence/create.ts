import { Effect } from "effect";
import { extractValidationIssues } from "../../validation";
import type { ValidationIssue } from "../../result";
import { $parse } from "@gainforest/generated/app/gainforest/dwc/occurrence.defs";
import { AtprotoAgent } from "../../services/AtprotoAgent";
import { createRecord } from "../../utils/shared";
import {
  DwcOccurrenceValidationError,
  DwcOccurrencePdsError,
} from "./utils/errors";
import type {
  CreateDwcOccurrenceInput,
  DwcOccurrenceMutationResult,
  DwcOccurrenceRecord,
} from "./utils/types";

const COLLECTION = "app.gainforest.dwc.occurrence";

const makePdsError = (message: string, cause: unknown) =>
  new DwcOccurrencePdsError({ message, cause });

const makeValidationError = (message: string, cause: unknown, issues?: ValidationIssue[]) =>
  new DwcOccurrenceValidationError({ message, cause, issues });

export const createDwcOccurrence = (
  input: CreateDwcOccurrenceInput
): Effect.Effect<
  DwcOccurrenceMutationResult,
  DwcOccurrenceValidationError | DwcOccurrencePdsError,
  AtprotoAgent
> =>
  Effect.gen(function* () {
    const {
      scientificName,
      eventDate,
      decimalLatitude,
      decimalLongitude,
      basisOfRecord = "HumanObservation",
      vernacularName,
      recordedBy,
      locality,
      country,
      countryCode,
      occurrenceRemarks,
      habitat,
      samplingProtocol,
      kingdom = "Plantae",
      occurrenceID = crypto.randomUUID(),
      occurrenceStatus = "present",
      geodeticDatum = "EPSG:4326",
      license = "CC-BY-4.0",
      projectRef,
      establishmentMeans,
      datasetRef,
      dynamicProperties,
      rkey,
    } = input;

    // 1. Build candidate record with $type, createdAt, and defaults applied.
    const createdAt = new Date().toISOString();
    const candidate = {
      $type: COLLECTION,
      scientificName,
      eventDate,
      decimalLatitude,
      decimalLongitude,
      basisOfRecord: basisOfRecord as DwcOccurrenceRecord["basisOfRecord"],
      occurrenceID,
      occurrenceStatus: occurrenceStatus as DwcOccurrenceRecord["occurrenceStatus"],
      geodeticDatum,
      license,
      kingdom,
      ...(vernacularName !== undefined ? { vernacularName } : {}),
      ...(recordedBy !== undefined ? { recordedBy } : {}),
      ...(locality !== undefined ? { locality } : {}),
      ...(country !== undefined ? { country } : {}),
      ...(countryCode !== undefined ? { countryCode } : {}),
      ...(occurrenceRemarks !== undefined ? { occurrenceRemarks } : {}),
      ...(habitat !== undefined ? { habitat } : {}),
      ...(samplingProtocol !== undefined ? { samplingProtocol } : {}),
      ...(projectRef !== undefined ? { projectRef } : {}),
      ...(establishmentMeans !== undefined ? { establishmentMeans } : {}),
      ...(datasetRef !== undefined ? { datasetRef } : {}),
      ...(dynamicProperties !== undefined ? { dynamicProperties } : {}),
      createdAt,
    };

    // 2. Validate with $parse from generated types.
    const record = yield* Effect.try({
      try: () => $parse(candidate),
      catch: (cause) => { const issues = extractValidationIssues(cause); return makeValidationError("Validation failed", cause, issues); },
    });

    // 3. Write to PDS (rkey optional — PDS assigns TID when omitted).
    const { uri, cid } = yield* createRecord(COLLECTION, record, rkey, makePdsError);
    const assignedRkey = uri.split("/").pop() ?? rkey ?? "unknown";

    return {
      uri,
      cid,
      rkey: assignedRkey,
      record: record as DwcOccurrenceRecord,
    } satisfies DwcOccurrenceMutationResult;
  });

export { DwcOccurrenceValidationError, DwcOccurrencePdsError };
