import JSZip from "jszip";
import type { SerializableFile } from "@/lib/mutations-utils";

export type KoboMediaZipEntry = {
  entryPath: string;
  fileName: string;
  normalizedFileName: string;
  submissionUuid: string;
  mimeType: string;
};

export type KoboMediaZipIndex = {
  fileName: string;
  entries: KoboMediaZipEntry[];
  submissionCount: number;
};

export type KoboMediaZipArchive = JSZip;

const IMAGE_MIME_BY_EXTENSION = new Map<string, string>([
  ["jpg", "image/jpeg"],
  ["jpeg", "image/jpeg"],
  ["png", "image/png"],
  ["webp", "image/webp"],
  ["heic", "image/heic"],
]);

const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

function normalizeFileName(fileName: string): string {
  return fileName.trim().toLowerCase();
}

function getPathSegments(path: string): string[] {
  return path.split("/").filter((segment) => segment.length > 0);
}

function getFileNameFromPath(path: string): string | null {
  const segments = getPathSegments(path);
  const fileName = segments[segments.length - 1];
  return fileName && fileName.length > 0 ? fileName : null;
}

function getSubmissionUuidFromPath(path: string): string | null {
  const segments = getPathSegments(path);
  const parentDirectoryIndex = segments.length - 2;

  if (parentDirectoryIndex < 1) {
    return null;
  }

  const hasAttachmentsAncestor = segments.some(
    (segment, index) =>
      index < parentDirectoryIndex && segment.toLowerCase() === "attachments",
  );

  if (!hasAttachmentsAncestor) {
    return null;
  }

  const submissionUuid = segments[parentDirectoryIndex];
  return submissionUuid && submissionUuid.length > 0
    ? normalizeSubmissionUuid(submissionUuid)
    : null;
}

function normalizeSubmissionUuid(value: string): string {
  return value.trim().replace(/^uuid:/i, "").toLowerCase();
}

export function getImageMimeTypeFromFileName(fileName: string): string {
  const extension = fileName.split(".").pop()?.toLowerCase();
  if (!extension) {
    return "application/octet-stream";
  }

  return IMAGE_MIME_BY_EXTENSION.get(extension) ?? "application/octet-stream";
}

export function isAcceptedKoboMediaImage(fileName: string): boolean {
  return IMAGE_MIME_BY_EXTENSION.has(
    fileName.split(".").pop()?.toLowerCase() ?? "",
  );
}

export async function loadKoboMediaZipArchive(
  file: File,
): Promise<KoboMediaZipArchive> {
  const buffer = await file.arrayBuffer();
  return JSZip.loadAsync(buffer);
}

export async function buildKoboMediaZipIndex(
  file: File,
): Promise<KoboMediaZipIndex> {
  const archive = await loadKoboMediaZipArchive(file);
  const entries: KoboMediaZipEntry[] = [];
  const submissionUuids = new Set<string>();

  archive.forEach((entryPath, entry) => {
    if (entry.dir) {
      return;
    }

    const fileName = getFileNameFromPath(entryPath);
    const submissionUuid = getSubmissionUuidFromPath(entryPath);

    if (!fileName || !submissionUuid || !isAcceptedKoboMediaImage(fileName)) {
      return;
    }

    submissionUuids.add(submissionUuid);
    entries.push({
      entryPath,
      fileName,
      normalizedFileName: normalizeFileName(fileName),
      submissionUuid,
      mimeType: getImageMimeTypeFromFileName(fileName),
    });
  });

  return {
    fileName: file.name,
    entries,
    submissionCount: submissionUuids.size,
  };
}

export function getKoboSubmissionUuid(
  row: Record<string, string>,
): string | null {
  const candidates = [row._uuid, row["meta/rootUuid"]];

  for (const candidate of candidates) {
    const normalized = candidate ? normalizeSubmissionUuid(candidate) : "";
    if (normalized.length > 0) {
      return normalized;
    }
  }

  return null;
}

export function resolveKoboMediaZipEntry(
  index: KoboMediaZipIndex,
  row: Record<string, string>,
  fileName: string,
): KoboMediaZipEntry | null {
  const submissionUuid = getKoboSubmissionUuid(row);
  if (!submissionUuid) {
    return null;
  }

  const normalizedFileName = normalizeFileName(fileName);
  return (
    index.entries.find(
      (entry) =>
        entry.submissionUuid === submissionUuid &&
        entry.normalizedFileName === normalizedFileName,
    ) ?? null
  );
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let index = 0; index < bytes.byteLength; index += 1) {
    binary += String.fromCharCode(bytes[index] ?? 0);
  }

  return btoa(binary);
}

export async function readKoboMediaZipEntryAsSerializableFile({
  archive,
  entryPath,
  fileName,
  mimeType,
}: {
  archive: KoboMediaZipArchive;
  entryPath: string;
  fileName: string;
  mimeType: string;
}): Promise<SerializableFile> {
  const entry = archive.file(entryPath);
  if (!entry) {
    throw new Error(`Kobo media attachment not found in ZIP: ${entryPath}`);
  }

  const bytes = await entry.async("uint8array");
  if (bytes.byteLength === 0) {
    throw new Error(`Kobo media attachment is empty: ${fileName}`);
  }

  if (bytes.byteLength > MAX_IMAGE_BYTES) {
    const sizeMb = (bytes.byteLength / (1024 * 1024)).toFixed(1);
    throw new Error(
      `Kobo media attachment is too large: ${sizeMb} MB. Maximum is 3 MB.`,
    );
  }

  return {
    $file: true,
    name: fileName,
    type: mimeType,
    size: bytes.byteLength,
    data: toBase64(bytes),
  };
}
