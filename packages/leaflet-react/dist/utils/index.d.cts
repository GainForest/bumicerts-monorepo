/**
 * Extracts a CID string from a blob reference, handling both:
 * - Raw JSON wire format returned by public PDS API:
 *   `{ $type: "blob", ref: { $link: "bafkrei..." }, mimeType: "...", size: N }`
 * - BlobRef class instances from `@atproto/api` Agent:
 *   `{ ref: <CID object with .toString()> }`
 * - Objects with a direct `cid` string property (internal use)
 *
 * Returns `null` if the CID cannot be extracted.
 */
declare function extractCid(image: unknown): string | null;
/**
 * Build the URL used to fetch a blob from an ATProto PDS.
 *
 * @param pdsUrl  - Base URL of the PDS, e.g. `"https://bsky.social"`
 * @param did     - DID of the repo that owns the blob
 * @param cid     - CID of the blob
 */
declare function buildBlobUrl(pdsUrl: string, did: string, cid: string): string;
/**
 * Extract the best available image URL from a blob reference.
 *
 * Handles three cases in priority order:
 * 1. Indexer-resolved blob: `{ uri: "https://pds.example/xrpc/..." }` — use directly
 * 2. Raw CID: call `resolveImageUrl(cid)` to build the URL
 * 3. No useful data: return `null`
 *
 * This allows the same renderer to work with both indexer-returned data
 * (where blobs have a pre-resolved `uri`) and raw PDS data (where you need to
 * build the URL yourself via `resolveImageUrl`).
 */
declare function extractBlobImageUrl(image: unknown, resolveImageUrl: (cid: string) => string): string | null;

/**
 * Convert any YouTube URL variant to an embeddable `youtube-nocookie.com` URL.
 *
 * Handles:
 * - `https://www.youtube.com/watch?v=VIDEO_ID`
 * - `https://youtu.be/VIDEO_ID`
 * - `https://www.youtube.com/embed/VIDEO_ID`
 * - `https://www.youtube-nocookie.com/embed/VIDEO_ID`
 * - `https://www.youtube.com/shorts/VIDEO_ID`
 *
 * Returns `null` if the URL is not a YouTube URL or the ID cannot be extracted.
 */
declare function toYouTubeEmbedUrl(url: string): string | null;
/**
 * Extract the raw YouTube video ID from any supported YouTube URL format.
 * Returns `null` if the URL is not a YouTube URL or the ID cannot be extracted.
 */
declare function extractYouTubeVideoId(url: string): string | null;

export { buildBlobUrl, extractBlobImageUrl, extractCid, extractYouTubeVideoId, toYouTubeEmbedUrl };
