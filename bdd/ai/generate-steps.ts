#!/usr/bin/env bun
/**
 * AI-Driven Step Definition Generator
 *
 * Reads .feature files and existing step definitions, then uses Claude to
 * generate missing step definitions — bridging Gherkin to TypeScript/Effect.
 *
 * Usage:
 *   bun run bdd:generate-steps                           # All features
 *   bun run bdd:generate-steps -- --feature geojson      # Specific feature
 *   bun run bdd:generate-steps -- --dry-run              # Preview only
 *
 * Requires: ANTHROPIC_API_KEY environment variable
 */

import Anthropic from "@anthropic-ai/sdk";
import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { join, basename, relative } from "node:path";
import { existsSync } from "node:fs";
import { parseArgs } from "node:util";

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------
const { values: args } = parseArgs({
  options: {
    feature: { type: "string", short: "f" },
    "dry-run": { type: "boolean", default: false },
    model: { type: "string", default: "claude-sonnet-4-20250514" },
  },
  strict: false,
  allowPositionals: true,
});

const DRY_RUN = args["dry-run"] ?? false;
const MODEL = args["model"] as string;
const TARGET_FEATURE = args["feature"] as string | undefined;

const ROOT = join(import.meta.dir, "../..");
const FEATURES_DIR = join(ROOT, "bdd/features");
const STEPS_DIR = join(ROOT, "bdd/step-definitions");
const MUTATIONS_SRC = join(ROOT, "packages/atproto-mutations-core/src");

// ---------------------------------------------------------------------------
// Scanner
// ---------------------------------------------------------------------------

async function findFeatureFiles(): Promise<string[]> {
  const files: string[] = [];

  async function walk(dir: string) {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.name.endsWith(".feature")) {
        if (TARGET_FEATURE && !entry.name.includes(TARGET_FEATURE)) continue;
        files.push(full);
      }
    }
  }

  await walk(FEATURES_DIR);
  return files;
}

async function readExistingSteps(): Promise<string> {
  if (!existsSync(STEPS_DIR)) return "";
  const entries = await readdir(STEPS_DIR);
  const contents: string[] = [];
  for (const entry of entries) {
    if (entry.endsWith(".ts")) {
      const content = await readFile(join(STEPS_DIR, entry), "utf-8");
      contents.push(`--- ${entry} ---\n${content}`);
    }
  }
  return contents.join("\n\n");
}

// ---------------------------------------------------------------------------
// AI generation
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are a TypeScript developer generating Cucumber step definitions for a Bun + Effect.js AT Protocol SDK.

Rules:
1. Use @cucumber/cucumber's Given, When, Then with TypeScript.
2. Import from the actual source paths (relative to the step file in bdd/step-definitions/).
3. The World object is AtprotoWorld (import from "../support/world").
4. Use Effect.js patterns: Effect.gen, Effect.runPromise, Effect.either, Effect.provide(layer).
5. Use node:assert/strict for assertions (assert.ok, assert.strictEqual, assert.match).
6. Only generate step definitions for steps that DON'T already exist.
7. Follow the existing code style from the provided step definitions.
8. Output ONLY TypeScript code — no markdown fences, no explanations.
9. Include proper imports at the top.`;

async function generateMissingSteps(
  featureContent: string,
  existingSteps: string,
  client: Anthropic
): Promise<string> {
  const userPrompt = `Here is a Gherkin feature file:

${featureContent}

Here are the EXISTING step definitions (do NOT regenerate these):

${existingSteps}

Here is the source directory structure for imports:
- packages/atproto-mutations-core/src/mutations/<module>/create.ts
- packages/atproto-mutations-core/src/mutations/<module>/update.ts
- packages/atproto-mutations-core/src/mutations/<module>/delete.ts
- packages/atproto-mutations-core/src/mutations/<module>/upsert.ts
- packages/atproto-mutations-core/src/mutations/<module>/utils/types.ts
- packages/atproto-mutations-core/src/mutations/<module>/utils/errors.ts
- packages/atproto-mutations-core/src/layers/credential.ts
- packages/atproto-mutations-core/src/services/AtprotoAgent.ts
- packages/atproto-mutations-core/src/geojson/validate.ts
- packages/atproto-mutations-core/src/geojson/computations.ts

Generate ONLY the missing step definitions. If ALL steps are already covered, output a comment saying "// All steps already implemented".`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  return response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();
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

  console.log("🤖 AI-Driven Step Definition Generator");
  console.log(`   Model: ${MODEL}`);
  console.log(`   Dry run: ${DRY_RUN}\n`);

  const featureFiles = await findFeatureFiles();
  const existingSteps = await readExistingSteps();

  console.log(`📄 Found ${featureFiles.length} feature file(s)\n`);

  for (const featurePath of featureFiles) {
    const featureName = basename(featurePath, ".feature");
    console.log(`🔍 Processing: ${featureName}.feature`);

    const featureContent = await readFile(featurePath, "utf-8");

    try {
      const steps = await generateMissingSteps(
        featureContent,
        existingSteps,
        client
      );

      if (steps.includes("All steps already implemented")) {
        console.log("   ✅ All steps already covered\n");
        continue;
      }

      const outputPath = join(STEPS_DIR, `${featureName}.generated.steps.ts`);

      if (DRY_RUN) {
        console.log(`   📝 Would write: ${outputPath}`);
        console.log(
          `   Preview:\n${steps
            .split("\n")
            .slice(0, 10)
            .map((l) => `      ${l}`)
            .join("\n")}`
        );
      } else {
        await mkdir(STEPS_DIR, { recursive: true });
        await writeFile(outputPath, steps + "\n", "utf-8");
        console.log(`   ✅ Written: ${outputPath}`);
      }
    } catch (error: any) {
      console.error(`   ❌ Failed: ${error.message}`);
    }

    console.log("");
  }

  console.log("✨ Done!");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
