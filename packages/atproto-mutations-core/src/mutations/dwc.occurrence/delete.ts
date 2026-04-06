import { Effect } from "effect";
import { AtprotoAgent } from "../../services/AtprotoAgent";
import { deleteRecord, fetchRecord } from "../../utils/shared";
import {
  DwcOccurrenceNotFoundError,
  DwcOccurrencePdsError,
} from "./utils/errors";
import type { DeleteRecordInput, DeleteRecordResult } from "./utils/types";

const COLLECTION = "app.gainforest.dwc.occurrence";

const makePdsError = (message: string, cause: unknown) =>
  new DwcOccurrencePdsError({ message, cause });

export const deleteDwcOccurrence = (
  input: DeleteRecordInput
): Effect.Effect<
  DeleteRecordResult,
  DwcOccurrenceNotFoundError | DwcOccurrencePdsError,
  AtprotoAgent
> =>
  Effect.gen(function* () {
    const { rkey } = input;
    const agent = yield* AtprotoAgent;
    const repo = agent.assertDid;
    const uri = `at://${repo}/${COLLECTION}/${rkey}`;

    const existing = yield* fetchRecord(COLLECTION, rkey, makePdsError);

    if (existing === null) {
      return yield* Effect.fail(new DwcOccurrenceNotFoundError({ rkey }));
    }

    yield* deleteRecord(COLLECTION, rkey, makePdsError);

    return { uri, rkey };
  });

export { DwcOccurrenceNotFoundError, DwcOccurrencePdsError };
