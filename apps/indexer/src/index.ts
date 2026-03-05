/**
 * GainForest AT Protocol Indexer
 *
 * Connects to a Tap relay and indexes records matching GainForest
 * lexicons into PostgreSQL, then serves them via a GraphQL API.
 *
 * Start:  bun run src/index.ts
 * Dev:    bun run dev
 */

import { TapSync } from "@/tap/index.ts";
import { startHealthServer } from "@/health/index.ts";
import { startGraphQLServer } from "@/graphql/server.ts";
import { setTapContext } from "@/graphql/tap-context.ts";
import { runMigration } from "@/db/migrate.ts";

// ============================================================
// BOOT
// ============================================================

// Run DB migration on every startup — all statements are IF NOT EXISTS
// so this is idempotent and safe to run repeatedly.
await runMigration();

const tap = new TapSync();

// Expose TapSync to the GraphQL layer (for addRepos/removeRepos mutations)
setTapContext(tap);

// Start health server immediately — before DB connections — so probes
// can distinguish "starting" from "dead" during slow boot.
startHealthServer(tap);

// Start GraphQL API server
startGraphQLServer();

// ============================================================
// GRACEFUL SHUTDOWN
// ============================================================

let isShuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`\n[main] Received ${signal}, shutting down gracefully...`);

  try {
    await tap.stop();
  } catch (err) {
    console.error("[main] Error during shutdown:", err);
  }

  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

// Catch unhandled promise rejections — log and continue rather than crash
process.on("unhandledRejection", (reason) => {
  console.error("[main] Unhandled rejection:", reason);
});

// ============================================================
// START
// ============================================================

await tap.start();
