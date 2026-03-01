/**
 * AT Protocol identity resolution.
 *
 * Resolves an "actor" (either a DID like `did:plc:abc123` or a handle like
 * `gainforest.bsky.social`) to a canonical DID string, using the public
 * Bluesky AppView API: app.bsky.actor.getProfile
 *
 * Results are cached in-process with a 10-minute TTL to avoid hammering
 * the API when the same handle is queried repeatedly.
 */

const BSKY_API = "https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile";
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

interface CacheEntry {
  did: string;
  expiresAt: number;
}

// Simple in-process LRU-ish cache (bounded to 1000 entries)
const cache = new Map<string, CacheEntry>();
const CACHE_MAX = 1000;

function cacheSet(actor: string, did: string): void {
  if (cache.size >= CACHE_MAX) {
    // Evict the oldest entry
    const firstKey = cache.keys().next().value;
    if (firstKey !== undefined) cache.delete(firstKey);
  }
  cache.set(actor.toLowerCase(), { did, expiresAt: Date.now() + CACHE_TTL_MS });
}

function cacheGet(actor: string): string | null {
  const entry = cache.get(actor.toLowerCase());
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(actor.toLowerCase());
    return null;
  }
  return entry.did;
}

/**
 * Resolve an actor (DID or handle) to a DID.
 *
 * - If `actor` is already a DID (starts with "did:"), it is returned as-is
 *   after a profile fetch to confirm it exists (so we also cache the handle→DID
 *   mapping for future calls).
 * - If `actor` is a handle, we fetch the profile and extract the DID.
 *
 * Throws a descriptive error if the actor cannot be resolved.
 */
export async function resolveActorToDid(actor: string): Promise<string> {
  const normalized = actor.trim().toLowerCase();

  // Fast path: already a DID, no need to resolve
  if (normalized.startsWith("did:")) {
    return actor.trim();
  }

  // Check cache first
  const cached = cacheGet(normalized);
  if (cached) return cached;

  // Fetch from Bluesky AppView
  const url = `${BSKY_API}?actor=${encodeURIComponent(actor.trim())}`;
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { "Accept": "application/json" },
      // 5-second timeout via AbortController
      signal: AbortSignal.timeout(5000),
    });
  } catch (err) {
    throw new Error(
      `Failed to reach Bluesky API while resolving actor "${actor}": ${(err as Error).message}`
    );
  }

  if (res.status === 400 || res.status === 404) {
    throw new Error(`Actor not found: "${actor}"`);
  }
  if (!res.ok) {
    throw new Error(
      `Bluesky API returned ${res.status} while resolving actor "${actor}"`
    );
  }

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    throw new Error(`Invalid JSON from Bluesky API while resolving actor "${actor}"`);
  }

  const profile = body as Record<string, unknown>;
  const did = profile["did"];
  if (typeof did !== "string" || !did.startsWith("did:")) {
    throw new Error(`Unexpected profile shape from Bluesky API for actor "${actor}"`);
  }

  // Cache both the original input (normalized) and the handle from the profile
  cacheSet(normalized, did);
  const handle = profile["handle"];
  if (typeof handle === "string") {
    cacheSet(handle.toLowerCase(), did);
  }

  return did;
}

/**
 * Same as resolveActorToDid but returns null instead of throwing.
 * Useful when the caller wants to surface the error as a GraphQL field error
 * rather than a query-level error.
 */
export async function tryResolveActorToDid(actor: string): Promise<string | null> {
  try {
    return await resolveActorToDid(actor);
  } catch {
    return null;
  }
}
