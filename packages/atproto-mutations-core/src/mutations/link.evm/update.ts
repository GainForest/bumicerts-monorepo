import { Effect } from "effect";
import type { ValidationIssue } from "../../result";
import { AtprotoAgent } from "../../services/AtprotoAgent";
import {
  $parse,
} from "@gainforest/generated/app/gainforest/link/evm.defs";
import type {
  LinkEvmMutationResult,
  LinkEvmRecord,
  UpdateLinkEvmInput,
} from "./utils/types";
import {
  LinkEvmNotFoundError,
  LinkEvmPdsError,
  LinkEvmValidationError,
} from "./utils/errors";
import { BlobUploadError } from "../../blob/errors";
import {
  stubValidate,
  finalValidate,
  resolveFileInputs,
  fetchRecord,
  putRecord,
} from "../../utils/shared";

const COLLECTION = "app.gainforest.link.evm";

const makePdsError = (message: string, cause: unknown) =>
  new LinkEvmPdsError({ message, cause });

const makeValidationError = (message: string, cause: unknown, issues?: ValidationIssue[]) =>
  new LinkEvmValidationError({ message, cause, issues });

/**
 * Updates an existing app.gainforest.link.evm record.
 *
 * Only the mutable field `name` can be updated — the cryptographic proof
 * fields (address, userProof, platformAttestation) are carried over unchanged
 * from the existing record.
 */
export const updateLinkEvm = (
  input: UpdateLinkEvmInput
): Effect.Effect<
  LinkEvmMutationResult,
  | LinkEvmValidationError
  | LinkEvmNotFoundError
  | LinkEvmPdsError
  | BlobUploadError,
  AtprotoAgent
> =>
  Effect.gen(function* () {
    const { rkey } = input;

    const existing = yield* fetchRecord(
      COLLECTION, rkey, $parse, makePdsError
    );

    if (existing === null) {
      return yield* Effect.fail(new LinkEvmNotFoundError({ rkey }));
    }

    // Merge: only allow patching `name`; preserve all crypto fields
    const patched: LinkEvmRecord = {
      ...existing,
      $type: COLLECTION,
      // Allow setting name to undefined (unset) or a new string
      ...(Object.prototype.hasOwnProperty.call(input.data, "name")
        ? { name: input.data.name }
        : {}),
      ...(input.unset?.includes("name") ? { name: undefined } : {}),
    };

    yield* stubValidate(patched, $parse, makeValidationError);

    const resolved = yield* resolveFileInputs(patched);
    const record = yield* finalValidate(resolved, $parse, makeValidationError);

    const { uri, cid } = yield* putRecord(COLLECTION, rkey, record, makePdsError);

    return { uri, cid, rkey, record: record as LinkEvmRecord } satisfies LinkEvmMutationResult;
  });

export { LinkEvmNotFoundError, LinkEvmPdsError, LinkEvmValidationError, BlobUploadError };
