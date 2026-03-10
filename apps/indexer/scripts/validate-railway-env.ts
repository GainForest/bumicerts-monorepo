#!/usr/bin/env bun
/**
 * Validates that Railway env files contain all required variables.
 *
 * Compares .env.example with .env.railway and reports any missing variables.
 * Run this before deploying to Railway to catch missing env vars.
 *
 * Usage: bun run scripts/validate-railway-env.ts
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";

const ROOT = join(import.meta.dir, "..");

interface EnvVar {
  name: string;
  value: string;
  isComment: boolean;
}

function parseEnvFile(path: string): Map<string, string> {
  if (!existsSync(path)) {
    console.error(`File not found: ${path}`);
    process.exit(1);
  }

  const content = readFileSync(path, "utf-8");
  const vars = new Map<string, string>();

  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    // Skip comments and empty lines
    if (!trimmed || trimmed.startsWith("#")) continue;

    const match = trimmed.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (match && match[1] && match[2] !== undefined) {
      vars.set(match[1], match[2]);
    }
  }

  return vars;
}

async function validateRailwayEnv(): Promise<void> {
  console.log("Validating Railway environment files...\n");

  const exampleVars = parseEnvFile(join(ROOT, ".env.example"));
  const railwayVars = parseEnvFile(join(ROOT, ".env.railway"));

  // Variables that are expected to be different in Railway
  const railwaySpecific = new Set([
    "DATABASE_URL", // Uses ${{Postgres.DATABASE_URL}}
    "TAP_URL", // Uses ${{tap.RAILWAY_PRIVATE_DOMAIN}}
    "TAP_ADMIN_PASSWORD", // Uses ${{tap.TAP_ADMIN_PASSWORD}}
  ]);

  // Variables that don't apply to Railway (local dev only)
  const localOnly = new Set([
    "TAP_COLLECTION_FILTERS", // Set on Tap service, not indexer
  ]);

  // Optional variables that have defaults (don't report as missing)
  const optional = new Set([
    "SEED_DIDS", // Empty by default
    "SEED_PDSS", // Empty by default
    "BLOCKED_DIDS", // Empty by default
    "LOG_VALIDATION_FILTER", // Empty by default
  ]);

  const missing: string[] = [];
  const extra: string[] = [];

  // Check for missing variables
  for (const [name] of exampleVars) {
    if (localOnly.has(name)) continue;
    if (optional.has(name)) continue;
    if (!railwayVars.has(name) && !railwaySpecific.has(name)) {
      missing.push(name);
    }
  }

  // Check for extra variables (not necessarily bad, but worth noting)
  for (const [name] of railwayVars) {
    if (!exampleVars.has(name) && !railwaySpecific.has(name)) {
      extra.push(name);
    }
  }

  // Report results
  if (missing.length === 0 && extra.length === 0) {
    console.log("✅ Railway env file is in sync with .env.example\n");
  } else {
    if (missing.length > 0) {
      console.log("❌ Missing from .env.railway:");
      for (const name of missing) {
        console.log(`   - ${name}`);
      }
      console.log();
    }

    if (extra.length > 0) {
      console.log("⚠️  Extra variables in .env.railway (may be intentional):");
      for (const name of extra) {
        console.log(`   - ${name}`);
      }
      console.log();
    }
  }

  // Also check TAP_COLLECTION_FILTERS in tap.env.railway
  const tapEnvPath = join(ROOT, "railway/tap.env.railway");
  if (existsSync(tapEnvPath)) {
    const tapVars = parseEnvFile(tapEnvPath);

    if (!tapVars.has("TAP_COLLECTION_FILTERS")) {
      console.log("❌ TAP_COLLECTION_FILTERS missing from railway/tap.env.railway");
    } else {
      // Check if it matches current collections
      const { getCollectionFiltersString } = await import("../src/tap/collection-filters.ts");
      const expected = getCollectionFiltersString();
      const actual = tapVars.get("TAP_COLLECTION_FILTERS");

      if (actual !== expected) {
        console.log("⚠️  TAP_COLLECTION_FILTERS in tap.env.railway is outdated:");
        console.log(`   Current: ${actual}`);
        console.log(`   Expected: ${expected}`);
        console.log(`   Run: bun run sync:filters to update\n`);
      } else {
        console.log("✅ TAP_COLLECTION_FILTERS is up to date\n");
      }
    }
  }

  if (missing.length > 0) {
    process.exit(1);
  }
}

validateRailwayEnv();
