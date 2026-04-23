import { ComAtprotoRepoPutRecord, type Agent } from "@atproto/api";
import { Effect } from "effect";
import { $parse as parseDatasetRecord } from "@gainforest/generated/app/gainforest/dwc/dataset.defs";
import { $parse as parseMeasurementRecord } from "@gainforest/generated/app/gainforest/dwc/measurement.defs";
import { $parse as parseOccurrenceRecord } from "@gainforest/generated/app/gainforest/dwc/occurrence.defs";
import { AtprotoAgent } from "../../services/AtprotoAgent";
import { extractValidationIssues } from "../../validation";
import type {
  AppendExistingDwcDatasetInput,
  AppendExistingDwcDatasetResult,
  AppendExistingDwcDatasetRowInput,
  AppendExistingDwcDatasetRowResult,
  DwcDatasetRecord,
} from "./utils/types";
import {
  APPEND_EXISTING_DWC_DATASET_MAX_ROWS,
} from "./utils/types";
import {
  DwcDatasetPdsError,
  DwcDatasetUnavailableError,
  DwcDatasetValidationError,
} from "./utils/errors";

const DATASET_COLLECTION = "app.gainforest.dwc.dataset";
const OCCURRENCE_COLLECTION = "app.gainforest.dwc.occurrence";
const MEASUREMENT_COLLECTION = "app.gainforest.dwc.measurement";
const LIST_RECORDS_PAGE_LIMIT = 100;
const MAX_DATASET_COUNT_ATTEMPTS = 5;
const BASE_RETRY_DELAY_MS = 50;
const DATASET_UNAVAILABLE_MESSAGE =
  "The selected dataset is no longer available. Choose another dataset and try again.";
const DATASET_DISAPPEARED_DURING_UPLOAD_MESSAGE =
  "The selected dataset disappeared during upload. Remaining rows were not added.";

type CreatedRecord = {
  uri: string;
  cid: string;
  rkey: string;
};

type PersistedOccurrence = {
  index: number;
  occurrenceUri: string;
  occurrenceRkey: string;
};

type DatasetRecordResponse = {
  uri: string;
  cid: string;
  record: DwcDatasetRecord;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isOptionalString(value: unknown): value is string | undefined {
  return typeof value === "string" || typeof value === "undefined";
}

function isAppendExistingDwcDatasetOccurrenceInput(
  value: unknown,
): value is AppendExistingDwcDatasetRowInput["occurrence"] {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.scientificName === "string" &&
    typeof value.eventDate === "string" &&
    typeof value.decimalLatitude === "string" &&
    typeof value.decimalLongitude === "string" &&
    isOptionalString(value.basisOfRecord) &&
    isOptionalString(value.vernacularName) &&
    isOptionalString(value.recordedBy) &&
    isOptionalString(value.locality) &&
    isOptionalString(value.country) &&
    isOptionalString(value.countryCode) &&
    isOptionalString(value.occurrenceRemarks) &&
    isOptionalString(value.habitat) &&
    isOptionalString(value.samplingProtocol) &&
    isOptionalString(value.kingdom) &&
    isOptionalString(value.occurrenceID) &&
    isOptionalString(value.occurrenceStatus) &&
    isOptionalString(value.geodeticDatum) &&
    isOptionalString(value.license) &&
    isOptionalString(value.projectRef) &&
    isOptionalString(value.establishmentMeans)
  );
}

function isAppendExistingDwcDatasetFloraMeasurementInput(
  value: unknown,
): value is NonNullable<AppendExistingDwcDatasetRowInput["floraMeasurement"]> {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isOptionalString(value.dbh) &&
    isOptionalString(value.totalHeight) &&
    isOptionalString(value.diameter) &&
    isOptionalString(value.canopyCoverPercent)
  );
}

function isAppendExistingDwcDatasetRowInput(
  value: unknown,
): value is AppendExistingDwcDatasetRowInput {
  return (
    isRecord(value) &&
    isAppendExistingDwcDatasetOccurrenceInput(value.occurrence) &&
    (value.floraMeasurement === null ||
      isAppendExistingDwcDatasetFloraMeasurementInput(value.floraMeasurement))
  );
}

