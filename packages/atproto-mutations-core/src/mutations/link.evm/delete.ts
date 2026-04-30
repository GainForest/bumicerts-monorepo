import { Effect } from "effect";
import { AtprotoAgent } from "../../services/AtprotoAgent";
import type { DeleteRecordInput, DeleteRecordResult } from "../../utils/shared/types";
import {
  LinkEvmNotFoundError,
  LinkEvmPdsError,
} from "./utils/errors";
import { fetchRecord, deleteRecord } from "../../utils/shared";
import { $parse } from "@gainforest/generated/app/gainforest/link/evm.defs";

const COLLECTION = "app.gainforest.link.evm";

const makePdsError = (message: string, cause: unknown) =>
  new LinkEvmPdsError({ message, cause });

export const deleteLinkEvm = (
  input: DeleteRecordInput
): Effect.Effect<
  DeleteRecordResult,
  LinkEvmNotFoundError | LinkEvmPdsError,
  AtprotoAgent
> =>
  Effect.gen(function* () {
    const { rkey } = input;
    const repo = (yield* AtprotoAgent).assertDid;
    const uri = `at://${repo}/${COLLECTION}/${rkey}`;

    const existing = yield* fetchRecord(COLLECTION, rkey, $parse, makePdsError);

    if (existing === null) {
      return yield* Effect.fail(new LinkEvmNotFoundError({ rkey }));
    }

    yield* deleteRecord(COLLECTION, rkey, makePdsError);

    return { uri, rkey } satisfies DeleteRecordResult;
  });

export { LinkEvmNotFoundError, LinkEvmPdsError };
