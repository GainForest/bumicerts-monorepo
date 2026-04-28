import { ComAtprotoRepoPutRecord, type Agent } from "@atproto/api";
import { Effect } from "effect";
import { $parse as parseDatasetRecord } from "@gainforest/generated/app/gainforest/dwc/dataset.defs";
import { $parse as parseOccurrenceRecord } from "@gainforest/generated/app/gainforest/dwc/occurrence.defs";
import { AtprotoAgent } from "../../services/AtprotoAgent";
import { extractValidationIssues } from "../../validation";
import type { ValidationIssue } from "../../result";
import type { DwcOccurrenceRecord } from "../dwc.occurrence/utils/types";
import {
  DwcDatasetPdsError,
  DwcDatasetUnavailableError,
  DwcDatasetValidationError,
} from "./utils/errors";
import type {
  AttachExistingDwcDatasetOccurrenceResult,
  AttachExistingDwcDatasetOccurrencesInput,
  AttachExistingDwcDatasetOccurrencesResult,
  DwcDatasetRecord,
} from "./utils/types";
import { ATTACH_EXISTING_DWC_DATASET_MAX_OCCURRENCES } from "./utils/types";

const DATASET_COLLECTION = "app.gainforest.dwc.dataset";
const OCCURRENCE_COLLECTION = "app.gainforest.dwc.occurrence";
const LIST_RECORDS_PAGE_LIMIT = 100;
const MAX_DATASET_COUNT_ATTEMPTS = 5;
const BASE_RETRY_DELAY_MS = 50;
const DATASET_UNAVAILABLE_MESSAGE =
  "The selected dataset is no longer available. Choose another dataset and try again.";

type DatasetRecordResponse = {
  uri: string;
  cid: string;
  record: DwcDatasetRecord;
};

