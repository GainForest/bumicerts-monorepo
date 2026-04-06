import { Effect } from "effect";
import { AtprotoAgent } from "../../services/AtprotoAgent";
import { deleteRecord, fetchRecord } from "../../utils/shared";
import {
  AcMultimediaNotFoundError,
  AcMultimediaPdsError,
} from "./utils/errors";
import type { DeleteRecordInput, DeleteRecordResult } from "./utils/types";

const COLLECTION = "app.gainforest.ac.multimedia";

const makePdsError = (message: string, cause: unknown) =>
  new AcMultimediaPdsError({ message, cause });

export const deleteAcMultimedia = (
  input: DeleteRecordInput
): Effect.Effect<
  DeleteRecordResult,
  AcMultimediaNotFoundError | AcMultimediaPdsError,
  AtprotoAgent
> =>
  Effect.gen(function* () {
    const { rkey } = input;
    const agent = yield* AtprotoAgent;
    const repo = agent.assertDid;
    const uri = `at://${repo}/${COLLECTION}/${rkey}`;

    const existing = yield* fetchRecord(COLLECTION, rkey, makePdsError);

    if (existing === null) {
      return yield* Effect.fail(new AcMultimediaNotFoundError({ rkey }));
    }

    yield* deleteRecord(COLLECTION, rkey, makePdsError);

    return { uri, rkey };
  });

export { AcMultimediaNotFoundError, AcMultimediaPdsError };
