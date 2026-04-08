/**
 * GENERATED/scripts/codegen.ts
 *
 * Runs `lex build` from @atproto/lex to generate TypeScript types from the
 * lexicons fetched into GENERATED/lexicons/ by fetch-lexicons.sh.
 *
 * Output goes to GENERATED/types/ — this is the source of truth that all
 * packages in this monorepo import from.
 *
 * Run via:
 *   bun run codegen              (from monorepo root)
 *   bun run fetch-lexicons       (lexicons only, no codegen)
 *   bun run fetch-lexicons:local (lexicons from local sibling folders)
 *
 * To exclude a lexicon from type generation (e.g. it has a schema that
 * @atproto/lex cannot compile), add its NSID to EXCLUDED_NSIDS below.
 * This is the ONLY thing you should ever need to edit in this file.
 */

import { join } from "node:path";
import { readdir, readFile, writeFile } from "node:fs/promises";

// ============================================================
// CONFIGURATION — the only thing you should ever edit manually
// ============================================================

/**
 * NSIDs to exclude from type generation even though they are valid lexicons.
 *
 * Add an NSID here when @atproto/lex cannot generate valid TypeScript for it
 * (e.g. mixed-type union fields, unsupported format combinations).
 *
 * See: gainforest-indexer for prior art on which NSIDs are problematic.
 */
const EXCLUDED_NSIDS = new Set<string>([
  // No NSIDs are currently excluded.
  //
  // Previously app.certified.badge.* were excluded because @atproto/lex could
  // not generate valid TypeScript for the mixed-type union in badge.award.
  // This was fixed in a later @atproto/lex version — all app.certified.*
  // lexicons now compile cleanly.
]);

// ============================================================
// PATHS
// ============================================================

const SCRIPT_DIR = import.meta.dir;
const GENERATED_DIR = join(SCRIPT_DIR, "..");
const LEXICONS_DIR = join(GENERATED_DIR, "lexicons");
const OUT_DIR = join(GENERATED_DIR, "types");

// ============================================================
// HELPERS
// ============================================================

async function* walkJson(dir: string): AsyncGenerator<string> {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walkJson(full);
    } else if (entry.isFile() && entry.name.endsWith(".json")) {
      yield full;
    }
  }
}

async function* walkTs(dir: string): AsyncGenerator<string> {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walkTs(full);
    } else if (entry.isFile() && entry.name.endsWith(".ts")) {
      yield full;
    }
  }
}

/**
 * Post-process generated .ts files to normalise Windows backslash import paths
 * to forward slashes. `@atproto/lex` uses Node's `path.join()` internally,
 * which produces OS-specific separators. This makes the output identical on
 * Windows and macOS/Linux.
 *
 * On macOS/Linux this is a no-op (no backslashes to fix).
 */
