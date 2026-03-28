#!/usr/bin/env bun
/**
 * AI-Driven BDD Coverage Analyzer
 *
 * Uses Claude to analyze source code against existing .feature files
 * and report gaps in behavioral coverage.
 *
 * Usage:
 *   bun run bdd:analyze
 *
 * Requires: ANTHROPIC_API_KEY environment variable
 */

import Anthropic from "@anthropic-ai/sdk";
import { readdir, readFile } from "node:fs/promises";
import { join, basename, relative } from "node:path";
import { existsSync } from "node:fs";

const ROOT = join(import.meta.dir, "../..");
const FEATURES_DIR = join(ROOT, "bdd/features");
const MUTATIONS_DIR = join(
  ROOT,
  "packages/atproto-mutations-core/src/mutations"
);
const MODEL = "claude-sonnet-4-20250514";

// ---------------------------------------------------------------------------
// Scanners
// ---------------------------------------------------------------------------

async function collectFeatures(): Promise<string> {
  const parts: string[] = [];

  async function walk(dir: string) {
    if (!existsSync(dir)) return;
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.name.endsWith(".feature")) {
        const content = await readFile(full, "utf-8");
        parts.push(`--- ${relative(ROOT, full)} ---\n${content}`);
      }
    }
  }

  await walk(FEATURES_DIR);
  return parts.join("\n\n");
}

async function collectSourceSummaries(): Promise<string> {
  const parts: string[] = [];
  const entries = await readdir(MUTATIONS_DIR, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const modulePath = join(MUTATIONS_DIR, entry.name);

    // Read the main files (create, update, delete, upsert) + types + errors
    for (const filename of [
      "create.ts",
      "update.ts",
      "delete.ts",
      "upsert.ts",
      "utils/types.ts",
      "utils/errors.ts",
    ]) {
      const filePath = join(modulePath, filename);
      if (existsSync(filePath)) {
        const content = await readFile(filePath, "utf-8");
        // Truncate to keep within token limits
        const truncated =
          content.length > 2000
            ? content.slice(0, 2000) + "\n... (truncated)"
            : content;
        parts.push(
          `--- ${entry.name}/${filename} ---\n${truncated}`
        );
      }
    }
  }

  return parts.join("\n\n");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const apiKey = process.env["ANTHROPIC_API_KEY"];
  if (!apiKey) {
    console.error("❌ ANTHROPIC_API_KEY is required.");
    process.exit(1);
  }

  const client = new Anthropic({ apiKey });

  console.log("📊 AI-Driven BDD Coverage Analyzer\n");

  const [features, sources] = await Promise.all([
    collectFeatures(),
    collectSourceSummaries(),
  ]);

  console.log("Analyzing coverage gaps...\n");

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: `You are a QA architect analyzing BDD coverage for an AT Protocol SDK.
Analyze the existing .feature files against the source code and produce a coverage report.

Output format:
1. A table showing each module and whether it has feature coverage (✅/❌)
2. For covered modules: list any MISSING scenarios (validation paths, error cases, edge cases)
3. For uncovered modules: suggest 3-5 key scenarios that should be written
4. Overall coverage percentage estimate
5. Priority recommendations (which modules to cover next and why)

Be specific — reference actual function names, error types, and validation rules from the source.`,
    messages: [
      {
        role: "user",
        content: `EXISTING FEATURE FILES:\n\n${features}\n\nSOURCE CODE SUMMARIES:\n\n${sources}`,
      },
    ],
  });

  const report = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n");

  console.log(report);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
