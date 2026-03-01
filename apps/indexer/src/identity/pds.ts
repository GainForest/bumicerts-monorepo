/**
 * PDS host resolution and caching.
 *
 * Resolves DID → PDS host (e.g. "https://climateai.org") using a two-tier cache:
 *   1. In-memory LRU cache (bounded to 1000 entries, configurable TTL)
 *   2. PostgreSQL pds_hosts table (permanent, no TTL)
 *   3. plc.directory HTTP lookup (last resort, up to 10 parallel)
 *
 * Falls back to FALLBACK_HOST on any error so URIs are never null.
 */

import { getPdsHostsFromDb, upsertPdsHosts } from "@/db/queries.ts";

const FALLBACK_HOST = "https://unknown.invalid";
const CONCURRENCY_LIMIT = 10;
const MAX_CACHE_SIZE = 1000;

// In-memory cache entry
interface CacheEntry { host: string; expiresAt: number; }

const memCache = new Map<string, CacheEntry>();

function getTtlMs(): number {
  const seconds = parseInt(process.env["PDS_HOST_CACHE_TTL_SECONDS"] ?? "3600", 10);
  return (isNaN(seconds) ? 3600 : seconds) * 1000;
}

function getFromMemCache(did: string): string | null {
  const entry = memCache.get(did);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { memCache.delete(did); return null; }
  return entry.host;
}

function setInMemCache(did: string, host: string): void {
  // Evict oldest entry if at capacity
  if (memCache.size >= MAX_CACHE_SIZE) {
    const firstKey = memCache.keys().next().value;
    if (firstKey !== undefined) memCache.delete(firstKey);
  }
  memCache.set(did, { host, expiresAt: Date.now() + getTtlMs() });
}

/**
 * Fetch PDS host from plc.directory for a single DID.
 * Returns FALLBACK_HOST on any error.
 */
async function fetchFromPlcDirectory(did: string): Promise<string> {
  try {
    const res = await fetch(`https://plc.directory/${encodeURIComponent(did)}`);
    if (!res.ok) return FALLBACK_HOST;
    const doc = await res.json() as { service?: Array<{ type: string; serviceEndpoint: string }> };
    const services = doc?.service ?? [];
    const pds = services.find((s) => s.type === "AtprotoPersonalDataServer");
    return pds?.serviceEndpoint ?? FALLBACK_HOST;
  } catch {
    return FALLBACK_HOST;
  }
}

/**
 * Get the PDS host for a single DID.
 * Order: memory cache → DB cache → plc.directory
 */
export async function getPdsHost(did: string): Promise<string> {
  // 1. Memory cache
  const cached = getFromMemCache(did);
  if (cached) return cached;

  // 2. DB cache
  const dbResult = await getPdsHostsFromDb([did]);
  if (dbResult.has(did)) {
    const host = dbResult.get(did)!;
    setInMemCache(did, host);
    return host;
  }

  // 3. plc.directory
  const host = await fetchFromPlcDirectory(did);
  setInMemCache(did, host);
  await upsertPdsHosts([{ did, host }]);
  return host;
}

/**
 * Batch-fetch PDS hosts for multiple DIDs.
 * Efficiently batches DB lookups and parallelizes plc.directory fetches
 * with a concurrency limit of CONCURRENCY_LIMIT.
 *
 * Call this at the top of a resolver to prime the cache before
 * calling getPdsHost() per-record.
 */
export async function getPdsHostsBatch(dids: string[]): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  const needDb: string[] = [];

  // 1. Memory cache pass
  for (const did of dids) {
    const cached = getFromMemCache(did);
    if (cached) result.set(did, cached);
    else needDb.push(did);
  }

  if (needDb.length === 0) return result;

  // 2. DB cache pass
  const dbResult = await getPdsHostsFromDb(needDb);
  const needFetch: string[] = [];

  for (const did of needDb) {
    if (dbResult.has(did)) {
      const host = dbResult.get(did)!;
      result.set(did, host);
      setInMemCache(did, host);
    } else {
      needFetch.push(did);
    }
  }

  if (needFetch.length === 0) return result;

  // 3. plc.directory pass (batched, up to CONCURRENCY_LIMIT parallel)
  const fetched: Array<{ did: string; host: string }> = [];

  for (let i = 0; i < needFetch.length; i += CONCURRENCY_LIMIT) {
    const batch = needFetch.slice(i, i + CONCURRENCY_LIMIT);
    const hosts = await Promise.all(batch.map((did) => fetchFromPlcDirectory(did)));
    for (let j = 0; j < batch.length; j++) {
      const did = batch[j]!;
      const host = hosts[j]!;
      result.set(did, host);
      setInMemCache(did, host);
      fetched.push({ did, host });
    }
  }

  // Persist newly fetched hosts to DB
  if (fetched.length > 0) await upsertPdsHosts(fetched);

  return result;
}