async function normalizeImportPaths(dir: string): Promise<number> {
  let fixedCount = 0;
  for await (const filePath of walkTs(dir)) {
    const content = await readFile(filePath, "utf8");
    if (!content.includes("\\")) continue;

    const fixed = content.replace(
      /^((?:import|export) .+ from ['"])(.+?)(['"])/gm,
      (match, prefix: string, importPath: string, suffix: string) => {
        if (!importPath.includes("\\")) return match;
        fixedCount++;
        // Replace backslashes with forward slashes, then collapse any
        // resulting double slashes (e.g. './..//' → './../')
        const normalised = importPath
          .replaceAll("\\", "/")
          .replace(/\/{2,}/g, "/")
          .replace(/^\.\/\.\./, "..");
        return `${prefix}${normalised}${suffix}`;
      }
    );

    if (fixed !== content) {
      await writeFile(filePath, fixed, "utf8");
    }
  }
  return fixedCount;
}

async function lexiconCount(): Promise<number> {
  let count = 0;
  for await (const _ of walkJson(LEXICONS_DIR)) count++;
  return count;
}

async function assertLexiconsExist(): Promise<void> {
  const count = await lexiconCount();
  if (count === 0) {
    console.error(
      "\n[codegen] ERROR: No lexicon files found in GENERATED/lexicons/\n" +
        "         Run 'bun run fetch-lexicons' first.\n"
    );
    process.exit(1);
  }
  console.log(`[codegen] Found ${count} lexicon file(s) in ${LEXICONS_DIR}`);
}

// ============================================================
// LEXICON PATCHES
// ============================================================

/**
 * Apply in-memory patches to fetched lexicons before running `lex build`.
 *
 * These patches correct upstream lexicon definitions that cause mismatches
 * between what the PDS stores and what the generated validators accept.
 * Each patch is documented with the reason it is needed.
 *
 * Add new patches here — NEVER commit hand-edits to GENERATED/lexicons/
 * directly, since that directory is gitignored and re-populated on every
 * `fetch-lexicons` run.
 */
async function applyLexiconPatches(): Promise<void> {
  // ── Patch 1: add "audio/vnd.wave" to the audio blob accept list ──────────
  // Some PDS implementations normalise "audio/wav" → "audio/vnd.wave" when a
  // blob is uploaded. When we later build the record we use `raw.mimeType`
  // from the upload response (required, otherwise the PDS rejects the write
  // with "Referenced Mimetype does not match stored blob"). Without this entry
  // in the accept list, `$parse` rejects the normalised MIME type.
  const defsPath = join(LEXICONS_DIR, "app", "gainforest", "common", "defs.json");
  try {
    const raw = await readFile(defsPath, "utf8");
    const defs = JSON.parse(raw) as Record<string, unknown>;
    const audioDef = (defs as { defs?: { audio?: { properties?: { file?: { accept?: string[] } } } } })
      .defs?.audio;
    if (audioDef?.properties?.file?.accept) {
      const accept = audioDef.properties.file.accept;
      if (!accept.includes("audio/vnd.wave")) {
        // Insert after "audio/wav" for readability
        const wavIdx = accept.indexOf("audio/wav");
        accept.splice(wavIdx + 1, 0, "audio/vnd.wave");
        await writeFile(defsPath, JSON.stringify(defs, null, 4) + "\n", "utf8");
        console.log('[codegen] Patch applied: added "audio/vnd.wave" to app.gainforest.common.defs#audio accept list');
      }
    }
  } catch (e) {
    // If the file doesn't exist yet (e.g. on a partial fetch), skip silently.
    console.warn(`[codegen] Skipping audio/vnd.wave patch: ${e}`);
  }
}

// ============================================================
// LEX BUILD
// ============================================================

async function runLexBuild(): Promise<void> {
  const args = [
    "build",
    "--lexicons", LEXICONS_DIR,
    "--out", OUT_DIR,
    "--indexFile",
    "--importExt", ".ts",
    "--clear",
  ];

  for (const nsid of EXCLUDED_NSIDS) {
    args.push("--exclude", nsid);
  }

  console.log(`\n[codegen] Running: lex ${args.join(" ")}\n`);

  const proc = Bun.spawn(["lex", ...args], {
    stdout: "inherit",
    stderr: "inherit",
    cwd: GENERATED_DIR,
  });

  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    console.error(`\n[codegen] lex build failed (exit ${exitCode})`);
    process.exit(exitCode);
  }
}

// ============================================================
// MAIN
// ============================================================

console.log("\n[codegen] Starting type generation...");
console.log(`[codegen] Lexicons: ${LEXICONS_DIR}`);
console.log(`[codegen] Output:   ${OUT_DIR}`);

if (EXCLUDED_NSIDS.size > 0) {
  console.log(`[codegen] Excluding ${EXCLUDED_NSIDS.size} NSID(s):`);
  for (const nsid of EXCLUDED_NSIDS) {
    console.log(`  - ${nsid}`);
  }
}

await assertLexiconsExist();
await applyLexiconPatches();
await runLexBuild();

// Normalise Windows backslash import paths → forward slashes
const fixedCount = await normalizeImportPaths(OUT_DIR);
if (fixedCount > 0) {
  console.log(`[codegen] Normalised ${fixedCount} backslash import path(s) in ${OUT_DIR}`);
}

console.log(`\n[codegen] Done. Types written to ${OUT_DIR}`);
