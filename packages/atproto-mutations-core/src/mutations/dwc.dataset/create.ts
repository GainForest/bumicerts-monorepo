import { Effect } from "effect";
import { $parse } from "@gainforest/generated/app/gainforest/dwc/dataset.defs";
import { AtprotoAgent } from "../../services/AtprotoAgent";
import { createRecord } from "../../utils/shared";
import {
  DwcDatasetValidationError,
  DwcDatasetPdsError,
} from "./utils/errors";
import type {
  CreateDwcDatasetInput,
  DwcDatasetMutationResult,
  DwcDatasetRecord,
} from "./utils/types";

const COLLECTION = "app.gainforest.dwc.dataset";

const makePdsError = (message: string, cause: unknown) =>
  new DwcDatasetPdsError({ message, cause });

const makeValidationError = (message: string, cause: unknown) =>
  new DwcDatasetValidationError({ message, cause });

export const createDwcDataset = (
  input: CreateDwcDatasetInput
): Effect.Effect<
  DwcDatasetMutationResult,
  DwcDatasetValidationError | DwcDatasetPdsError,
  AtprotoAgent
> =>
  Effect.gen(function* () {
    const {
      name,
      description,
      recordCount,
      establishmentMeans,
      rkey,
    } = input;

    const createdAt = new Date().toISOString();
    const candidate = {
      $type: COLLECTION,
      name,
      ...(description !== undefined ? { description } : {}),
      ...(recordCount !== undefined ? { recordCount } : {}),
      ...(establishmentMeans !== undefined ? { establishmentMeans } : {}),
      createdAt,
    };

    const record = yield* Effect.try({
      try: () => $parse(candidate),
      catch: (cause) =>
        makeValidationError(
          `dwc.dataset record failed lexicon validation: ${String(cause)}`,
          cause
        ),
    });

    const { uri, cid } = yield* createRecord(COLLECTION, record, rkey, makePdsError);
    const assignedRkey = uri.split("/").pop() ?? rkey ?? "unknown";

    return {
      uri,
      cid,
      rkey: assignedRkey,
      record: record as DwcDatasetRecord,
    } satisfies DwcDatasetMutationResult;
  });

export { DwcDatasetValidationError, DwcDatasetPdsError };
