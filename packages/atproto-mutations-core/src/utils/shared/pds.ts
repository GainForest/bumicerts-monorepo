import { Effect } from "effect";
import { AtprotoAgent } from "../../services/AtprotoAgent";

/**
 * Fetch a record from the PDS by collection + rkey.
 *
 * Returns `null` when the record does not exist (the underlying XRPC call
 * throws a 404 — we swallow it and return null so callers can branch on
 * presence without treating absence as an error).
 *
 * Any network or unexpected PDS error is surfaced as `TPdsError` via
 * `makePdsError`, keeping it in Effect's typed error channel.
 */
export const fetchRecord = <TRecord, TPdsError>(
  collection: string,
  rkey: string,
  makePdsError: (message: string, cause: unknown) => TPdsError
): Effect.Effect<TRecord | null, TPdsError, AtprotoAgent> =>
  Effect.gen(function* () {
    const agent = yield* AtprotoAgent;
    const repo = agent.assertDid;
    return yield* Effect.tryPromise({
      try: () =>
        agent.com.atproto.repo
          .getRecord({ repo, collection, rkey })
          .then((res) => res.data.value as TRecord)
          .catch(() => null),
      catch: (cause) => makePdsError(`Failed to fetch ${collection} record at rkey "${rkey}"`, cause),
    });
  });

/**
 * Write a new record via com.atproto.repo.createRecord.
 *
 * When `rkey` is `undefined` the PDS assigns a TID automatically — the
 * assigned rkey is extractable from the returned `uri` via
 * `uri.split("/").pop()`.
 *
 * Returns `{ uri, cid }` on success.
 */
export const createRecord = <TPdsError>(
  collection: string,
  record: unknown,
  rkey: string | undefined,
  makePdsError: (message: string, cause: unknown) => TPdsError
): Effect.Effect<{ uri: string; cid: string }, TPdsError, AtprotoAgent> =>
  Effect.gen(function* () {
    const agent = yield* AtprotoAgent;
    const repo = agent.assertDid;
    const response = yield* Effect.tryPromise({
      try: () =>
        agent.com.atproto.repo.createRecord({
          repo,
          collection,
          ...(rkey !== undefined ? { rkey } : {}),
          record,
        }),
      catch: (cause) => makePdsError(`PDS rejected createRecord for ${collection}`, cause),
    });
    return { uri: response.data.uri, cid: response.data.cid };
  });

/**
 * Write a record via com.atproto.repo.putRecord.
 *
 * Idempotent — creates the record if it does not yet exist, replaces it if
 * it does. Requires a known `rkey`.
 *
 * Returns `{ uri, cid }` on success.
 */
export const putRecord = <TPdsError>(
  collection: string,
  rkey: string,
  record: unknown,
  makePdsError: (message: string, cause: unknown) => TPdsError
): Effect.Effect<{ uri: string; cid: string }, TPdsError, AtprotoAgent> =>
  Effect.gen(function* () {
    const agent = yield* AtprotoAgent;
    const repo = agent.assertDid;
    const response = yield* Effect.tryPromise({
      try: () =>
        agent.com.atproto.repo.putRecord({ repo, collection, rkey, record }),
      catch: (cause) => makePdsError(`PDS rejected putRecord for ${collection} at rkey "${rkey}"`, cause),
    });
    return { uri: response.data.uri, cid: response.data.cid };
  });

/**
 * Delete a record via com.atproto.repo.deleteRecord.
 *
 * This helper performs the deletion only — it does NOT check for existence
 * beforehand. Call `fetchRecord` first when you need to distinguish
 * "record was never there" from a real PDS error, or when a pre-deletion
 * check is required (e.g. the record is referenced by other records).
 */
export const deleteRecord = <TPdsError>(
  collection: string,
  rkey: string,
  makePdsError: (message: string, cause: unknown) => TPdsError
): Effect.Effect<void, TPdsError, AtprotoAgent> =>
  Effect.gen(function* () {
    const agent = yield* AtprotoAgent;
    const repo = agent.assertDid;
    yield* Effect.tryPromise({
      try: () =>
        agent.com.atproto.repo.deleteRecord({ repo, collection, rkey }),
      catch: (cause) => makePdsError(`PDS rejected deleteRecord for ${collection} at rkey "${rkey}"`, cause),
    });
  });
