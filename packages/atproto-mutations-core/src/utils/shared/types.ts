import type { WithFileInputs } from "../../blob/types";

// ---------------------------------------------------------------------------
// Base utility
// ---------------------------------------------------------------------------

/**
 * Strips the system-managed fields that every ATProto record carries but
 * that callers never supply — the mutation layer always sets these internally.
 */
export type RecordFields<TRecord> = Omit<TRecord, "$type" | "createdAt">;

// ---------------------------------------------------------------------------
// Mutation result types
// ---------------------------------------------------------------------------

/**
 * Returned by create / update / upsert for singleton records (key=literal:self).
 * The rkey is always known ("self") and therefore not included in the result —
 * the uri alone is sufficient to identify the record.
 */
export type SingletonMutationResult<TRecord> = {
  uri: string;
  cid: string;
  record: TRecord;
};

/**
 * Returned by create / update / upsert for multi-record collections (key=any).
 * Includes the rkey because the caller needs it for subsequent operations
 * (update, delete, canonical links).
 */
export type RecordMutationResult<TRecord> = {
  uri: string;
  cid: string;
  rkey: string;
  record: TRecord;
};

/**
 * Returned by delete operations.
 * The record is gone — only its identifiers are returned.
 */
export type DeleteRecordResult = {
  uri: string;
  rkey: string;
};

// ---------------------------------------------------------------------------
// Input types
// ---------------------------------------------------------------------------

/**
 * Input for deleting a record from a multi-record collection.
 * Singleton records (key=literal:self) do not have a delete operation.
 */
export type DeleteRecordInput = {
  rkey: string;
};

/**
 * Create input for singleton records (key=literal:self).
 * No rkey field — the rkey is always a fixed constant ("self").
 */
export type SingletonCreateInput<TRecord> = WithFileInputs<RecordFields<TRecord>>;

/**
 * Create input for multi-record collections (key=any).
 * `rkey` is optional — when absent the PDS assigns a TID automatically.
 */
export type RecordCreateInput<TRecord> = WithFileInputs<RecordFields<TRecord>> & {
  rkey?: string;
};

/**
 * Update input for singleton records (key=literal:self).
 * No rkey field — there is exactly one record per repo.
 */
export type SingletonUpdateInput<TRecord> = {
  data: Partial<WithFileInputs<RecordFields<TRecord>>>;
  unset?: ReadonlyArray<keyof RecordFields<TRecord>>;
};

/**
 * Update input for multi-record collections (key=any).
 * `rkey` is required — it identifies which record to update.
 */
export type RecordUpdateInput<TRecord> = {
  rkey: string;
  data: Partial<WithFileInputs<RecordFields<TRecord>>>;
  unset?: ReadonlyArray<keyof RecordFields<TRecord>>;
};
