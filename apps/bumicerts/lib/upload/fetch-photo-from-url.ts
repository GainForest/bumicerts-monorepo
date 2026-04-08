"use server";

/**
 * Server action: fetch an image from a URL and create a multimedia record.
 *
 * This runs entirely server-side so the image bytes never cross the client
 * boundary. The flow is:
 *   1. Transform the URL (Google Drive share → direct download, etc.)
 *   2. Fetch the image with a timeout
 *   3. Validate content type + size
 *   4. Convert to SerializableFile (base64)
 *   5. Delegate to the package's ac.multimedia.create via the server caller
 */

import { getServerCaller } from "@/lib/trpc/server";
import { transformPhotoUrl, extractFileName } from "./url-transforms";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const MAX_IMAGE_BYTES = 4.5 * 1024 * 1024; // 4.5 MB raw bytes
const FETCH_TIMEOUT_MS = 30_000; // 30 seconds per image

const ACCEPTED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
]);

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type FetchPhotoInput = {
  url: string;
  occurrenceRef: string;
  subjectPart: string;
  caption?: string;
};

type FetchPhotoResult = {
  uri: string;
  rkey: string;
  cid: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Server action
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchPhotoFromUrl(
  input: FetchPhotoInput
): Promise<FetchPhotoResult> {
  const caller = await getServerCaller();

  // 1. Transform URL for known providers (Google Drive, Dropbox, etc.)
  const directUrl = transformPhotoUrl(input.url);

  // 2. Fetch image with timeout
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(directUrl, {
      signal: controller.signal,
      redirect: "follow",
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch image: HTTP ${response.status} ${response.statusText}`
      );
    }

    // 3. Validate content type
    const rawContentType = response.headers.get("content-type") ?? "";
    const contentType = rawContentType.split(";")[0]?.trim() ?? "";

    if (!ACCEPTED_MIME_TYPES.has(contentType)) {
      throw new Error(
        `Unsupported image type: ${contentType || "(unknown)"}. Expected JPEG, PNG, WebP, or HEIC.`
      );
    }

    // 4. Read bytes + validate size
    const arrayBuffer = await response.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    if (bytes.length > MAX_IMAGE_BYTES) {
      const sizeMb = (bytes.length / (1024 * 1024)).toFixed(1);
      throw new Error(
        `Image too large: ${sizeMb} MB. Maximum is 4.5 MB.`
      );
    }

    if (bytes.length === 0) {
      throw new Error("Fetched image is empty (0 bytes).");
    }

    // 5. Convert to SerializableFile (base64)
    const base64 = Buffer.from(bytes).toString("base64");
    const fileName = extractFileName(directUrl);

    // 6. Create multimedia record via the package mutation
    const result = await caller.ac.multimedia.create({
      imageFile: {
        $file: true as const,
        name: fileName,
        type: contentType,
        size: bytes.length,
        data: base64,
      },
      occurrenceRef: input.occurrenceRef,
      subjectPart: input.subjectPart,
      caption: input.caption,
      format: contentType,
    });

    return {
      uri: result.uri,
      rkey: result.rkey,
      cid: result.cid,
    };
  } finally {
    clearTimeout(timeout);
  }
}
