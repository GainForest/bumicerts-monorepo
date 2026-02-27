import { Effect } from "effect";
import { AtprotoAgent } from "../../services/AtprotoAgent";
import type { DeleteRecordInput, DeleteRecordResult } from "../../utils/shared/types";
import {
  ClaimActivityNotFoundError,
  ClaimActivityPdsError,
} from "./utils/errors";
import { fetchRecord, deleteRecord } from "../../utils/shared";

const COLLECTION = "org.hypercerts.claim.activity";

const makePdsError = (message: string, cause: unknown) =>
  new ClaimActivityPdsError({ message, cause });

export const deleteClaimActivity = (
  input: DeleteRecordInput
): Effect.Effect<
  DeleteRecordResult,
  ClaimActivityNotFoundError | ClaimActivityPdsError,
  AtprotoAgent
> =>
  Effect.gen(function* () {
    const { rkey } = input;
    const repo = (yield* AtprotoAgent).assertDid;
    const uri = `at://${repo}/${COLLECTION}/${rkey}`;

    const existing = yield* fetchRecord(COLLECTION, rkey, makePdsError);

    if (existing === null) {
      return yield* Effect.fail(new ClaimActivityNotFoundError({ rkey }));
    }

    yield* deleteRecord(COLLECTION, rkey, makePdsError);

    return { uri, rkey } satisfies DeleteRecordResult;
  });

export { ClaimActivityNotFoundError, ClaimActivityPdsError };
