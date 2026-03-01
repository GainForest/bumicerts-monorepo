#!/usr/bin/env bun
/**
 * Database migration runner.
 * Reads schema.sql and applies it to the configured PostgreSQL database.
 * Safe to run multiple times — all statements use IF NOT EXISTS.
 *
 * Usage:
 *   bun run db:migrate
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { sql, closeDb } from "./index.ts";

const SCHEMA_PATH = join(import.meta.dirname, "schema.sql");

async function migrate(): Promise<void> {
  console.log("\n=== GainForest Indexer — DB Migration ===\n");
  console.log(`Schema file: ${SCHEMA_PATH}`);
  console.log(`Database:    ${process.env.DATABASE_URL?.replace(/:\/\/.*@/, "://<credentials>@")}\n`);

  const schema = readFileSync(SCHEMA_PATH, "utf-8");

  // Run the entire schema file as a single query so that forward-references
  // (e.g. indexes referencing the table defined earlier in the same file)
  // are resolved correctly within one transaction.
  console.log("Applying schema...");
  await sql.unsafe(schema);

  console.log("\nMigration complete — all tables and indexes are up to date.\n");
}

migrate()
  .catch((err) => {
    console.error("\nMigration failed:", err);
    process.exit(1);
  })
  .finally(() => closeDb());
