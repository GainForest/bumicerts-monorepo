#!/usr/bin/env bun
/**
 * Database migration runner.
 * Reads schema.sql and applies it to the configured PostgreSQL database.
 * Safe to run multiple times — all statements use IF NOT EXISTS.
 *
 * Usage:
 *   bun run db:migrate          (standalone)
 *   import { runMigration }     (called from index.ts on startup)
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { sql, closeDb } from "./index.ts";

const SCHEMA_PATH = join(import.meta.dirname, "schema.sql");

export async function runMigration(): Promise<void> {
  console.log("\n=== GainForest Indexer — DB Migration ===\n");
  console.log(`Schema file: ${SCHEMA_PATH}`);
  console.log(`Database:    ${process.env.DATABASE_URL?.replace(/:\/\/.*@/, "://<credentials>@")}\n`);

  const schema = readFileSync(SCHEMA_PATH, "utf-8");

  // Run the entire schema file as a single query so that forward-references
  // (e.g. indexes referencing the table defined earlier in the same file)
  // are resolved correctly within one transaction.
  console.log("Applying schema...");
  await sql.unsafe(schema);

  // ── Data migrations (idempotent) ─────────────────────────────────────────
  await fixDoubleEncodedRecords();

  console.log("\nMigration complete — all tables and indexes are up to date.\n");
}

/**
 * Fix double-encoded JSONB records.
 *
 * Some records were accidentally stored with their `record` column as a JSON
 * string (e.g., '"{\"title\":...}"') instead of a proper JSONB object.
 * This migration finds and fixes those records.
 *
 * Idempotent: safe to run on every startup.
 */
async function fixDoubleEncodedRecords(): Promise<void> {
  // Find count of affected records first
  const countResult = await sql<{ count: string }[]>`
    SELECT COUNT(*) as count
    FROM records
    WHERE jsonb_typeof(record) = 'string'
  `;
  const count = parseInt(countResult[0]?.count ?? "0", 10);

  if (count === 0) {
    return; // Nothing to fix
  }

  console.log(`Fixing ${count} double-encoded record(s)...`);

  // Fix the records by parsing the string value back to JSONB
  // The #>> '{}' operator extracts the root value as text, then ::jsonb parses it
  await sql`
    UPDATE records
    SET record = (record #>> '{}')::jsonb
    WHERE jsonb_typeof(record) = 'string'
  `;

  console.log(`Fixed ${count} double-encoded record(s).`);
}

// When run directly (bun run db:migrate), execute and close the pool.
if (import.meta.path === Bun.main) {
  runMigration()
    .catch((err) => {
      console.error("\nMigration failed:", err);
      process.exit(1);
    })
    .finally(() => closeDb());
}
