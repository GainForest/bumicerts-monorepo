import { Effect } from "effect";
import { $parse } from "@gainforest/generated/app/gainforest/ac/multimedia.defs";
import { AtprotoAgent } from "../../services/AtprotoAgent";
import { BlobUploadError, FileConstraintError } from "../../blob/errors";
import { fromSerializableFile } from "../../blob/types";
import { createRecord } from "../../utils/shared";
import {
  AcMultimediaValidationError,
  AcMultimediaPdsError,
} from "./utils/errors";
import type {
  CreateAcMultimediaInput,
  AcMultimediaMutationResult,
  AcMultimediaRecord,
} from "./utils/types";

const COLLECTION = "app.gainforest.ac.multimedia";
const MAX_IMAGE_BYTES = 100 * 1024 * 1024; // 100 MB

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

const makeValidationError = (message: string, cause: unknown) =>
  new AcMultimediaValidationError({ message, cause });

export const createAcMultimedia = (
  input: CreateAcMultimediaInput
): Effect.Effect<
  AcMultimediaMutationResult,
  | AcMultimediaValidationError
  | AcMultimediaPdsError
  | FileConstraintError
  | BlobUploadError,
  AtprotoAgent
> =>
  Effect.gen(function* () {
    const {
      imageFile,
      occurrenceRef,
      siteRef,
      subjectPart,
      subjectPartUri,
      subjectOrientation,
      caption,
      creator,
      createDate,
      format,
      accessUri,
      variantLiteral,
      rkey,
    } = input;

    // 1. Validate file size and MIME type.
    if (imageFile.size > MAX_IMAGE_BYTES) {
      return yield* Effect.fail(
        new FileConstraintError({
          path: ["imageFile"],
          reason: `Image file size ${imageFile.size} B exceeds maximum ${MAX_IMAGE_BYTES} B (100 MB)`,
        })
      );
    }
    if (!ACCEPTED_IMAGE_MIMES.has(imageFile.type)) {
      return yield* Effect.fail(
        new FileConstraintError({
          path: ["imageFile"],
          reason: `MIME type "${imageFile.type}" is not accepted for ac.multimedia; allowed: ${[...ACCEPTED_IMAGE_MIMES].join(", ")}`,
        })
      );
    }

    // 2. Upload the image blob.
    const agent = yield* AtprotoAgent;
    const fileBytes = fromSerializableFile(imageFile);
    const uploadResult = yield* Effect.tryPromise({
      try: () => agent.uploadBlob(fileBytes, { encoding: imageFile.type }),
      catch: (cause) => new BlobUploadError({ message: "Failed to upload image blob", cause }),
    });
    // Use raw.mimeType from the PDS response — the PDS may normalize on upload.
    // The stored blobRef must use the normalized mimeType so the PDS accepts the record write.
    const raw = uploadResult.data.blob as { ref: unknown; mimeType: string; size: number };
    const blobRef = { $type: "blob" as const, ref: raw.ref, mimeType: raw.mimeType, size: raw.size };

    // 3. Build and validate the record.
    const createdAt = new Date().toISOString();
    const candidate = {
      $type: COLLECTION,
      file: blobRef,
      subjectPart,
      format: format ?? imageFile.type,
      createdAt,
      ...(occurrenceRef !== undefined && { occurrenceRef }),
      ...(siteRef !== undefined && { siteRef }),
      ...(subjectPartUri !== undefined && { subjectPartUri }),
      ...(subjectOrientation !== undefined && { subjectOrientation }),
      ...(caption !== undefined && { caption }),
      ...(creator !== undefined && { creator }),
      ...(createDate !== undefined && { createDate }),
      ...(accessUri !== undefined && { accessUri }),
      ...(variantLiteral !== undefined && { variantLiteral }),
    };

    const record = yield* Effect.try({
      try: () => $parse(candidate),
      catch: (cause) => makeValidationError(`ac.multimedia record failed lexicon validation: ${String(cause)}`, cause),
    });

    // 4. Write to PDS.
    const { uri, cid } = yield* createRecord(COLLECTION, record, rkey, makePdsError);
    const assignedRkey = uri.split("/").pop() ?? rkey ?? "unknown";

    return {
      uri,
      cid,
      rkey: assignedRkey,
      record: record as AcMultimediaRecord,
    } satisfies AcMultimediaMutationResult;
  });

export { AcMultimediaValidationError, AcMultimediaPdsError, FileConstraintError, BlobUploadError };
