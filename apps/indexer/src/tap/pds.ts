/**
 * PDS repo crawler.
 *
 * Uses com.atproto.sync.listRepos to enumerate all active DIDs
 * hosted on one or more PDS instances. Results are used as seed
 * DIDs for Tap backfill on startup.
 */

const LIST_REPOS_LIMIT = 500; // max allowed by the AT Protocol spec

interface ListReposResponse {
  repos: Array<{ did: string; active?: boolean }>;
  cursor?: string;
}

/**
 * Fetch all active DIDs from a single PDS via com.atproto.sync.listRepos.
 * Paginates automatically until all repos are retrieved.
 */
export async function listReposForPds(pdsHost: string): Promise<string[]> {
  // Normalise: strip trailing slash, ensure no path suffix
  const base = pdsHost.replace(/\/+$/, "");
  const url = `${base}/xrpc/com.atproto.sync.listRepos`;

  const dids: string[] = [];
  let cursor: string | undefined;
  let page = 0;

  console.log(`  [pds] Crawling ${base}...`);

  do {
    const params = new URLSearchParams({ limit: String(LIST_REPOS_LIMIT) });
    if (cursor) params.set("cursor", cursor);

    const res = await fetch(`${url}?${params}`, {
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      throw new Error(
        `listRepos failed for ${base}: HTTP ${res.status} ${res.statusText}`
      );
    }

    const body = (await res.json()) as ListReposResponse;
    const active = (body.repos ?? [])
      .filter((r) => r.active !== false)
      .map((r) => r.did);

    dids.push(...active);
    cursor = body.cursor;
    page++;

    console.log(
      `  [pds]   page ${page}: ${active.length} active repos (total so far: ${dids.length})`
    );
  } while (cursor);

  console.log(`  [pds] ${base} — done. ${dids.length} active DIDs found.`);
  return dids;
}

/**
 * Crawl multiple PDS hosts in parallel and return a deduplicated list of DIDs.
 */
export async function listReposForPdsList(pdsHosts: string[]): Promise<string[]> {
  if (pdsHosts.length === 0) return [];

  const results = await Promise.allSettled(
    pdsHosts.map((host) => listReposForPds(host))
  );

  const allDids = new Set<string>();

  for (let i = 0; i < results.length; i++) {
    const result = results[i]!;
    if (result.status === "fulfilled") {
      result.value.forEach((did) => allDids.add(did));
    } else {
      console.error(
        `  [pds] Failed to crawl ${pdsHosts[i]}: ${result.reason}`
      );
    }
  }

  return Array.from(allDids);
}