function isAppendExistingDwcDatasetInput(
  value: unknown,
): value is AppendExistingDwcDatasetInput {
  return (
    isRecord(value) &&
    typeof value.datasetRkey === "string" &&
    Array.isArray(value.rows) &&
    value.rows.every(isAppendExistingDwcDatasetRowInput) &&
    (typeof value.establishmentMeans === "string" ||
      value.establishmentMeans === null ||
      typeof value.establishmentMeans === "undefined")
  );
}

function makeValidationError(
  message: string,
  cause?: unknown,
): DwcDatasetValidationError {
  return new DwcDatasetValidationError({
    message,
    cause,
    ...(cause !== undefined
      ? { issues: extractValidationIssues(cause) }
      : {}),
  });
}

function makePdsError(message: string, cause?: unknown): DwcDatasetPdsError {
  return new DwcDatasetPdsError({ message, ...(cause !== undefined ? { cause } : {}) });
}

function makeUnavailableError(
  message: string,
  cause?: unknown,
): DwcDatasetUnavailableError {
  return new DwcDatasetUnavailableError({
    message,
    ...(cause !== undefined ? { cause } : {}),
  });
}

function isKnownAppendExistingDatasetError(
  error: unknown,
): error is
  | DwcDatasetValidationError
  | DwcDatasetUnavailableError
  | DwcDatasetPdsError {
  return (
    isRecord(error) &&
    (error._tag === "DwcDatasetValidationError" ||
      error._tag === "DwcDatasetUnavailableError" ||
      error._tag === "DwcDatasetPdsError")
  );
}

function isTaggedDatasetUnavailableError(
  error: unknown,
): error is DwcDatasetUnavailableError {
  return isRecord(error) && error._tag === "DwcDatasetUnavailableError";
}

