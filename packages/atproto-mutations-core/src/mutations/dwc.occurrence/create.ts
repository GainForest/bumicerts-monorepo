import { Effect } from "effect";
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

const makeValidationError = (message: string, cause: unknown) =>
  new DwcOccurrenceValidationError({ message, cause });

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
      createdAt,
    };

    // 2. Validate with $parse from generated types.
    const record = yield* Effect.try({
      try: () => $parse(candidate),
      catch: (cause) =>
        makeValidationError(
          `dwc.occurrence record failed lexicon validation: ${String(cause)}`,
          cause
        ),
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
