import { Effect } from "effect";
import { AtprotoAgent } from "../../services/AtprotoAgent";
import type { DeleteRecordInput, DeleteRecordResult } from "../../utils/shared/types";
import {
  ClaimRightsNotFoundError,
  ClaimRightsPdsError,
} from "./utils/errors";
import { fetchRecord, deleteRecord } from "../../utils/shared";

const COLLECTION = "org.hypercerts.claim.rights";

const makePdsError = (message: string, cause: unknown) =>
  new ClaimRightsPdsError({ message, cause });

export const deleteClaimRights = (
  input: DeleteRecordInput
): Effect.Effect<
  DeleteRecordResult,
  ClaimRightsNotFoundError | ClaimRightsPdsError,
  AtprotoAgent
> =>
  Effect.gen(function* () {
    const { rkey } = input;
    const repo = (yield* AtprotoAgent).assertDid;
    const uri = `at://${repo}/${COLLECTION}/${rkey}`;

    const existing = yield* fetchRecord(COLLECTION, rkey, makePdsError);

    if (existing === null) {
      return yield* Effect.fail(new ClaimRightsNotFoundError({ rkey }));
    }

    yield* deleteRecord(COLLECTION, rkey, makePdsError);

    return { uri, rkey } satisfies DeleteRecordResult;
  });

export { ClaimRightsNotFoundError, ClaimRightsPdsError };
