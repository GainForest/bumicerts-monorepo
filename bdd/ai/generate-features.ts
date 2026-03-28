#!/usr/bin/env bun
/**
 * AI-Driven BDD Feature Generator
 *
 * Scans source modules and uses Claude to generate Gherkin .feature files
 * that describe the behavior of each module in natural language.
 *
 * Usage:
 *   bun run bdd:generate                     # Generate for all mutations
 *   bun run bdd:generate -- --module ac.audio # Generate for a specific module
 *   bun run bdd:generate -- --dry-run         # Preview without writing files
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
    module: { type: "string", short: "m" },
    "dry-run": { type: "boolean", default: false },
    "output-dir": {
      type: "string",
      default: "bdd/features/generated",
    },
    model: {
      type: "string",
      default: "claude-sonnet-4-20250514",
    },
  },
  strict: false,
  allowPositionals: true,
});

const DRY_RUN = args["dry-run"] ?? false;
const OUTPUT_DIR = args["output-dir"] as string;
const MODEL = args["model"] as string;
const TARGET_MODULE = args["module"] as string | undefined;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const ROOT = join(import.meta.dir, "../..");
const MUTATIONS_DIR = join(
  ROOT,
  "packages/atproto-mutations-core/src/mutations"
);

// ---------------------------------------------------------------------------
// Source-code scanner
// ---------------------------------------------------------------------------

interface ModuleInfo {
  name: string;
  files: { path: string; content: string }[];
}

async function scanModule(modulePath: string): Promise<ModuleInfo> {
  const name = basename(modulePath);
  const files: { path: string; content: string }[] = [];

  async function walk(dir: string) {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        // Skip node_modules and test files (we want to generate FROM source)
        if (entry.name === "node_modules" || entry.name === "tests") continue;
        await walk(full);
      } else if (entry.name.endsWith(".ts") && !entry.name.endsWith(".test.ts")) {
        const content = await readFile(full, "utf-8");
        files.push({ path: relative(ROOT, full), content });
      }
    }
  }

  await walk(modulePath);
  return { name, files };
}

async function discoverModules(): Promise<string[]> {
  if (TARGET_MODULE) {
    const path = join(MUTATIONS_DIR, TARGET_MODULE);
    if (!existsSync(path)) {
      console.error(`Module not found: ${TARGET_MODULE}`);
      process.exit(1);
    }
    return [path];
  }

  const entries = await readdir(MUTATIONS_DIR, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory())
    .map((e) => join(MUTATIONS_DIR, e.name));
}

// ---------------------------------------------------------------------------
// AI feature generation
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are a BDD (Behavior-Driven Development) expert for a TypeScript AT Protocol SDK.
Your job is to generate Gherkin .feature files from source code.

Rules:
1. Write features in standard Gherkin syntax (Feature, Scenario, Given/When/Then).
2. Focus on BEHAVIOR — what the code does, not how it does it.
3. Cover the happy path, validation errors, edge cases, and integration paths.
4. Use descriptive scenario names that read like requirements.
5. Include tags: @offline for tests needing no network, @integration for PDS tests, @validation for input checks.
6. Use Scenario Outline with Examples where appropriate for parameterized tests.
7. Write from the perspective of a "conservation data steward" or "API consumer".
8. Reference domain concepts: AT Protocol, PDS, records, collections, rkeys, DIDs.
9. Keep scenarios independent — each should work standalone.
10. Output ONLY the .feature file content, no markdown fences or explanations.`;

async function generateFeature(
  moduleInfo: ModuleInfo,
  client: Anthropic
): Promise<string> {
  const sourceContext = moduleInfo.files
    .map((f) => `--- ${f.path} ---\n${f.content}`)
    .join("\n\n");

  const userPrompt = `Generate a comprehensive Gherkin .feature file for the "${moduleInfo.name}" mutation module.

Here is the source code:

${sourceContext}

Generate a .feature file that covers:
- Creating records with valid inputs
- All validation error paths (missing fields, invalid formats, constraint violations)
- Update and upsert behaviors if applicable
- Delete behaviors if applicable
- Integration scenarios that need real PDS credentials (tagged @integration)
- Edge cases visible in the validation logic

Use the module name "${moduleInfo.name}" in the Feature title. Reference the actual error types and field names from the source.`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n");

  return text.trim();
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const apiKey = process.env["ANTHROPIC_API_KEY"];
  if (!apiKey) {
    console.error(
      "❌ ANTHROPIC_API_KEY is required. Set it in your environment or .env file."
    );
    console.error("   export ANTHROPIC_API_KEY=sk-ant-...");
    process.exit(1);
  }

  const client = new Anthropic({ apiKey });

  console.log("🥒 AI-Driven BDD Feature Generator");
  console.log(`   Model: ${MODEL}`);
  console.log(`   Output: ${OUTPUT_DIR}`);
  console.log(`   Dry run: ${DRY_RUN}`);
  console.log("");

  const modulePaths = await discoverModules();
  console.log(`📦 Found ${modulePaths.length} module(s) to process\n`);

  if (!DRY_RUN) {
    await mkdir(join(ROOT, OUTPUT_DIR), { recursive: true });
  }

  for (const modulePath of modulePaths) {
    const moduleInfo = await scanModule(modulePath);
    console.log(
      `🔍 ${moduleInfo.name} — ${moduleInfo.files.length} source file(s)`
    );

    if (moduleInfo.files.length === 0) {
      console.log(`   ⏭  Skipping (no source files)\n`);
      continue;
    }

    try {
      const feature = await generateFeature(moduleInfo, client);
      const filename = `${moduleInfo.name}.feature`;
      const outputPath = join(ROOT, OUTPUT_DIR, filename);

      if (DRY_RUN) {
        console.log(`   📝 Would write: ${outputPath}`);
        console.log(
          `   Preview (first 5 lines):\n${feature
            .split("\n")
            .slice(0, 5)
            .map((l) => `      ${l}`)
            .join("\n")}`
        );
      } else {
        await writeFile(outputPath, feature + "\n", "utf-8");
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
