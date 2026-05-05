export class AccountIndexerReadError extends Error {
  readonly operation: string;

  constructor(options: { operation: string; message: string; cause?: unknown }) {
    super(options.message);
    this.name = "AccountIndexerReadError";
    this.operation = options.operation;
    if (options.cause !== undefined) {
      this.cause = options.cause;
    }
  }
}

export class AccountRecordValidationError extends Error {
  readonly did: string;
  readonly collection: string;
  readonly rkey: string;

  constructor(options: {
    did: string;
    collection: string;
    rkey: string;
    cause?: unknown;
  }) {
    super(
      `Record ${options.collection}/${options.rkey} for ${options.did} failed lexicon validation`,
    );
    this.name = "AccountRecordValidationError";
    this.did = options.did;
    this.collection = options.collection;
    this.rkey = options.rkey;
    if (options.cause !== undefined) {
      this.cause = options.cause;
    }
  }
}
