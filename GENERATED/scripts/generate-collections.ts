/**
 * GENERATED/scripts/generate-collections.ts
 *
 * Auto-generates two files inside apps/indexer from the shared
 * GENERATED/lexicons/ directory:
 *
 *   apps/indexer/src/tap/collections.ts  — INDEXED_COLLECTIONS, isIndexedCollection,
 *                                          COLLECTION_KEY_TYPE
 *   apps/indexer/src/tap/validation.ts   — SCHEMA_REGISTRY, validateRecord
 *
 * Also runs `lex build` to generate TypeScript types into:
 *   apps/indexer/src/generated/          — per-lexicon type modules
 *
 * Discovery logic (subtractive model):
 *   1. Walk GENERATED/lexicons/**\/*.json
 *   2. Find every lexicon where defs.main.type === "record"
 *   3. Subtract any NSID listed in EXCLUDED_COLLECTIONS below
 *   4. Write the two files
 *
 * To exclude a collection (e.g. you fetch it but don't want to index it),
 * add its NSID to the EXCLUDED_COLLECTIONS set below.
 *
 * Run:  bun run gen:indexer   (from monorepo root)
 *       bun run codegen        (fetch-lexicons + gen:types + gen:indexer)
 */

import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";

// ============================================================
// CONFIGURATION — the ONLY thing you should ever edit manually
// ============================================================

/**
 * NSIDs to exclude from indexing even though they have defs.main.type === "record".
 *
 * Add an NSID here when you intentionally don't want to index a collection.
 */
const EXCLUDED_COLLECTIONS = new Set<string>([
  // No collections are currently excluded.
  //
  // Previously app.certified.badge.* and app.certified.location were excluded
  // because @atproto/lex could not generate valid TypeScript for the mixed-type
  // union in badge.award (string DID ref + object strongRef). This was fixed in
  // a later @atproto/lex version — all app.certified.* lexicons now compile
  // cleanly. Remove this comment block if you add new exclusions.
]);

// ============================================================
// TYPES
// ============================================================

type KeyType = "tid" | "literal:self" | "any";

interface CollectionInfo {
  nsid: string;
  keyType: KeyType;
}

// ============================================================
// PATHS
// ============================================================

const SCRIPT_DIR = import.meta.dir;
const GENERATED_DIR = join(SCRIPT_DIR, "..");
const LEXICONS_DIR = join(GENERATED_DIR, "lexicons");
const INDEXER_DIR = join(GENERATED_DIR, "..", "apps", "indexer");
const TAP_OUT_DIR = join(INDEXER_DIR, "src", "tap");
const GENERATED_TYPES_OUT_DIR = join(INDEXER_DIR, "src", "generated");

// ============================================================
// LEXICON PATCHES
// Keep indexer-local type generation aligned with GENERATED/scripts/codegen.ts
// so validators and generated types stay consistent even when gen:indexer is run
// without gen:types first.
// ============================================================

async function applyLexiconPatches(): Promise<void> {
  const defsPath = join(LEXICONS_DIR, "app", "gainforest", "common", "defs.json");
  try {
    const raw = await readFile(defsPath, "utf8");
    const defs = JSON.parse(raw) as Record<string, unknown>;
    const audioDef = (defs as { defs?: { audio?: { properties?: { file?: { accept?: string[] } } } } })
      .defs?.audio;
    if (audioDef?.properties?.file?.accept) {
      const accept = audioDef.properties.file.accept;
      if (!accept.includes("audio/vnd.wave")) {
        const wavIdx = accept.indexOf("audio/wav");
        accept.splice(wavIdx + 1, 0, "audio/vnd.wave");
        await writeFile(defsPath, JSON.stringify(defs, null, 4) + "\n", "utf8");
        console.log('[generate-collections] Patch applied: added "audio/vnd.wave" to app.gainforest.common.defs#audio accept list');
      }
    }
  } catch (e) {
    console.warn(`[generate-collections] Skipping audio/vnd.wave patch: ${e}`);
  }
}

// ============================================================
// DISCOVERY
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

