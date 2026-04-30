import { Effect } from "effect";
import { AtprotoAgent } from "../../services/AtprotoAgent";
import type { DeleteRecordInput, DeleteRecordResult } from "../../utils/shared/types";
import {
  FundingConfigNotFoundError,
  FundingConfigPdsError,
} from "./utils/errors";
import { fetchRecord, deleteRecord } from "../../utils/shared";
import { $parse } from "@gainforest/generated/app/gainforest/funding/config.defs";

const COLLECTION = "app.gainforest.funding.config";

const makePdsError = (message: string, cause: unknown) =>
  new FundingConfigPdsError({ message, cause });

export const deleteFundingConfig = (
  input: DeleteRecordInput
): Effect.Effect<
  DeleteRecordResult,
  FundingConfigNotFoundError | FundingConfigPdsError,
  AtprotoAgent
> =>
  Effect.gen(function* () {
    const { rkey } = input;
    const repo = (yield* AtprotoAgent).assertDid;
    const uri = `at://${repo}/${COLLECTION}/${rkey}`;

    const existing = yield* fetchRecord(COLLECTION, rkey, $parse, makePdsError);

    if (existing === null) {
      return yield* Effect.fail(new FundingConfigNotFoundError({ rkey }));
    }

    yield* deleteRecord(COLLECTION, rkey, makePdsError);

    return { uri, rkey } satisfies DeleteRecordResult;
  });

export { FundingConfigNotFoundError, FundingConfigPdsError };
