/**
 * URL transformation helpers for photo URL fetching.
 *
 * Converts share / preview URLs from common cloud providers into
 * direct-download URLs that return raw image bytes when fetched.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Google Drive
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extracts a Google Drive file ID from various URL formats:
 *   - https://drive.google.com/file/d/{id}/view
 *   - https://drive.google.com/file/d/{id}/edit
 *   - https://drive.google.com/open?id={id}
 *   - https://drive.google.com/uc?id={id}&export=download
 */
function extractGoogleDriveFileId(url: string): string | null {
  // /file/d/{id}/ pattern
  const filePattern = /\/file\/d\/([a-zA-Z0-9_-]+)/;
  const fileMatch = url.match(filePattern);
  if (fileMatch?.[1]) {
    return fileMatch[1];
  }

  // ?id={id} query parameter pattern
  try {
    const parsed = new URL(url);
    const idParam = parsed.searchParams.get("id");
    if (idParam) {
      return idParam;
    }
  } catch {
    // Not a valid URL — fall through
  }

  return null;
}

function transformGoogleDriveUrl(url: string): string | null {
  const fileId = extractGoogleDriveFileId(url);
  if (!fileId) {
    return null;
  }

  return `https://drive.google.com/uc?export=download&id=${fileId}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Dropbox
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Converts Dropbox share links to direct download by setting dl=1.
 *   - https://www.dropbox.com/s/{id}/{name}?dl=0  → ?dl=1
 *   - https://www.dropbox.com/scl/fi/{id}/{name}?dl=0  → ?dl=1
 */
function transformDropboxUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (
      !parsed.hostname.includes("dropbox.com") &&
      !parsed.hostname.includes("dl.dropboxusercontent.com")
    ) {
      return null;
    }

    parsed.searchParams.set("dl", "1");
    return parsed.toString();
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Transforms a photo URL from common cloud providers into a direct-download
 * URL. If the URL is not from a known provider (or is already a direct link),
 * it is returned unchanged.
 *
 * Supported transformations:
 *   - Google Drive share/preview links → direct download
 *   - Dropbox share links (dl=0 → dl=1)
 *   - KoboToolbox attachment links → passed through as-is
 *   - All other URLs → returned unchanged
 */
export function transformPhotoUrl(url: string): string {
  const trimmed = url.trim();

  // Google Drive
  if (
    trimmed.includes("drive.google.com") ||
    trimmed.includes("docs.google.com")
  ) {
    const transformed = transformGoogleDriveUrl(trimmed);
    if (transformed) {
      return transformed;
    }
  }

  // Dropbox
  if (trimmed.includes("dropbox.com")) {
    const transformed = transformDropboxUrl(trimmed);
    if (transformed) {
      return transformed;
    }
  }

  // Everything else (KoboToolbox, direct URLs, etc.) — return as-is
  return trimmed;
}

/**
 * Extracts a reasonable filename from a URL path.
 * Falls back to "photo.jpg" if no filename can be determined.
 */
export function extractFileName(url: string): string {
  try {
    const parsed = new URL(url);
    const pathSegments = parsed.pathname.split("/").filter(Boolean);
    const lastSegment = pathSegments[pathSegments.length - 1];

    if (lastSegment && /\.\w{2,5}$/.test(lastSegment)) {
      return decodeURIComponent(lastSegment);
    }
  } catch {
    // Not a valid URL
  }

  return "photo.jpg";
}
