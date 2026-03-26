import { Effect } from "effect";
import { AtprotoAgent } from "../../services/AtprotoAgent";
import type { DeleteRecordInput, DeleteRecordResult } from "../../utils/shared/types";
import {
  ContextAttachmentNotFoundError,
  ContextAttachmentPdsError,
} from "./utils/errors";
import { fetchRecord, deleteRecord } from "../../utils/shared";

const COLLECTION = "org.hypercerts.context.attachment";

const makePdsError = (message: string, cause: unknown) =>
  new ContextAttachmentPdsError({ message, cause });

export const deleteContextAttachment = (
  input: DeleteRecordInput
): Effect.Effect<
  DeleteRecordResult,
  ContextAttachmentNotFoundError | ContextAttachmentPdsError,
  AtprotoAgent
> =>
  Effect.gen(function* () {
    const { rkey } = input;
    const repo = (yield* AtprotoAgent).assertDid;
    const uri = `at://${repo}/${COLLECTION}/${rkey}`;

    const existing = yield* fetchRecord(COLLECTION, rkey, makePdsError);

    if (existing === null) {
      return yield* Effect.fail(new ContextAttachmentNotFoundError({ rkey }));
    }

    yield* deleteRecord(COLLECTION, rkey, makePdsError);

    return { uri, rkey } satisfies DeleteRecordResult;
  });

export { ContextAttachmentNotFoundError, ContextAttachmentPdsError };
