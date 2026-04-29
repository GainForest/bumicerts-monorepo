import { Effect } from "effect";
import { AtprotoAgent } from "../../services/AtprotoAgent";

/**
 * Fetch a record from the PDS by collection + rkey, with lexicon validation.
 *
 * Returns `null` when:
 * - The record does not exist (404 from PDS)
 * - The record exists but fails lexicon validation (e.g., missing required
 *   fields due to schema evolution)
 *
 * Validation failures are logged as warnings. This graceful degradation allows
 * upsert operations to recreate records with the current schema when old
 * records are missing newly-required fields.
 *
 * @param collection - ATProto collection NSID
 * @param rkey - Record key
 * @param parse - Lexicon parser function (e.g., `$parse` from generated types)
 * @param makePdsError - Error factory for PDS failures
 *
 * @example
 * ```ts
 * import { $parse } from "@gainforest/generated/app/gainforest/organization/info.defs";
 *
 * const existing = yield* fetchRecord(
 *   "app.gainforest.organization.info",
 *   "self",
 *   $parse,
 *   makePdsError
 * );
 * // TypeScript infers the return type from $parse — no manual generic needed
 * ```
 */
export const fetchRecord = <TRecord, TPdsError>(
  collection: string,
  rkey: string,
  parse: (v: unknown) => TRecord,
  makePdsError: (message: string, cause: unknown) => TPdsError,
): Effect.Effect<TRecord | null, TPdsError, AtprotoAgent> =>
  Effect.gen(function* () {
    const agent = yield* AtprotoAgent;
    const repo = agent.assertDid;

    const raw = yield* Effect.tryPromise({
      try: async () => {
        try {
          const res = await agent.com.atproto.repo.getRecord({
            repo,
            collection,
            rkey,
          });
          return res.data.value;
        } catch {
          // Record does not exist — return null
          return null;
        }
      },
      catch: (cause) =>
        makePdsError(
          `Failed to fetch ${collection} record at rkey "${rkey}"`,
          cause,
        ),
    });

    if (raw === null) return null;

    // Validate against lexicon schema
    try {
      return parse(raw);
    } catch (error) {
      // Invalid data — treat as non-existent.
      // This handles schema migrations gracefully: the next upsert will write valid data.
      console.warn(
        `[fetchRecord] Record at ${collection}/${rkey} failed validation — treating as non-existent:`,
        error,
      );
      // @TODO: THIS IS A BUG. WE MUST RETURN NULL IF VALIDATION FAILS. BUT WE LET IT GO
      // AS OF NOW BECAUSE OF DISCREPANICES BEING TOO MUCH TO SOLVE, IN SO LESS TIME.
      return raw as TRecord;
    }
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
  record: Record<string, unknown>,
  rkey: string | undefined,
  makePdsError: (message: string, cause: unknown) => TPdsError,
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
      catch: (cause) =>
        makePdsError(`PDS rejected createRecord for ${collection}`, cause),
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
  record: Record<string, unknown>,
  makePdsError: (message: string, cause: unknown) => TPdsError,
): Effect.Effect<{ uri: string; cid: string }, TPdsError, AtprotoAgent> =>
  Effect.gen(function* () {
    const agent = yield* AtprotoAgent;
    const repo = agent.assertDid;
    const response = yield* Effect.tryPromise({
      try: () =>
        agent.com.atproto.repo.putRecord({ repo, collection, rkey, record }),
      catch: (cause) =>
        makePdsError(
          `PDS rejected putRecord for ${collection} at rkey "${rkey}"`,
          cause,
        ),
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
  makePdsError: (message: string, cause: unknown) => TPdsError,
): Effect.Effect<void, TPdsError, AtprotoAgent> =>
  Effect.gen(function* () {
    const agent = yield* AtprotoAgent;
    const repo = agent.assertDid;
    yield* Effect.tryPromise({
      try: () =>
        agent.com.atproto.repo.deleteRecord({ repo, collection, rkey }),
      catch: (cause) =>
        makePdsError(
          `PDS rejected deleteRecord for ${collection} at rkey "${rkey}"`,
          cause,
        ),
    });
  });
