export const BUMICERT_COVER_IMAGE_MAX_SIZE_BYTES = 4 * 1024 * 1024;
export const BUMICERT_COVER_IMAGE_MAX_SIZE_MB =
  BUMICERT_COVER_IMAGE_MAX_SIZE_BYTES / (1024 * 1024);

export const BUMICERT_COVER_IMAGE_SUPPORTED_TYPES = [
  "image/jpg",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
