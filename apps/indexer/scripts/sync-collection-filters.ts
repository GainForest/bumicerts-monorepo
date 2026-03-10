#!/usr/bin/env bun
/**
 * Syncs TAP_COLLECTION_FILTERS in .env and Railway env files with indexed collections.
 *
 * Updates:
 *   - .env (for local Docker development)
 *   - railway/tap.env.railway (for Railway deployment reference)
 *
 * Run this before `docker:up` or after adding new lexicons.
 *
 * Usage: bun run scripts/sync-collection-filters.ts
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { getCollectionFiltersString } from "../src/tap/collection-filters.ts";

const ROOT = join(import.meta.dir, "..");
const ENV_KEY = "TAP_COLLECTION_FILTERS";

const FILES_TO_UPDATE = [
  join(ROOT, ".env"),
  join(ROOT, "railway/tap.env.railway"),
];

function updateEnvFile(filePath: string, filters: string): boolean {
  if (!existsSync(filePath)) {
    console.log(`  Skipped: ${filePath} (not found)`);
    return false;
  }

  let content = readFileSync(filePath, "utf-8");
  const regex = new RegExp(`^${ENV_KEY}=.*$`, "m");
  const fileName = filePath.split("/").pop();

  if (regex.test(content)) {
    const oldValue = content.match(regex)?.[0];
    const newValue = `${ENV_KEY}=${filters}`;

    if (oldValue === newValue) {
      console.log(`  ${fileName}: already up to date`);
      return false;
    }

    content = content.replace(regex, newValue);
    writeFileSync(filePath, content);
    console.log(`  ${fileName}: updated`);
    return true;
  } else {
    // Add new value (append to end)
    content =
      content.trimEnd() +
      `\n\n# Auto-generated from INDEXED_COLLECTIONS (do not edit manually)\n${ENV_KEY}=${filters}\n`;
    writeFileSync(filePath, content);
    console.log(`  ${fileName}: added`);
    return true;
  }
}

function syncCollectionFilters(): void {
  const filters = getCollectionFiltersString();

  console.log(`\nDerived collection filters from INDEXED_COLLECTIONS:`);
  console.log(`  ${filters}\n`);

  console.log("Updating env files:");
  let updated = 0;

  for (const file of FILES_TO_UPDATE) {
    if (updateEnvFile(file, filters)) {
      updated++;
    }
  }

  console.log();
  if (updated > 0) {
    console.log(`✅ Updated ${updated} file(s)`);
    console.log(`\n⚠️  Remember to also update TAP_COLLECTION_FILTERS in Railway UI!`);
  } else {
    console.log("✅ All files are up to date");
  }
}

syncCollectionFilters();