async function discoverCollections(): Promise<CollectionInfo[]> {
  const collections: CollectionInfo[] = [];

  for await (const filePath of walkJson(LEXICONS_DIR)) {
    const raw = await readFile(filePath, "utf-8");
    let doc: unknown;
    try {
      doc = JSON.parse(raw);
    } catch {
      console.warn(`[generate-collections] Skipping invalid JSON: ${filePath}`);
      continue;
    }

    if (
      typeof doc !== "object" ||
      doc === null ||
      !("id" in doc) ||
      !("defs" in doc)
    ) {
      continue;
    }

    const lexicon = doc as { id: string; defs: Record<string, unknown> };
    const main = lexicon.defs["main"];

    if (
      typeof main !== "object" ||
      main === null ||
      (main as Record<string, unknown>)["type"] !== "record"
    ) {
      continue;
    }

    const nsid = lexicon.id;

    if (EXCLUDED_COLLECTIONS.has(nsid)) {
      console.log(`[generate-collections] Excluding: ${nsid}`);
      continue;
    }

    const rawKey = (main as Record<string, unknown>)["key"];
    let keyType: KeyType = "tid";
    if (rawKey === "literal:self") keyType = "literal:self";
    else if (rawKey === "any") keyType = "any";

    collections.push({ nsid, keyType });
  }

  // Deterministic output order
  collections.sort((a, b) => a.nsid.localeCompare(b.nsid));
  return collections;
}

// ============================================================
// NSID → generated accessor path
// e.g. "app.gainforest.dwc.occurrence"
//    → "generated.app.gainforest.dwc.occurrence"
// ============================================================

function nsidToAccessor(nsid: string): string {
  return `generated.${nsid}`;
}

// ============================================================
// CODE GENERATION
// ============================================================

const BANNER = `/**
 * THIS FILE IS AUTO-GENERATED by GENERATED/scripts/generate-collections.ts
 *
 * DO NOT EDIT BY HAND.
 *
 * Re-generate with:  bun run gen:indexer   (from monorepo root)
 * (or:               bun run codegen)
 *
 * To exclude a collection from indexing, add its NSID to
 * EXCLUDED_COLLECTIONS in GENERATED/scripts/generate-collections.ts.
 */
`;

function generateCollectionsTs(collections: CollectionInfo[]): string {
  const nsids = collections.map((c) => `  "${c.nsid}"`).join(",\n");

  const keyTypeMap = collections
    .map((c) => {
      const padding = " ".repeat(
        Math.max(0, 56 - c.nsid.length)
      );
      return `  "${c.nsid}":${padding}"${c.keyType}"`;
    })
    .join(",\n");

  return `${BANNER}
// ============================================================
// INDEXED COLLECTIONS
// ============================================================

export const INDEXED_COLLECTIONS = [
${nsids},
] as const;

export type IndexedCollection = (typeof INDEXED_COLLECTIONS)[number];

/** O(1) Set for hot-path filtering. */
export const INDEXED_COLLECTIONS_SET = new Set<string>(INDEXED_COLLECTIONS);

/** Type guard — narrows a string to IndexedCollection. */
export function isIndexedCollection(
  collection: string
): collection is IndexedCollection {
  return INDEXED_COLLECTIONS_SET.has(collection);
}

// ============================================================
// COLLECTION METADATA
// ============================================================

/**
 * Key type used by each collection.
 *   "tid"          — TID key (most records)
 *   "literal:self" — singleton record per DID (e.g. profile, service)
 *   "any"          — unrestricted key
 */
export type RecordKeyType = "tid" | "literal:self" | "any";

export const COLLECTION_KEY_TYPE: Record<IndexedCollection, RecordKeyType> = {
${keyTypeMap},
};
`;
}