function buildTreeDynamicProperties(datasetRef?: string): string {
  return JSON.stringify({
    dataType: "measuredTree",
    source: "bumicerts",
    ...(datasetRef ? { datasetRef } : {}),
  });
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (isRecord(error) && typeof error.message === "string" && error.message.trim()) {
    return error.message;
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}

function isDatasetUnavailableError(error: unknown): boolean {
  if (isRecord(error) && error.status === 404) {
    return true;
  }

  if (
    isRecord(error) &&
    isRecord(error.cause) &&
    error.cause.status === 404
  ) {
    return true;
  }

  return false;
}

function buildRetryDelayMs(attempt: number): number {
  const jitter = Math.floor(Math.random() * BASE_RETRY_DELAY_MS);
  return BASE_RETRY_DELAY_MS * 2 ** attempt + jitter;
}

async function delay(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function validateAppendExistingInput(
  input: AppendExistingDwcDatasetInput,
): AppendExistingDwcDatasetInput {
  if (!isAppendExistingDwcDatasetInput(input)) {
    throw makeValidationError(
      "datasetRkey, rows, and establishmentMeans are required.",
    );
  }

  if (input.rows.length === 0) {
    throw makeValidationError("At least one row is required.");
  }

  if (input.rows.length > APPEND_EXISTING_DWC_DATASET_MAX_ROWS) {
    throw makeValidationError(
      `Append requests are limited to ${APPEND_EXISTING_DWC_DATASET_MAX_ROWS} rows per call.`,
    );
  }

  return input;
}

async function resolveDatasetRecord(
  agent: Agent,
  datasetRkey: string,
): Promise<DatasetRecordResponse> {
  try {
    const response = await agent.com.atproto.repo.getRecord({
      repo: agent.assertDid,
      collection: DATASET_COLLECTION,
      rkey: datasetRkey,
    });

    if (!response.data.cid) {
      throw makePdsError(`Dataset "${datasetRkey}" is missing a CID.`);
    }

    try {
      return {
        uri: response.data.uri,
        cid: response.data.cid,
        record: parseDatasetRecord(response.data.value),
      };
    } catch (cause) {
      throw makeValidationError("Dataset data is invalid.", cause);
    }
  } catch (error) {
    if (isKnownAppendExistingDatasetError(error)) {
      throw error;
    }

    if (isDatasetUnavailableError(error)) {
      throw makeUnavailableError(DATASET_UNAVAILABLE_MESSAGE, error);
    }

    throw makePdsError(`Failed to load dataset "${datasetRkey}".`, error);
  }
}

async function createOccurrenceRecord(options: {
  agent: Agent;
  occurrenceInput: AppendExistingDwcDatasetRowInput["occurrence"] & {
    datasetRef: string;
    dynamicProperties: string;
  };
}): Promise<CreatedRecord> {
  const { agent, occurrenceInput } = options;
  const createdAt = new Date().toISOString();
  const candidate = {
    $type: OCCURRENCE_COLLECTION,
    scientificName: occurrenceInput.scientificName,
    eventDate: occurrenceInput.eventDate,
    decimalLatitude: occurrenceInput.decimalLatitude,
    decimalLongitude: occurrenceInput.decimalLongitude,
    basisOfRecord: occurrenceInput.basisOfRecord ?? "HumanObservation",
    occurrenceID: occurrenceInput.occurrenceID ?? crypto.randomUUID(),
    occurrenceStatus: occurrenceInput.occurrenceStatus ?? "present",
    geodeticDatum: occurrenceInput.geodeticDatum ?? "EPSG:4326",
    license: occurrenceInput.license ?? "CC-BY-4.0",
    kingdom: occurrenceInput.kingdom ?? "Plantae",
    ...(occurrenceInput.vernacularName
      ? { vernacularName: occurrenceInput.vernacularName }
      : {}),
    ...(occurrenceInput.recordedBy
      ? { recordedBy: occurrenceInput.recordedBy }
      : {}),
    ...(occurrenceInput.locality ? { locality: occurrenceInput.locality } : {}),
    ...(occurrenceInput.country ? { country: occurrenceInput.country } : {}),
    ...(occurrenceInput.countryCode
      ? { countryCode: occurrenceInput.countryCode }
      : {}),
    ...(occurrenceInput.occurrenceRemarks
      ? { occurrenceRemarks: occurrenceInput.occurrenceRemarks }
      : {}),
    ...(occurrenceInput.habitat ? { habitat: occurrenceInput.habitat } : {}),
    ...(occurrenceInput.samplingProtocol
      ? { samplingProtocol: occurrenceInput.samplingProtocol }
      : {}),
    ...(occurrenceInput.projectRef
      ? { projectRef: occurrenceInput.projectRef }
      : {}),
    ...(occurrenceInput.establishmentMeans
      ? { establishmentMeans: occurrenceInput.establishmentMeans }
      : {}),
    datasetRef: occurrenceInput.datasetRef,
    dynamicProperties: occurrenceInput.dynamicProperties,
    createdAt,
  };

  let record;
  try {
    record = parseOccurrenceRecord(candidate);
  } catch (cause) {
    throw makeValidationError("Occurrence data is invalid.", cause);
  }

  try {
    const response = await agent.com.atproto.repo.createRecord({
      repo: agent.assertDid,
      collection: OCCURRENCE_COLLECTION,
      record,
    });

    return {
      uri: response.data.uri,
      cid: response.data.cid,
      rkey: response.data.uri.split("/").pop() ?? "unknown",
    };
  } catch (error) {
    throw makePdsError("Failed to create occurrence record.", error);
  }
}

async function createMeasurementRecord(options: {
  agent: Agent;
  occurrenceUri: string;
  floraMeasurement: NonNullable<AppendExistingDwcDatasetRowInput["floraMeasurement"]>;
}): Promise<CreatedRecord> {
  const { agent, occurrenceUri, floraMeasurement } = options;
  const candidate = {
    $type: MEASUREMENT_COLLECTION,
    occurrenceRef: occurrenceUri,
    result: {
      $type: "app.gainforest.dwc.measurement#floraMeasurement",
      ...(floraMeasurement.dbh ? { dbh: floraMeasurement.dbh } : {}),
      ...(floraMeasurement.totalHeight
        ? { totalHeight: floraMeasurement.totalHeight }
        : {}),
      ...(floraMeasurement.diameter
        ? { basalDiameter: floraMeasurement.diameter }
        : {}),
      ...(floraMeasurement.canopyCoverPercent
        ? { canopyCoverPercent: floraMeasurement.canopyCoverPercent }
        : {}),
    },
    createdAt: new Date().toISOString(),
  };

  let record;
  try {
    record = parseMeasurementRecord(candidate);
  } catch (cause) {
    throw makeValidationError("Measurement data is invalid.", cause);
  }

  try {
    const response = await agent.com.atproto.repo.createRecord({
      repo: agent.assertDid,
      collection: MEASUREMENT_COLLECTION,
      record,
    });

    return {
      uri: response.data.uri,
      cid: response.data.cid,
      rkey: response.data.uri.split("/").pop() ?? "unknown",
    };
  } catch (error) {
    throw makePdsError("Failed to create measurement record.", error);
  }
}

async function deleteRecord(options: {
  agent: Agent;
  collection: string;
  rkey: string;
}): Promise<void> {
  const { agent, collection, rkey } = options;

  try {
    await agent.com.atproto.repo.deleteRecord({
      repo: agent.assertDid,
      collection,
      rkey,
    });
  } catch (error) {
    throw makePdsError(`Failed to delete ${collection} record "${rkey}".`, error);
  }
}

function getOccurrenceDatasetRef(value: unknown): string | null {
  if (!isRecord(value)) {
    return null;
  }

  return typeof value.datasetRef === "string" ? value.datasetRef : null;
}

async function countDatasetOccurrences(options: {
  agent: Agent;
  datasetUri: string;
}): Promise<number> {
  const { agent, datasetUri } = options;
  let cursor: string | undefined;
  let count = 0;

  do {
    let response;

    try {
      response = await agent.com.atproto.repo.listRecords({
        repo: agent.assertDid,
        collection: OCCURRENCE_COLLECTION,
        limit: LIST_RECORDS_PAGE_LIMIT,
        cursor,
      });
    } catch (error) {
      throw makePdsError("Failed to count dataset occurrences.", error);
    }

    for (const record of response.data.records) {
      if (getOccurrenceDatasetRef(record.value) === datasetUri) {
        count += 1;
      }
    }

    cursor = response.data.cursor;
  } while (cursor);

  return count;
}

async function updateDatasetRecordCount(options: {
  agent: Agent;
  datasetRkey: string;
  incrementBy: number;
}): Promise<void> {
  const { agent, datasetRkey, incrementBy } = options;

  for (let attempt = 0; attempt < MAX_DATASET_COUNT_ATTEMPTS; attempt += 1) {
    const currentRecordResponse = await resolveDatasetRecord(agent, datasetRkey);
    const storedRecordCount = currentRecordResponse.record.recordCount;
    const nextRecordCount =
      storedRecordCount != null
        ? storedRecordCount + incrementBy
        : await countDatasetOccurrences({
            agent,
            datasetUri: currentRecordResponse.uri,
          });

    let nextRecord;
    try {
      nextRecord = parseDatasetRecord({
        ...currentRecordResponse.record,
        $type: DATASET_COLLECTION,
        createdAt: currentRecordResponse.record.createdAt,
        recordCount: nextRecordCount,
      });
    } catch (cause) {
      throw makeValidationError("Dataset count update is invalid.", cause);
    }

    try {
      await agent.com.atproto.repo.putRecord({
        repo: agent.assertDid,
        collection: DATASET_COLLECTION,
        rkey: datasetRkey,
        swapRecord: currentRecordResponse.cid,
        record: nextRecord,
      });
      return;
    } catch (error) {
      if (isDatasetUnavailableError(error)) {
        throw makeUnavailableError(DATASET_UNAVAILABLE_MESSAGE, error);
      }

      const isLastAttempt = attempt === MAX_DATASET_COUNT_ATTEMPTS - 1;
      if (!(error instanceof ComAtprotoRepoPutRecord.InvalidSwapError) || isLastAttempt) {
        throw makePdsError("Failed to update dataset tree count.", error);
      }

      await delay(buildRetryDelayMs(attempt));
    }
  }

  throw makePdsError("Failed to update dataset tree count after retries.");
}

async function unsetOccurrenceDatasetAssociation(options: {
  agent: Agent;
  rkey: string;
}): Promise<void> {
  const { agent, rkey } = options;
  let currentRecordResponse;

  try {
    currentRecordResponse = await agent.com.atproto.repo.getRecord({
      repo: agent.assertDid,
      collection: OCCURRENCE_COLLECTION,
      rkey,
    });
  } catch (error) {
    throw makePdsError(`Failed to load occurrence "${rkey}".`, error);
  }

  let currentRecord;
  try {
    currentRecord = parseOccurrenceRecord(currentRecordResponse.data.value);
  } catch (cause) {
    throw makeValidationError("Occurrence data is invalid.", cause);
  }

  const candidate = {
    ...currentRecord,
    $type: OCCURRENCE_COLLECTION,
    createdAt: currentRecord.createdAt,
    dynamicProperties: buildTreeDynamicProperties(),
  };
  delete candidate.datasetRef;

  let nextRecord;
  try {
    nextRecord = parseOccurrenceRecord(candidate);
  } catch (cause) {
    throw makeValidationError("Occurrence data is invalid.", cause);
  }

  try {
    await agent.com.atproto.repo.putRecord({
      repo: agent.assertDid,
      collection: OCCURRENCE_COLLECTION,
      rkey,
      swapRecord: currentRecordResponse.data.cid,
      record: nextRecord,
    });
  } catch (error) {
    throw makePdsError(`Failed to update occurrence "${rkey}".`, error);
  }
}

async function rollbackCreatedRecords(options: {
  agent: Agent;
  measurementRkey: string | null;
  occurrenceRkey: string;
}): Promise<{ ok: boolean; error: string | null; occurrenceStillExists: boolean }> {
  const { agent, measurementRkey, occurrenceRkey } = options;
  let measurementDeleteError: string | null = null;
  let occurrenceDeleteError: string | null = null;

  if (measurementRkey) {
    try {
      await deleteRecord({
        agent,
        collection: MEASUREMENT_COLLECTION,
        rkey: measurementRkey,
      });
    } catch (error) {
      measurementDeleteError = getErrorMessage(
        error,
        "Failed to delete measurement record.",
      );
    }
  }

  if (measurementDeleteError) {
    return {
      ok: false,
      error: measurementDeleteError,
      occurrenceStillExists: true,
    };
  }

  try {
    await deleteRecord({
      agent,
      collection: OCCURRENCE_COLLECTION,
      rkey: occurrenceRkey,
    });
  } catch (error) {
    occurrenceDeleteError = getErrorMessage(
      error,
      "Failed to delete occurrence record.",
    );
  }

  if (occurrenceDeleteError === null) {
    return { ok: true, error: null, occurrenceStillExists: false };
  }

  return {
    ok: false,
    error: occurrenceDeleteError,
    occurrenceStillExists: true,
  };
}

function mergeErrorMessages(current: string, next: string): string {
  return current.includes(next) ? current : `${current} ${next}`;
}

function upsertPersistedPartialResult(options: {
  results: AppendExistingDwcDatasetRowResult[];
  occurrence: PersistedOccurrence;
  error: string;
}): void {
  const { results, occurrence, error } = options;
  const existingIndex = results.findIndex((item) => item.index === occurrence.index);

  if (existingIndex === -1) {
    results.push({
      index: occurrence.index,
      state: "partial",
      occurrenceUri: occurrence.occurrenceUri,
      photoCount: 0,
      error,
    });
    return;
  }

  const existing = results[existingIndex];
  if (!existing) {
    results.push({
      index: occurrence.index,
      state: "partial",
      occurrenceUri: occurrence.occurrenceUri,
      photoCount: 0,
      error,
    });
    return;
  }

  if (existing.state === "partial") {
    results[existingIndex] = {
      ...existing,
      error: mergeErrorMessages(existing.error, error),
    };
    return;
  }

  if (existing.state === "success") {
    results[existingIndex] = {
      ...existing,
      state: "partial",
      error,
    };
    return;
  }

  results[existingIndex] = {
    index: occurrence.index,
    state: "partial",
    occurrenceUri: occurrence.occurrenceUri,
    photoCount: 0,
    error,
  };
}

async function detachTrackedOccurrences(options: {
  agent: Agent;
  occurrences: PersistedOccurrence[];
  results: AppendExistingDwcDatasetRowResult[];
}): Promise<void> {
  const { agent, occurrences, results } = options;

  for (const occurrence of occurrences) {
    try {
      await unsetOccurrenceDatasetAssociation({
        agent,
        rkey: occurrence.occurrenceRkey,
      });
      upsertPersistedPartialResult({
        results,
        occurrence,
        error:
          "The selected dataset disappeared during upload, so this tree was kept without dataset grouping. Review it in Tree Manager.",
      });
    } catch (error) {
      upsertPersistedPartialResult({
        results,
        occurrence,
        error:
          "The selected dataset disappeared during upload and this tree could not be moved out of that dataset automatically. Review it in Tree Manager."
          + ` ${getErrorMessage(error, "")}`.trimEnd(),
      });
    }
  }
}

function makeRowError(index: number, error: string): AppendExistingDwcDatasetRowResult {
  return {
    index,
    state: "error",
    error,
  };
}

function pushRemainingRowsUnavailableErrors(options: {
  results: AppendExistingDwcDatasetRowResult[];
  startIndex: number;
  totalRows: number;
}): void {
  const { results, startIndex, totalRows } = options;

  for (let remainingIndex = startIndex; remainingIndex < totalRows; remainingIndex += 1) {
    results.push(
      makeRowError(remainingIndex, DATASET_DISAPPEARED_DURING_UPLOAD_MESSAGE),
    );
  }
}

export const appendExistingDwcDataset = (
  input: AppendExistingDwcDatasetInput,
): Effect.Effect<
  AppendExistingDwcDatasetResult,
  DwcDatasetValidationError | DwcDatasetUnavailableError | DwcDatasetPdsError,
  AtprotoAgent
> =>
  Effect.gen(function* () {
    const agent = yield* AtprotoAgent;
    const validatedInput = yield* Effect.try({
      try: () => validateAppendExistingInput(input),
      catch: (cause) =>
        isKnownAppendExistingDatasetError(cause)
          ? cause
          : makeValidationError("Append dataset input is invalid.", cause),
    });

    return yield* Effect.tryPromise({
      try: async () => {
        const datasetRecord = await resolveDatasetRecord(
          agent,
          validatedInput.datasetRkey,
        );
        const results: AppendExistingDwcDatasetRowResult[] = [];
        const persistedOccurrences: PersistedOccurrence[] = [];
        let datasetBecameUnavailable = false;

        for (const [rowIndex, row] of validatedInput.rows.entries()) {
          const speciesName = row.occurrence.scientificName || `Row ${rowIndex + 1}`;
          const occurrenceInput = {
            ...row.occurrence,
            ...(validatedInput.establishmentMeans
              ? { establishmentMeans: validatedInput.establishmentMeans }
              : {}),
            datasetRef: datasetRecord.uri,
            dynamicProperties: buildTreeDynamicProperties(datasetRecord.uri),
          };

          let occurrence: CreatedRecord | null = null;
          let measurementRkey: string | null = null;

          try {
            occurrence = await createOccurrenceRecord({
              agent,
              occurrenceInput,
            });

            if (row.floraMeasurement) {
              const measurement = await createMeasurementRecord({
                agent,
                occurrenceUri: occurrence.uri,
                floraMeasurement: row.floraMeasurement,
              });
              measurementRkey = measurement.rkey;
            }

            await updateDatasetRecordCount({
              agent,
              datasetRkey: validatedInput.datasetRkey,
              incrementBy: 1,
            });

            persistedOccurrences.push({
              index: rowIndex,
              occurrenceUri: occurrence.uri,
              occurrenceRkey: occurrence.rkey,
            });
            results.push({
              index: rowIndex,
              state: "success",
              occurrenceUri: occurrence.uri,
              photoCount: 0,
            });
          } catch (error) {
            if (occurrence === null) {
              results.push(
                makeRowError(
                  rowIndex,
                  getErrorMessage(error, `Failed to append ${speciesName}.`),
                ),
              );
              continue;
            }

            const datasetUnavailable = isTaggedDatasetUnavailableError(error);
            if (datasetUnavailable) {
              datasetBecameUnavailable = true;
            }

            const rollback = await rollbackCreatedRecords({
              agent,
              measurementRkey,
              occurrenceRkey: occurrence.rkey,
            });

            if (rollback.ok) {
              if (datasetUnavailable) {
                await detachTrackedOccurrences({
                  agent,
                  occurrences: persistedOccurrences,
                  results,
                });
                results.push(
                  makeRowError(
                    rowIndex,
                    getErrorMessage(error, DATASET_UNAVAILABLE_MESSAGE),
                  ),
                );
                pushRemainingRowsUnavailableErrors({
                  results,
                  startIndex: rowIndex + 1,
                  totalRows: validatedInput.rows.length,
                });
                break;
              }

              results.push(
                makeRowError(
                  rowIndex,
                  getErrorMessage(error, `Failed to append ${speciesName}.`),
                ),
              );
              continue;
            }

            const currentOccurrence: PersistedOccurrence = {
              index: rowIndex,
              occurrenceUri: occurrence.uri,
              occurrenceRkey: occurrence.rkey,
            };

            if (rollback.occurrenceStillExists) {
              if (datasetUnavailable) {
                await detachTrackedOccurrences({
                  agent,
                  occurrences: persistedOccurrences,
                  results,
                });

                try {
                  await unsetOccurrenceDatasetAssociation({
                    agent,
                    rkey: occurrence.rkey,
                  });
                  results.push({
                    index: rowIndex,
                    state: "partial",
                    occurrenceUri: occurrence.uri,
                    photoCount: 0,
                    error:
                      "The selected dataset disappeared during upload, so this tree was kept without dataset grouping. Review it in Tree Manager."
                      + (rollback.error ? ` ${rollback.error}` : ""),
                  });
                } catch (ungroupError) {
                  results.push({
                    index: rowIndex,
                    state: "partial",
                    occurrenceUri: occurrence.uri,
                    photoCount: 0,
                    error:
                      "The selected dataset disappeared during upload and this tree could not be moved out of that dataset automatically. Review it in Tree Manager."
                      + (rollback.error ? ` ${rollback.error}` : "")
                      + (getErrorMessage(ungroupError, "")
                        ? ` ${getErrorMessage(ungroupError, "")}`
                        : ""),
                  });
                }

                pushRemainingRowsUnavailableErrors({
                  results,
                  startIndex: rowIndex + 1,
                  totalRows: validatedInput.rows.length,
                });
                break;
              }

              persistedOccurrences.push(currentOccurrence);

              try {
                await updateDatasetRecordCount({
                  agent,
                  datasetRkey: validatedInput.datasetRkey,
                  incrementBy: 1,
                });
                results.push({
                  index: rowIndex,
                  state: "partial",
                  occurrenceUri: occurrence.uri,
                  photoCount: 0,
                  error:
                    "The tree was created, but a follow-up step failed and automatic cleanup could not finish. Review this tree in Tree Manager."
                    + (rollback.error ? ` ${rollback.error}` : ""),
                });
              } catch (countError) {
                if (isTaggedDatasetUnavailableError(countError)) {
                  datasetBecameUnavailable = true;
                  await detachTrackedOccurrences({
                    agent,
                    occurrences: persistedOccurrences,
                    results,
                  });
                  upsertPersistedPartialResult({
                    results,
                    occurrence: currentOccurrence,
                    error:
                      "The selected dataset disappeared during upload, so this tree was kept without dataset grouping. Review it in Tree Manager."
                      + (rollback.error ? ` ${rollback.error}` : ""),
                  });
                  pushRemainingRowsUnavailableErrors({
                    results,
                    startIndex: rowIndex + 1,
                    totalRows: validatedInput.rows.length,
                  });
                  break;
                }

                const detail = getErrorMessage(countError, "");
                results.push({
                  index: rowIndex,
                  state: "partial",
                  occurrenceUri: occurrence.uri,
                  photoCount: 0,
                  error:
                    "The tree was created, but cleanup and dataset count reconciliation could not finish automatically. Review this tree in Tree Manager."
                    + (rollback.error ? ` ${rollback.error}` : "")
                    + (detail ? ` ${detail}` : ""),
                });
              }
              continue;
            }

            results.push(
              makeRowError(
                rowIndex,
                "The tree upload failed and some cleanup could not finish automatically."
                + (rollback.error ? ` ${rollback.error}` : ""),
              ),
            );
          }
        }

        return {
          datasetUri: datasetRecord.uri,
          datasetRkey: validatedInput.datasetRkey,
          datasetBecameUnavailable,
          results,
        } satisfies AppendExistingDwcDatasetResult;
      },
      catch: (cause) => {
        if (isKnownAppendExistingDatasetError(cause)) {
          return cause;
        }

        return makePdsError("Failed to append upload to dataset.", cause);
      },
    });
  });

export {
  DwcDatasetValidationError,
  DwcDatasetUnavailableError,
  DwcDatasetPdsError,
};
