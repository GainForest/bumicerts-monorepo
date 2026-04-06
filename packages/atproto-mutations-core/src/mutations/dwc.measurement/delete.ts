import { Effect } from "effect";
import { AtprotoAgent } from "../../services/AtprotoAgent";
import { deleteRecord, fetchRecord } from "../../utils/shared";
import {
  DwcMeasurementNotFoundError,
  DwcMeasurementPdsError,
} from "./utils/errors";
import type { DeleteRecordInput, DeleteRecordResult } from "./utils/types";

const COLLECTION = "app.gainforest.dwc.measurement";

const makePdsError = (message: string, cause: unknown) =>
  new DwcMeasurementPdsError({ message, cause });

export const deleteDwcMeasurement = (
  input: DeleteRecordInput
): Effect.Effect<
  DeleteRecordResult,
  DwcMeasurementNotFoundError | DwcMeasurementPdsError,
  AtprotoAgent
> =>
  Effect.gen(function* () {
    const { rkey } = input;
    const agent = yield* AtprotoAgent;
    const repo = agent.assertDid;
    const uri = `at://${repo}/${COLLECTION}/${rkey}`;

    const existing = yield* fetchRecord(COLLECTION, rkey, makePdsError);

    if (existing === null) {
      return yield* Effect.fail(new DwcMeasurementNotFoundError({ rkey }));
    }

    yield* deleteRecord(COLLECTION, rkey, makePdsError);

    return { uri, rkey };
  });

export { DwcMeasurementNotFoundError, DwcMeasurementPdsError };
