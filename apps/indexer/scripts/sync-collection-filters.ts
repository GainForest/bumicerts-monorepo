#!/usr/bin/env bun
/**
 * Syncs TAP_COLLECTION_FILTERS and DISCOVERY_COLLECTIONS in env files
 * with the current set of indexed collections.
 *
 * Updates:
 *   - .env                        (local Docker development)
 *   - .env.example                (documentation / reference)
 *   - .env.railway                (indexer Railway service)
 *   - railway/tap.env.railway     (tap Railway service)
 *
 * Run this after adding new lexicons (or it runs automatically as part of
 * `bun run gen:indexer`, `bun run docker:up`, and `bun run docker:reset`).
 *
 * Usage: bun run scripts/sync-collection-filters.ts
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { getCollectionFiltersString } from "../src/tap/collection-filters.ts";
import { INDEXED_COLLECTIONS } from "../src/tap/collections.ts";

const ROOT = join(import.meta.dir, "..");

// ── Derived values ──────────────────────────────────────────────────────────

/** TAP_COLLECTION_FILTERS — wildcard namespace patterns for the Tap service */
const TAP_COLLECTION_FILTERS = getCollectionFiltersString();

/**
 * DISCOVERY_COLLECTIONS — all indexed collection NSIDs, comma-separated.
 * Used by the indexer on startup to discover all relevant DIDs via the relay.
 */
const DISCOVERY_COLLECTIONS = INDEXED_COLLECTIONS.join(",");

// ── Files and which keys to update ─────────────────────────────────────────

interface EnvUpdate {
  key: string;
  value: string;
}

interface FileSpec {
  path: string;
  updates: EnvUpdate[];
}

const FILES: FileSpec[] = [
  {
    path: join(ROOT, ".env"),
    updates: [
      { key: "TAP_COLLECTION_FILTERS", value: TAP_COLLECTION_FILTERS },
      { key: "DISCOVERY_COLLECTIONS",  value: DISCOVERY_COLLECTIONS  },
    ],
  },
  {
    path: join(ROOT, ".env.example"),
    updates: [
      { key: "TAP_COLLECTION_FILTERS", value: TAP_COLLECTION_FILTERS },
      { key: "DISCOVERY_COLLECTIONS",  value: DISCOVERY_COLLECTIONS  },
    ],
  },
  {
    path: join(ROOT, ".env.railway"),
    updates: [
      { key: "DISCOVERY_COLLECTIONS",  value: DISCOVERY_COLLECTIONS  },
    ],
  },
  {
    path: join(ROOT, "railway", "tap.env.railway"),
    updates: [
      { key: "TAP_COLLECTION_FILTERS", value: TAP_COLLECTION_FILTERS },
    ],
  },
];

// ── Helpers ─────────────────────────────────────────────────────────────────

function updateEnvKey(content: string, key: string, value: string): { content: string; changed: boolean } {
  const regex = new RegExp(`^${key}=.*$`, "m");
  const newLine = `${key}=${value}`;

  if (regex.test(content)) {
    const existing = content.match(regex)![0];
    if (existing === newLine) return { content, changed: false };
    return { content: content.replace(regex, newLine), changed: true };
  }

  // Key not found — append at end
  const appended =
    content.trimEnd() +
    `\n\n# Auto-generated from INDEXED_COLLECTIONS (do not edit manually)\n${newLine}\n`;
  return { content: appended, changed: true };
}

function syncFile(spec: FileSpec): number {
  if (!existsSync(spec.path)) {
    console.log(`  Skipped: ${spec.path} (not found)`);
    return 0;
  }

  let content = readFileSync(spec.path, "utf-8");
  const fileName = spec.path.split("/").pop()!;
  let changedCount = 0;

  for (const { key, value } of spec.updates) {
    const result = updateEnvKey(content, key, value);
    if (result.changed) {
      content = result.content;
      console.log(`  ${fileName}: updated ${key}`);
      changedCount++;
    } else {
      console.log(`  ${fileName}: ${key} already up to date`);
    }
  }

  if (changedCount > 0) {
    writeFileSync(spec.path, content);
  }

  return changedCount;
}

// ── Main ────────────────────────────────────────────────────────────────────

console.log("\n=== sync-collection-filters ===\n");
console.log(`TAP_COLLECTION_FILTERS  = ${TAP_COLLECTION_FILTERS}`);
console.log(`DISCOVERY_COLLECTIONS   = ${DISCOVERY_COLLECTIONS}`);
console.log("\nUpdating env files:");

let totalUpdated = 0;
for (const spec of FILES) {
  totalUpdated += syncFile(spec);
}

console.log();
if (totalUpdated > 0) {
  console.log(`✅ Updated ${totalUpdated} key(s) across env files`);
  console.log(`\n⚠️  Remember to also update TAP_COLLECTION_FILTERS, DISCOVERY_COLLECTIONS,`);
  console.log(`   and TAP_SIGNAL_COLLECTION in the Railway UI!`);
} else {
  console.log("✅ All env files are up to date");
}