function generateValidationTs(collections: CollectionInfo[]): string {
  const registryEntries = collections
    .map((c) => {
      const accessor = nsidToAccessor(c.nsid);
      const padding = " ".repeat(Math.max(0, 56 - c.nsid.length - 2));
      return `  "${c.nsid}":${padding}${accessor}`;
    })
    .join(",\n");

  return `${BANNER}
/**
 * Record validation using \\@atproto/lex generated schemas.
 *
 * Each generated schema exposes \`$safeValidate(data)\` which:
 *   - Validates the record against the full lexicon definition
 *     (grapheme limits, required fields, enum values, formats, etc.)
 *   - Returns { success: true, value } or { success: false, reason: ValidationError }
 *   - Does NOT apply defaults or coerce types (unlike $safeParse)
 *
 * IMPORTANT: the failure field is \`reason\`, NOT \`error\`. Do not change this.
 * See @atproto/lex-schema ResultFailure<E> — { success: false; reason: E }
 */

import * as generated from "@/generated/index.ts";
import type { IndexedCollection } from "./collections.ts";

// ============================================================
// SCHEMA REGISTRY
// Maps every indexed collection NSID → its generated schema object.
// ============================================================

type LexSchema = {
  // NOTE: the failure field is \`reason\`, not \`error\` — matches @atproto/lex-schema ResultFailure<E>
  $safeValidate: (data: unknown) => { success: boolean; reason?: unknown };
};

const SCHEMA_REGISTRY: Record<IndexedCollection, LexSchema> = {
${registryEntries},
};

// ============================================================
// PUBLIC API
// ============================================================

export type ValidationResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Validate a raw record against its lexicon schema.
 *
 * @param collection - The lexicon collection NSID
 * @param record     - The raw record object from Tap
 */
export function validateRecord(
  collection: string,
  record: unknown
): ValidationResult {
  const schema = SCHEMA_REGISTRY[collection as IndexedCollection];

  // Should not happen — every indexed collection has a schema.
  // Guard retained so a bug here never silently crashes the indexer.
  if (!schema) return { ok: true };

  const result = schema.$safeValidate(record);
  if (result.success) return { ok: true };
  // \`reason\` is the correct field — @atproto/lex-schema ResultFailure<E> uses { success: false, reason: E }
  return { ok: false, error: formatError(result.reason) };
}

// ============================================================
// HELPERS
// ============================================================

function formatError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try { return JSON.stringify(error); } catch { return String(error); }
}
`;
}

// ============================================================
// LEX BUILD
// Runs `lex build`, pointing at the shared GENERATED/lexicons/
// and outputting into apps/indexer/src/generated/.
// Excludes every NSID in EXCLUDED_COLLECTIONS so that @atproto/lex
// never generates broken TypeScript for problematic lexicons.
// ============================================================

async function runLexBuild(excludedNsids: Set<string>): Promise<void> {
  const args = [
    "build",
    "--lexicons", LEXICONS_DIR,
    "--out", GENERATED_TYPES_OUT_DIR,
    "--indexFile",
    "--importExt", ".ts",
    "--clear",
    "--allowLegacyBlobs",
  ];

  for (const nsid of excludedNsids) {
    args.push("--exclude", nsid);
  }

  console.log(`\n[generate-collections] Running: lex ${args.join(" ")}`);

  const proc = Bun.spawn(["lex", ...args], {
    stdout: "inherit",
    stderr: "inherit",
    cwd: INDEXER_DIR,
  });

  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    console.error(`[generate-collections] lex build failed (exit ${exitCode})`);
    process.exit(exitCode);
  }
}

// ============================================================
// MAIN
// ============================================================

console.log("\n[generate-collections] Starting...");
console.log(`[generate-collections] Lexicons:     ${LEXICONS_DIR}`);
console.log(`[generate-collections] Tap output:   ${TAP_OUT_DIR}`);
console.log(`[generate-collections] Types output: ${GENERATED_TYPES_OUT_DIR}`);

const collections = await discoverCollections();

if (collections.length === 0) {
  console.error(
    "[generate-collections] ERROR: No record-type lexicons found in GENERATED/lexicons/. " +
      "Run `bun run fetch-lexicons` first."
  );
  process.exit(1);
}

console.log(
  `\n[generate-collections] Found ${collections.length} record-type collection(s):`
);
for (const c of collections) {
  console.log(`  ${c.nsid}  (key: ${c.keyType})`);
}

await mkdir(TAP_OUT_DIR, { recursive: true });

const collectionsPath = join(TAP_OUT_DIR, "collections.ts");
const validationPath = join(TAP_OUT_DIR, "validation.ts");

await writeFile(collectionsPath, generateCollectionsTs(collections), "utf-8");
console.log(`\n[generate-collections] Wrote ${collectionsPath}`);

await writeFile(validationPath, generateValidationTs(collections), "utf-8");
console.log(`[generate-collections] Wrote ${validationPath}`);

await applyLexiconPatches();

// Run lex build to generate types into apps/indexer/src/generated/
await runLexBuild(EXCLUDED_COLLECTIONS);

// Normalise Windows backslash import paths → forward slashes
const fixedCount = await normalizeImportPaths(GENERATED_TYPES_OUT_DIR);
if (fixedCount > 0) {
  console.log(`[generate-collections] Normalised ${fixedCount} backslash import path(s) in ${GENERATED_TYPES_OUT_DIR}`);
}

console.log("\n[generate-collections] Done.");
