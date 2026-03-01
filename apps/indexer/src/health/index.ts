/**
 * Health check HTTP server.
 *
 * Runs on a separate port from the GraphQL API (default: 4001).
 * Used by load balancers, Docker HEALTHCHECK, and Kubernetes probes.
 *
 * Endpoints:
 *   GET /health  → 200 { status: "ok" }            (simple liveness probe)
 *   GET /stats   → 200 { indexer: {...}, tap: {...} } (detailed runtime stats)
 *   GET /ready   → 200 | 503                        (readiness probe)
 *   *            → 404 { error: "Not Found" }
 */

import type { TapSync } from "@/tap/index.ts";

const DEFAULT_PORT = 4001;

export function startHealthServer(tap: TapSync): void {
  const port = parseInt(process.env["HEALTH_PORT"] ?? "", 10) || DEFAULT_PORT;
  const tapUrl = process.env["TAP_URL"] ?? "http://localhost:2480";

  const server = Bun.serve({
    port,
    idleTimeout: 10,

    async fetch(req) {
      const url = new URL(req.url);

      // ---- GET /health ----
      // Simple liveness probe — returns 200 as long as the process is alive.
      if (url.pathname === "/health" && req.method === "GET") {
        return json({ status: "ok" });
      }

      // ---- GET /ready ----
      // Readiness probe — returns 503 if Tap hasn't started yet.
      if (url.pathname === "/ready" && req.method === "GET") {
        const stats = tap.getStats();
        const isReady = stats.status === "running";
        return json(
          { ready: isReady, status: stats.status },
          isReady ? 200 : 503
        );
      }

      // ---- GET /stats ----
      // Full runtime stats snapshot: indexer stats + Tap server stats.
      if (url.pathname === "/stats" && req.method === "GET") {
        const indexerStats = tap.getStats();
        const tapStats = await fetchTapStats(tapUrl);
        return json({ indexer: indexerStats, tap: tapStats });
      }

      return json({ error: "Not Found" }, 404);
    },

    error(err) {
      console.error("[health] Server error:", err);
      return json({ error: "Internal Server Error" }, 500);
    },
  });

  console.log(`[health] Listening on http://0.0.0.0:${server.port}`);
}

// ============================================================
// TAP STATS FETCHER
// ============================================================

async function fetchTapStats(tapUrl: string): Promise<Record<string, unknown>> {
  try {
    const [repoCount, recordCount, outboxBuffer] = await Promise.all([
      fetchStat(`${tapUrl}/stats/repo-count`),
      fetchStat(`${tapUrl}/stats/record-count`),
      fetchStat(`${tapUrl}/stats/outbox-buffer`),
    ]);
    return { repoCount, recordCount, outboxBuffer };
  } catch {
    return { error: "Tap stats unavailable" };
  }
}

async function fetchStat(url: string): Promise<unknown> {
  const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
  if (!res.ok) return null;
  return res.json();
}

// ============================================================
// HELPERS
// ============================================================

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