type OccurrenceRecordResponse = {
  uri: string;
  cid: string;
  record: DwcOccurrenceRecord;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isAttachExistingOccurrencesInput(
  value: unknown,
): value is AttachExistingDwcDatasetOccurrencesInput {
  return (
    isRecord(value) &&
    typeof value.datasetRkey === "string" &&
    Array.isArray(value.occurrenceRkeys) &&
    value.occurrenceRkeys.every((rkey) => typeof rkey === "string")
  );
}

function makeValidationError(
  message: string,
  cause?: unknown,
  issues?: ValidationIssue[],
): DwcDatasetValidationError {
  return new DwcDatasetValidationError({
    message,
    ...(cause !== undefined ? { cause } : {}),
    ...(issues !== undefined ? { issues } : {}),
  });
}

function makePdsError(message: string, cause?: unknown): DwcDatasetPdsError {
  return new DwcDatasetPdsError({
    message,
    ...(cause !== undefined ? { cause } : {}),
  });
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

function isKnownAttachExistingDatasetError(
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

type DynamicPropertiesParseResult =
  | { kind: "empty" }
  | { kind: "object"; properties: Record<string, unknown> }
  | { kind: "preserve"; value: string };

function parseDynamicProperties(
  value: string | null | undefined,
): DynamicPropertiesParseResult {
  if (typeof value !== "string") {
    return { kind: "empty" };
  }

  try {
    const parsed: unknown = JSON.parse(value);
    if (isRecord(parsed) && !Array.isArray(parsed)) {
      return { kind: "object", properties: parsed };
    }
  } catch {
    return { kind: "preserve", value };
  }

  return { kind: "preserve", value };
}

function buildTreeDynamicProperties(options: {
  existing?: string | null;
  datasetRef?: string;
}): string {
  const parsedProperties = parseDynamicProperties(options.existing);
  if (parsedProperties.kind === "preserve") {
    return parsedProperties.value;
  }

  const existingProperties =
    parsedProperties.kind === "object" ? parsedProperties.properties : {};
  const dataType =
    typeof existingProperties.dataType === "string"
      ? existingProperties.dataType
      : "measuredTree";
  const source =
    typeof existingProperties.source === "string"
      ? existingProperties.source
      : "bumicerts";
  const nextProperties = {
    ...existingProperties,
    dataType,
    source,
    ...(options.datasetRef ? { datasetRef: options.datasetRef } : {}),
  };

  if (!options.datasetRef) {
    delete nextProperties.datasetRef;
  }

  return JSON.stringify(nextProperties);
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

function hasStatus404(value: unknown): boolean {
  return isRecord(value) && value.status === 404;
}

function isDatasetUnavailableError(error: unknown): boolean {
  if (hasStatus404(error)) {
    return true;
  }

  if (isRecord(error) && hasStatus404(error.cause)) {
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

function validateAttachExistingOccurrencesInput(
  input: AttachExistingDwcDatasetOccurrencesInput,
): AttachExistingDwcDatasetOccurrencesInput {
  if (!isAttachExistingOccurrencesInput(input)) {
    throw makeValidationError("datasetRkey and occurrenceRkeys are required.");
  }

  const datasetRkey = input.datasetRkey.trim();
  const occurrenceRkeys = input.occurrenceRkeys.map((rkey) => rkey.trim());

  if (datasetRkey.length === 0) {
    throw makeValidationError("Choose a dataset before adding trees.");
  }

  if (occurrenceRkeys.length === 0) {
    throw makeValidationError("Choose at least one tree to add to the dataset.");
  }

  if (occurrenceRkeys.some((rkey) => rkey.length === 0)) {
    throw makeValidationError("Tree identifiers cannot be empty.");
  }

  if (occurrenceRkeys.length > ATTACH_EXISTING_DWC_DATASET_MAX_OCCURRENCES) {
    throw makeValidationError(
      `Add-to-dataset requests are limited to ${ATTACH_EXISTING_DWC_DATASET_MAX_OCCURRENCES} trees per call.`,
    );
  }

  return { datasetRkey, occurrenceRkeys };
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
      throw makeValidationError(
        "Dataset data is invalid.",
        cause,
        extractValidationIssues(cause),
      );
    }
  } catch (error) {
    if (isKnownAttachExistingDatasetError(error)) {
      throw error;
    }

    if (isDatasetUnavailableError(error)) {
      throw makeUnavailableError(DATASET_UNAVAILABLE_MESSAGE, error);
    }

    throw makePdsError(`Failed to load dataset "${datasetRkey}".`, error);
  }
}

async function resolveOccurrenceRecord(
  agent: Agent,
  rkey: string,
): Promise<OccurrenceRecordResponse> {
  try {
    const response = await agent.com.atproto.repo.getRecord({
      repo: agent.assertDid,
      collection: OCCURRENCE_COLLECTION,
      rkey,
    });

    if (!response.data.cid) {
      throw makePdsError(`Tree record "${rkey}" is missing a CID.`);
    }

    try {
      return {
        uri: response.data.uri,
        cid: response.data.cid,
        record: parseOccurrenceRecord(response.data.value),
      };
    } catch (cause) {
      throw makeValidationError(
        "Tree record data is invalid.",
        cause,
        extractValidationIssues(cause),
      );
    }
  } catch (error) {
    if (isKnownAttachExistingDatasetError(error)) {
      throw error;
    }

    throw makePdsError(`Failed to load tree record "${rkey}".`, error);
  }
}

async function putOccurrenceDatasetAssociation(options: {
  agent: Agent;
  rkey: string;
  occurrence: OccurrenceRecordResponse;
  datasetUri: string;
}): Promise<void> {
  const { agent, rkey, occurrence, datasetUri } = options;
  const candidate = {
    ...occurrence.record,
    $type: OCCURRENCE_COLLECTION,
    createdAt: occurrence.record.createdAt,
    datasetRef: datasetUri,
    dynamicProperties: buildTreeDynamicProperties({
      existing: occurrence.record.dynamicProperties,
      datasetRef: datasetUri,
    }),
  };

  let nextRecord;
  try {
    nextRecord = parseOccurrenceRecord(candidate);
  } catch (cause) {
    throw makeValidationError(
      "Tree dataset association is invalid.",
      cause,
      extractValidationIssues(cause),
    );
  }

  try {
    await agent.com.atproto.repo.putRecord({
      repo: agent.assertDid,
      collection: OCCURRENCE_COLLECTION,
      rkey,
      swapRecord: occurrence.cid,
      record: nextRecord,
    });
  } catch (error) {
    throw makePdsError(`Failed to add tree "${rkey}" to the dataset.`, error);
  }
}

function removeDatasetRef(record: DwcOccurrenceRecord): DwcOccurrenceRecord {
  const next = { ...record };
  delete next.datasetRef;
  return next;
}

async function unsetOccurrenceDatasetAssociation(options: {
  agent: Agent;
  rkey: string;
  datasetUri: string;
}): Promise<void> {
  const { agent, rkey, datasetUri } = options;
  const occurrence = await resolveOccurrenceRecord(agent, rkey);

  if (occurrence.record.datasetRef !== datasetUri) {
    return;
  }

  const candidate = {
    ...removeDatasetRef(occurrence.record),
    $type: OCCURRENCE_COLLECTION,
    createdAt: occurrence.record.createdAt,
    dynamicProperties: buildTreeDynamicProperties({
      existing: occurrence.record.dynamicProperties,
    }),
  };

  let nextRecord;
  try {
    nextRecord = parseOccurrenceRecord(candidate);
  } catch (cause) {
    throw makeValidationError(
      "Tree dataset rollback is invalid.",
      cause,
      extractValidationIssues(cause),
    );
  }

  try {
    await agent.com.atproto.repo.putRecord({
      repo: agent.assertDid,
      collection: OCCURRENCE_COLLECTION,
      rkey,
      swapRecord: occurrence.cid,
      record: nextRecord,
    });
  } catch (error) {
    throw makePdsError(`Failed to move tree "${rkey}" back to the review bucket.`, error);
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
      throw makeValidationError(
        "Dataset count update is invalid.",
        cause,
        extractValidationIssues(cause),
      );
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

function makeSkippedResult(options: {
  index: number;
  rkey: string;
  occurrenceUri?: string;
  error: string;
}): AttachExistingDwcDatasetOccurrenceResult {
  return {
    index: options.index,
    rkey: options.rkey,
    state: "skipped",
    ...(options.occurrenceUri ? { occurrenceUri: options.occurrenceUri } : {}),
    error: options.error,
  };
}

function makeErrorResult(
  index: number,
  rkey: string,
  error: string,
  occurrenceUri?: string,
): AttachExistingDwcDatasetOccurrenceResult {
  return {
    index,
    rkey,
    state: "error",
    ...(occurrenceUri ? { occurrenceUri } : {}),
    error,
  };
}

async function detachSuccessfulResults(options: {
  agent: Agent;
  datasetUri: string;
  results: AttachExistingDwcDatasetOccurrenceResult[];
}): Promise<void> {
  const { agent, datasetUri, results } = options;

  for (const [resultIndex, result] of results.entries()) {
    if (result.state !== "success") {
      continue;
    }

    try {
      await unsetOccurrenceDatasetAssociation({
        agent,
        rkey: result.rkey,
        datasetUri,
      });
      results[resultIndex] = makeErrorResult(
        result.index,
        result.rkey,
        "The selected dataset disappeared while adding trees, so this tree was kept in the review bucket.",
        result.occurrenceUri,
      );
    } catch (error) {
      results[resultIndex] = makeErrorResult(
        result.index,
        result.rkey,
        "The selected dataset disappeared while adding trees, and this tree could not be moved back to the review bucket automatically. Review it in Tree Manager."
          + (getErrorMessage(error, "") ? ` ${getErrorMessage(error, "")}` : ""),
        result.occurrenceUri,
      );
    }
  }
}

export const attachExistingDwcDatasetOccurrences = (
  input: AttachExistingDwcDatasetOccurrencesInput,
): Effect.Effect<
  AttachExistingDwcDatasetOccurrencesResult,
  DwcDatasetValidationError | DwcDatasetUnavailableError | DwcDatasetPdsError,
  AtprotoAgent
> =>
  Effect.gen(function* () {
    const agent = yield* AtprotoAgent;
    const validatedInput = yield* Effect.try({
      try: () => validateAttachExistingOccurrencesInput(input),
      catch: (cause) =>
        isKnownAttachExistingDatasetError(cause)
          ? cause
          : makeValidationError("Add-to-dataset input is invalid.", cause),
    });

    return yield* Effect.tryPromise({
      try: async () => {
        const datasetRecord = await resolveDatasetRecord(
          agent,
          validatedInput.datasetRkey,
        );
        const results: AttachExistingDwcDatasetOccurrenceResult[] = [];
        const seenRkeys = new Set<string>();
        let attachedCount = 0;

        for (const [index, rkey] of validatedInput.occurrenceRkeys.entries()) {
          if (seenRkeys.has(rkey)) {
            results.push(
              makeSkippedResult({
                index,
                rkey,
                error: "This tree was already included in this request.",
              }),
            );
            continue;
          }
          seenRkeys.add(rkey);

          try {
            const occurrence = await resolveOccurrenceRecord(agent, rkey);
            const currentDatasetRef = occurrence.record.datasetRef;

            if (currentDatasetRef === datasetRecord.uri) {
              results.push(
                makeSkippedResult({
                  index,
                  rkey,
                  occurrenceUri: occurrence.uri,
                  error: "This tree is already in the selected dataset.",
                }),
              );
              continue;
            }

            if (typeof currentDatasetRef === "string" && currentDatasetRef.length > 0) {
              results.push(
                makeSkippedResult({
                  index,
                  rkey,
                  occurrenceUri: occurrence.uri,
                  error: "This tree already belongs to another dataset.",
                }),
              );
              continue;
            }

            await putOccurrenceDatasetAssociation({
              agent,
              rkey,
              occurrence,
              datasetUri: datasetRecord.uri,
            });

            attachedCount += 1;
            results.push({
              index,
              rkey,
              state: "success",
              occurrenceUri: occurrence.uri,
            });
          } catch (error) {
            results.push(
              makeErrorResult(
                index,
                rkey,
                getErrorMessage(error, `Failed to add tree "${rkey}" to the dataset.`),
              ),
            );
          }
        }

        let datasetCountUpdated = attachedCount === 0;
        let datasetBecameUnavailable = false;
        let datasetCountError: string | undefined;

        if (attachedCount > 0) {
          try {
            await updateDatasetRecordCount({
              agent,
              datasetRkey: validatedInput.datasetRkey,
              incrementBy: attachedCount,
            });
            datasetCountUpdated = true;
          } catch (error) {
            datasetCountUpdated = false;
            datasetBecameUnavailable = isTaggedDatasetUnavailableError(error);
            datasetCountError = getErrorMessage(
              error,
              "The trees were added, but the dataset tree count could not be updated yet.",
            );

            if (datasetBecameUnavailable) {
              await detachSuccessfulResults({
                agent,
                datasetUri: datasetRecord.uri,
                results,
              });
              attachedCount = results.filter(
                (result) => result.state === "success",
              ).length;
            }
          }
        }

        const skippedCount = results.filter((result) => result.state === "skipped").length;
        const errorCount = results.filter((result) => result.state === "error").length;
        const baseResult = {
          datasetUri: datasetRecord.uri,
          datasetRkey: validatedInput.datasetRkey,
          attachedCount,
          skippedCount,
          errorCount,
          datasetCountUpdated,
          datasetBecameUnavailable,
          results,
        } satisfies AttachExistingDwcDatasetOccurrencesResult;

        return datasetCountError
          ? { ...baseResult, datasetCountError }
          : baseResult;
      },
      catch: (cause) => {
        if (isKnownAttachExistingDatasetError(cause)) {
          return cause;
        }

        return makePdsError("Failed to add trees to dataset.", cause);
      },
    });
  });

export {
  DwcDatasetPdsError,
  DwcDatasetUnavailableError,
  DwcDatasetValidationError,
};
