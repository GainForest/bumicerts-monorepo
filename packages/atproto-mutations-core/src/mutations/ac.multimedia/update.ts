import { Effect } from "effect";
import { extractValidationIssues } from "../../validation";
import type { ValidationIssue } from "../../result";
import { $parse } from "@gainforest/generated/app/gainforest/ac/multimedia.defs";
import { AtprotoAgent } from "../../services/AtprotoAgent";
import { BlobUploadError, FileConstraintError } from "../../blob/errors";
import {
  fromSerializableFile,
  isAnyBlobRef,
  normalizeBlobRef,
} from "../../blob/types";
import { applyPatch, fetchRecord, putRecord } from "../../utils/shared";
import {
  AcMultimediaValidationError,
  AcMultimediaNotFoundError,
  AcMultimediaPdsError,
} from "./utils/errors";
import type {
  AcMultimediaMutationResult,
  AcMultimediaRecord,
  UpdateAcMultimediaInput,
} from "./utils/types";

const COLLECTION = "app.gainforest.ac.multimedia";
const MAX_IMAGE_BYTES = 100 * 1024 * 1024;
const REQUIRED_FIELDS = new Set<string>(["subjectPart", "file"]);

const ACCEPTED_IMAGE_MIMES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "image/tiff",
  "image/tif",
  "image/gif",
  "image/bmp",
  "image/svg+xml",
]);

const makePdsError = (message: string, cause: unknown) =>
  new AcMultimediaPdsError({ message, cause });

const makeValidationError = (message: string, cause: unknown, issues?: ValidationIssue[]) =>
  new AcMultimediaValidationError({ message, cause, issues });

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseExistingAcMultimediaRecord(value: unknown): AcMultimediaRecord {
  if (!isRecord(value)) {
    return $parse(value);
  }

  return $parse({
    ...value,
    file: normalizeBlobRef(value["file"]),
  });
}

export const updateAcMultimedia = (
  input: UpdateAcMultimediaInput
): Effect.Effect<
  AcMultimediaMutationResult,
  | AcMultimediaValidationError
  | AcMultimediaNotFoundError
  | AcMultimediaPdsError
  | FileConstraintError
  | BlobUploadError,
  AtprotoAgent
> =>
  Effect.gen(function* () {
    const { rkey, data, unset, newImageFile } = input;
    let normalizedMimeType: string | undefined;

    if (newImageFile) {
      if (newImageFile.size > MAX_IMAGE_BYTES) {
        return yield* Effect.fail(
          new FileConstraintError({
            path: ["newImageFile"],
            reason: `Image file size ${newImageFile.size} B exceeds maximum ${MAX_IMAGE_BYTES} B (100 MB)`,
          })
        );
      }
      if (!ACCEPTED_IMAGE_MIMES.has(newImageFile.type)) {
        return yield* Effect.fail(
          new FileConstraintError({
            path: ["newImageFile"],
            reason: `MIME type "${newImageFile.type}" is not accepted for ac.multimedia; allowed: ${[
              ...ACCEPTED_IMAGE_MIMES,
            ].join(", ")}`,
          })
        );
      }
    }

    const existing = yield* fetchRecord(
      COLLECTION,
      rkey,
      parseExistingAcMultimediaRecord,
      makePdsError
    );

    if (existing === null) {
      return yield* Effect.fail(new AcMultimediaNotFoundError({ rkey }));
    }

    let file: unknown;

    if (newImageFile) {
      const agent = yield* AtprotoAgent;
      const fileBytes = fromSerializableFile(newImageFile);
      const uploadResult = yield* Effect.tryPromise({
        try: () => agent.uploadBlob(fileBytes, { encoding: newImageFile.type }),
        catch: (cause) =>
          new BlobUploadError({
            message: "Failed to upload multimedia blob",
            cause,
          }),
      });
      const raw = uploadResult.data.blob as {
        ref: unknown;
        mimeType: string;
        size: number;
      };
      normalizedMimeType = raw.mimeType;
      file = {
        $type: "blob" as const,
        ref: raw.ref,
        mimeType: raw.mimeType,
        size: raw.size,
      };
    } else {
      file = isAnyBlobRef(existing.file)
        ? normalizeBlobRef(existing.file)
        : existing.file;
    }

    const merged = applyPatch(
      existing,
      data as Partial<AcMultimediaRecord>,
      unset as readonly string[] | undefined,
      REQUIRED_FIELDS
    );

    const candidate = {
      ...merged,
      $type: COLLECTION,
      createdAt: existing.createdAt,
      file,
      format:
        data.format !== undefined
          ? data.format
          : normalizedMimeType !== undefined
            ? normalizedMimeType
            : merged.format,
    };

    const record = yield* Effect.try({
      try: () => $parse(candidate),
      catch: (cause) => { const issues = extractValidationIssues(cause); return makeValidationError("Validation failed", cause, issues); },
    });

    const { uri, cid } = yield* putRecord(COLLECTION, rkey, record, makePdsError);

    return {
      uri,
      cid,
      rkey,
      record: record as AcMultimediaRecord,
    } satisfies AcMultimediaMutationResult;
  });

export {
  AcMultimediaValidationError,
  AcMultimediaNotFoundError,
  AcMultimediaPdsError,
  FileConstraintError,
  BlobUploadError,
};
