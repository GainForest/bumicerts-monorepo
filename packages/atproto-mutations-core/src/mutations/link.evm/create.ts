import { Effect } from "effect";
import type { ValidationIssue } from "../../result";
import { AtprotoAgent } from "../../services/AtprotoAgent";
import {
  $parse,
} from "@gainforest/generated/app/gainforest/link/evm.defs";
import type {
  LinkEvmMutationResult,
  LinkEvmRecord,
  CreateLinkEvmInput,
} from "./utils/types";
import {
  LinkEvmPdsError,
  LinkEvmValidationError,
} from "./utils/errors";
import { BlobUploadError } from "../../blob/errors";
import {
  stubValidate,
  finalValidate,
  resolveFileInputs,
  createRecord,
} from "../../utils/shared";

const COLLECTION = "app.gainforest.link.evm";

const makePdsError = (message: string, cause: unknown) =>
  new LinkEvmPdsError({ message, cause });

const makeValidationError = (message: string, cause: unknown, issues?: ValidationIssue[]) =>
  new LinkEvmValidationError({ message, cause, issues });

/**
 * Creates a new app.gainforest.link.evm record in the authenticated ATProto repo.
 *
 * This record links an EVM wallet address to the user's ATProto DID.
 * It is immutable/append-only — there is no update, upsert, or delete.
 * Users may create multiple records to link multiple EVM wallets.
 *
 * The record contains:
 *   - userProof: the user's EIP-712 signature proving wallet ownership
 *   - platformAttestation: the platform's counter-signature proving the link
 *     was created through a trusted service
 *
 * Both signatures are generated server-side via the /api/identity-link endpoint
 * before calling this mutation.
 */
export const createLinkEvm = (
  input: CreateLinkEvmInput
): Effect.Effect<
  LinkEvmMutationResult,
  LinkEvmValidationError | LinkEvmPdsError | BlobUploadError,
  AtprotoAgent
> =>
  Effect.gen(function* () {
    const { rkey: inputRkey, ...inputData } = input;
    const candidate = {
      $type: COLLECTION,
      ...inputData,
      createdAt: new Date().toISOString(),
    };

    yield* stubValidate(candidate, $parse, makeValidationError);

    const resolved = yield* resolveFileInputs(candidate);
    const record = yield* finalValidate(resolved, $parse, makeValidationError);

    const { uri, cid } = yield* createRecord(COLLECTION, record, inputRkey, makePdsError);
    const rkey = uri.split("/").pop()!;

    return {
      uri,
      cid,
      rkey,
      record: record as LinkEvmRecord,
    } satisfies LinkEvmMutationResult;
  });

export { LinkEvmPdsError, LinkEvmValidationError, BlobUploadError };
