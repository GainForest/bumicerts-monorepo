/**
 * GENERATED/scripts/generate-resolvers.ts
 *
 * Reads every lexicon JSON under GENERATED/lexicons/, walks the ref graph
 * to detect blob fields, then emits a single TypeScript file:
 *
 *   apps/indexer/src/graphql/resolvers/generated.ts
 *
 * The generated file contains, for every non-excluded record-type lexicon:
 *   • A *Record   simpleObject (pure lexicon payload fields)
 *   • A *Item     simpleObject (metadata + creatorInfo + record)
 *   • A *Page     simpleObject (data array + pageInfo)
 *   • A map*      async mapper function
 *
 * It also generates the namespace class hierarchy that mirrors the NSID tree,
 * wires up all builder.objectType() calls, and registers query fields.
 *
 * Configuration lives in:
 *   apps/indexer/src/graphql/resolvers/_config.ts
 *
 * Run:
 *   bun run gen:resolvers   (from monorepo root)
 *   bun run codegen          (full pipeline)
 */

import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION — read from the _config.ts next to the generated file
// ─────────────────────────────────────────────────────────────────────────────

const SCRIPT_DIR = import.meta.dir;
const GENERATED_DIR = join(SCRIPT_DIR, "..");
const LEXICONS_DIR = join(GENERATED_DIR, "lexicons");
const INDEXER_DIR = join(GENERATED_DIR, "..", "apps", "indexer");
const RESOLVERS_DIR = join(INDEXER_DIR, "src", "graphql", "resolvers");
const CONFIG_PATH = join(RESOLVERS_DIR, "_config.ts");
const OUT_PATH = join(RESOLVERS_DIR, "generated.ts");

// Dynamically import the config so developers only touch that one file
const config = await import(CONFIG_PATH);
const EXCLUDED_COLLECTIONS: Set<string> = config.EXCLUDED_COLLECTIONS ?? new Set();
const PDS_BATCH_COLLECTIONS: Set<string> = config.PDS_BATCH_COLLECTIONS ?? new Set();
const CUSTOM_WHERE_INPUTS: Record<string, string> = config.CUSTOM_WHERE_INPUTS ?? {};

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface LexProperty {
  type: string;
  format?: string;
  ref?: string;
  refs?: string[];
  items?: LexProperty;
  description?: string;
  [key: string]: unknown; // allow extra fields like maxLength, enum, etc.
}

interface LexDef {
  type: string;
  required?: string[];
  properties?: Record<string, LexProperty>;
  [key: string]: unknown; // allow "record", "description", etc.
}

interface LexiconDoc {
  lexicon: number;
  id: string;
  defs: Record<string, LexDef | LexProperty>;
}

interface CollectionInfo {
  nsid: string;
  description: string;
  fields: FieldInfo[];
  hasBlobField: boolean;        // any field needs resolveBlobsInValue
  needsPdsBatch: boolean;       // from PDS_BATCH_COLLECTIONS config
  customWhereInput?: string;    // override ref name
}

interface FieldInfo {
  name: string;
  gqlType: GqlFieldType;
  needsBlob: boolean;           // this field specifically needs resolveBlobsInValue
  isDateTime: boolean;
  isStrongRef: boolean;
  isStrongRefArray: boolean;
  isIntegerType: boolean;
  isBooleanType: boolean;
  isStringArray: boolean;
  isRawJson: boolean;
  description?: string;
}

type GqlFieldType =
  | "string"
  | "int"
  | "boolean"
  | "DateTime"
  | "StrongRef"
  | "[StrongRef]"
  | "JSON"
  | "stringList";

// ─────────────────────────────────────────────────────────────────────────────
// LEXICON WALKING
// ─────────────────────────────────────────────────────────────────────────────

async function* walkJson(dir: string): AsyncGenerator<string> {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walkJson(full);
    else if (entry.isFile() && entry.name.endsWith(".json")) yield full;
  }
}

async function loadAllLexicons(): Promise<Map<string, LexiconDoc>> {
  const docs = new Map<string, LexiconDoc>();
  for await (const filePath of walkJson(LEXICONS_DIR)) {
    const raw = await readFile(filePath, "utf-8");
    let doc: unknown;
    try { doc = JSON.parse(raw); } catch { continue; }
    if (
      typeof doc !== "object" || doc === null ||
      !("id" in doc) || !("defs" in doc)
    ) continue;
    const lex = doc as LexiconDoc;
    docs.set(lex.id, lex);
  }
  return docs;
}

// ─────────────────────────────────────────────────────────────────────────────
// BLOB DETECTION
//
// We build a ref graph by walking the lexicon defs.  A field "needs blob"
// when it — or anything it transitively refs — contains a `type: "blob"`.
// ─────────────────────────────────────────────────────────────────────────────

function containsBlob(
  prop: LexProperty,
  allDocs: Map<string, LexiconDoc>,
  visited = new Set<string>(),
): boolean {
  if (prop.type === "blob") return true;

  if (prop.type === "ref" && prop.ref) {
    return resolveRefHasBlob(prop.ref, allDocs, visited);
  }

  if (prop.type === "union" && prop.refs) {
    return prop.refs.some((r) => resolveRefHasBlob(r, allDocs, visited));
  }

  if (prop.type === "array" && prop.items) {
    return containsBlob(prop.items, allDocs, visited);
  }

  return false;
}

function resolveRefHasBlob(
  ref: string,
  allDocs: Map<string, LexiconDoc>,
  visited: Set<string>,
): boolean {
  if (visited.has(ref)) return false;
  visited.add(ref);

  // Parse the ref: "nsid#defName" or just "nsid" (meaning #main)
  let nsid: string;
  let defName: string;
  if (ref.startsWith("#")) {
    // Local ref — caller must pass full NSID context; skip for now
    // (local refs within the same lexicon are handled in analyzeFields)
    return false;
  }
  const hashIdx = ref.indexOf("#");
  if (hashIdx === -1) {
    nsid = ref;
    defName = "main";
  } else {
    nsid = ref.slice(0, hashIdx);
    defName = ref.slice(hashIdx + 1);
  }

  const doc = allDocs.get(nsid);
  if (!doc) return false;

  const def = doc.defs[defName] as LexDef | LexProperty | undefined;
  if (!def) return false;

  // If the def itself is a blob (e.g. org.hypercerts.defs#smallImage has type:object
  // with a `blob` property)
  if ((def as LexProperty).type === "blob") return true;

  // It's an object with properties
  const lexDef = def as LexDef;
  if (lexDef.type === "object" && lexDef.properties) {
    for (const prop of Object.values(lexDef.properties)) {
      if (containsBlob(prop as LexProperty, allDocs, new Set(visited))) return true;
    }
  }

  return false;
}

// Resolve a local "#defName" ref relative to a lexicon
function localRefHasBlob(
  localRef: string, // e.g. "#contributor"
  lexDoc: LexiconDoc,
  allDocs: Map<string, LexiconDoc>,
  visited: Set<string>,
): boolean {
  const defName = localRef.slice(1);
  const def = lexDoc.defs[defName] as LexDef | LexProperty | undefined;
  if (!def) return false;

  const key = `${lexDoc.id}#${defName}`;
  if (visited.has(key)) return false;
  visited.add(key);

  if ((def as LexProperty).type === "blob") return true;

  const lexDef = def as LexDef;
  if (lexDef.type === "object" && lexDef.properties) {
    for (const prop of Object.values(lexDef.properties)) {
      if (containsPropBlob(prop as LexProperty, lexDoc, allDocs, new Set(visited))) return true;
    }
  }
  return false;
}

function containsPropBlob(
  prop: LexProperty,
  lexDoc: LexiconDoc,
  allDocs: Map<string, LexiconDoc>,
  visited: Set<string>,
): boolean {
  if (prop.type === "blob") return true;

  if (prop.type === "ref" && prop.ref) {
    if (prop.ref.startsWith("#")) {
      return localRefHasBlob(prop.ref, lexDoc, allDocs, visited);
    }
    return resolveRefHasBlob(prop.ref, allDocs, visited);
  }

  if (prop.type === "union" && prop.refs) {
    return prop.refs.some((r) => {
      if (r.startsWith("#")) return localRefHasBlob(r, lexDoc, allDocs, visited);
      return resolveRefHasBlob(r, allDocs, visited);
    });
  }

  if (prop.type === "array" && prop.items) {
    return containsPropBlob(prop.items, lexDoc, allDocs, new Set(visited));
  }

  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// FIELD ANALYSIS
//
// Given a lexicon property, decide what GraphQL type to use and how to
// extract the value from the JSONB payload in the row mapper.
// ─────────────────────────────────────────────────────────────────────────────

const STRONG_REF_NSID = "com.atproto.repo.strongRef";

function isStrongRefProp(prop: LexProperty): boolean {
  if (prop.type === "ref" && prop.ref === STRONG_REF_NSID) return true;
  return false;
}

function isStrongRefArrayProp(prop: LexProperty): boolean {
  if (prop.type === "array" && prop.items) {
    return isStrongRefProp(prop.items);
  }
  return false;
}

function analyzeField(
  name: string,
  prop: LexProperty,
  required: string[],
  lexDoc: LexiconDoc,
  allDocs: Map<string, LexiconDoc>,
): FieldInfo {
  const description = (prop as Record<string, unknown>)["description"] as string | undefined;

  // datetime strings
  if (prop.type === "string" && prop.format === "datetime") {
    return {
      name, description,
      gqlType: "DateTime",
      needsBlob: false, isDateTime: true, isStrongRef: false, isStrongRefArray: false,
      isIntegerType: false, isBooleanType: false, isStringArray: false, isRawJson: false,
    };
  }

  // plain strings
  if (prop.type === "string") {
    return {
      name, description,
      gqlType: "string",
      needsBlob: false, isDateTime: false, isStrongRef: false, isStrongRefArray: false,
      isIntegerType: false, isBooleanType: false, isStringArray: false, isRawJson: false,
    };
  }

  // integers
  if (prop.type === "integer") {
    return {
      name, description,
      gqlType: "int",
      needsBlob: false, isDateTime: false, isStrongRef: false, isStrongRefArray: false,
      isIntegerType: true, isBooleanType: false, isStringArray: false, isRawJson: false,
    };
  }

  // booleans
  if (prop.type === "boolean") {
    return {
      name, description,
      gqlType: "boolean",
      needsBlob: false, isDateTime: false, isStrongRef: false, isStrongRefArray: false,
      isIntegerType: false, isBooleanType: true, isStringArray: false, isRawJson: false,
    };
  }

  // direct blob
  if (prop.type === "blob") {
    return {
      name, description,
      gqlType: "JSON",
      needsBlob: true, isDateTime: false, isStrongRef: false, isStrongRefArray: false,
      isIntegerType: false, isBooleanType: false, isStringArray: false, isRawJson: false,
    };
  }

  // strongRef (single)
  if (isStrongRefProp(prop)) {
    return {
      name, description,
      gqlType: "StrongRef",
      needsBlob: false, isDateTime: false, isStrongRef: true, isStrongRefArray: false,
      isIntegerType: false, isBooleanType: false, isStringArray: false, isRawJson: false,
    };
  }

  // strongRef (array)
  if (isStrongRefArrayProp(prop)) {
    return {
      name, description,
      gqlType: "[StrongRef]",
      needsBlob: false, isDateTime: false, isStrongRef: false, isStrongRefArray: true,
      isIntegerType: false, isBooleanType: false, isStringArray: false, isRawJson: false,
    };
  }

  // string array
  if (
    prop.type === "array" &&
    prop.items &&
    (prop.items.type === "string" || prop.items.type === "blob")
  ) {
    if (prop.items.type === "blob") {
      // array of blobs → raw JSON with blob resolution
      return {
        name, description,
        gqlType: "JSON",
        needsBlob: true, isDateTime: false, isStrongRef: false, isStrongRefArray: false,
        isIntegerType: false, isBooleanType: false, isStringArray: false, isRawJson: false,
      };
    }
    return {
      name, description,
      gqlType: "stringList",
      needsBlob: false, isDateTime: false, isStrongRef: false, isStrongRefArray: false,
      isIntegerType: false, isBooleanType: false, isStringArray: true, isRawJson: false,
    };
  }

  // anything else (ref, union, complex array) → check for blob recursively
  const needsBlob = containsPropBlob(prop, lexDoc, allDocs, new Set());
  return {
    name, description,
    gqlType: "JSON",
    needsBlob, isDateTime: false, isStrongRef: false, isStrongRefArray: false,
    isIntegerType: false, isBooleanType: false, isStringArray: false, isRawJson: true,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// COLLECTION DISCOVERY
// ─────────────────────────────────────────────────────────────────────────────

async function discoverCollections(
  allDocs: Map<string, LexiconDoc>,
): Promise<CollectionInfo[]> {
  const collections: CollectionInfo[] = [];

  for (const [nsid, doc] of allDocs) {
    const main = doc.defs["main"] as LexDef | undefined;
    if (!main || main.type !== "record") continue;
    if (EXCLUDED_COLLECTIONS.has(nsid)) {
      console.log(`[generate-resolvers] Excluding: ${nsid}`);
      continue;
    }

    const record = (main as Record<string, unknown>)["record"] as LexDef | undefined;
    if (!record || record.type !== "object") continue;

    const required: string[] = record.required ?? [];
    const props = record.properties ?? {};
    const description =
      ((main as Record<string, unknown>)["description"] as string | undefined) ?? "";

    const fields: FieldInfo[] = Object.entries(props).map(([name, prop]) =>
      analyzeField(name, prop as LexProperty, required, doc, allDocs)
    );

    const hasBlobField = fields.some((f) => f.needsBlob);
    const needsPdsBatch = PDS_BATCH_COLLECTIONS.has(nsid) || hasBlobField;
    const customWhereInput = CUSTOM_WHERE_INPUTS[nsid];

    collections.push({
      nsid, description, fields, hasBlobField, needsPdsBatch, customWhereInput,
    });
  }

  collections.sort((a, b) => a.nsid.localeCompare(b.nsid));
  return collections;
}

// ─────────────────────────────────────────────────────────────────────────────
// NAMING CONVENTIONS
//
// NSID segments → PascalCase type prefix
// e.g. "org.hypercerts.claim.rights"
//   → authority="org", segments=["hypercerts","claim","rights"]
//   → prefix = "HypercertsClaimRights"
//
// Query field name (camelCase of authority root):
//   "org.hypercerts.*"  → queryField = "hypercerts"
//   "app.gainforest.*"  → queryField = "gainforest"
//   "org.hyperboards.*" → queryField = "hyperboards"
// ─────────────────────────────────────────────────────────────────────────────

function nsidToParts(nsid: string): { authority: string[]; segments: string[] } {
  const parts = nsid.split(".");
  // The authority is the TLD + second segment (e.g. "org.hypercerts" or "app.gainforest")
  // Everything after is the path segments
  // For NSIDs like "org.hypercerts.claim.rights": tld=org, authority=hypercerts, segments=[claim,rights]
  // For NSIDs like "app.gainforest.dwc.event": tld=app, authority=gainforest, segments=[dwc,event]
  const auth = parts[1] ?? "unknown";
  const rest = parts.slice(2);
  return { authority: [auth], segments: rest };
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Full PascalCase prefix from NSID: "org.hypercerts.claim.rights" → "HypercertsClaimRights" */
function nsidToTypePrefix(nsid: string): string {
  const { authority, segments } = nsidToParts(nsid);
  return [...authority, ...segments].map(capitalize).join("");
}

/** Top-level query field name: "org.hypercerts.*" → "hypercerts" */
function nsidToQueryField(nsid: string): string {
  return nsid.split(".")[1] ?? "unknown"; // second segment after tld
}

/** Namespace class name for a sub-path: "hypercerts","claim" → "HypercertsClaimNS" */
function nsPathToClassName(parts: string[]): string {
  return parts.map(capitalize).join("") + "NS";
}

/** GraphQL type name for a namespace: "hypercerts","claim" → "HypercertsClaimNamespace" */
function nsPathToTypeName(parts: string[]): string {
  return parts.map(capitalize).join("") + "Namespace";
}

// ─────────────────────────────────────────────────────────────────────────────
// NAMESPACE TREE
//
// We build a tree of NSID path segments so we can emit one objectType per
// namespace level.  Leaf nodes hold collection queries; intermediate nodes
// hold sub-namespace fields.
// ─────────────────────────────────────────────────────────────────────────────

interface NSNode {
  /**
   * Full dot-joined path (without TLD), e.g. "hypercerts" or "hypercerts.claim"
   * This is what we use to name classes and types.
   */
  pathParts: string[];
  children: Map<string, NSNode>;         // sub-namespaces keyed by segment name
  collections: CollectionInfo[];          // collections whose last segment is here
}

function buildNamespaceTree(collections: CollectionInfo[]): Map<string, NSNode> {
  // keyed by query-field name (e.g. "hypercerts", "gainforest", ...)
  const roots = new Map<string, NSNode>();

  for (const col of collections) {
    const { authority, segments } = nsidToParts(col.nsid);
    // authority[0] is the root query field name (e.g. "hypercerts")
    const root = authority[0] ?? "unknown";

    if (!roots.has(root)) {
      roots.set(root, { pathParts: [root], children: new Map(), collections: [] });
    }
    let node = roots.get(root)!;

    // Walk segments (all but the last) — intermediate nodes are sub-namespaces
    for (let i = 0; i < segments.length - 1; i++) {
      const seg = segments[i] ?? "unknown";
      if (!node.children.has(seg)) {
        node.children.set(seg, {
          pathParts: [...node.pathParts, seg],
          children: new Map(),
          collections: [],
        });
      }
      node = node.children.get(seg)!;
    }

    // The last segment is the collection field name on this namespace
    node.collections.push(col);
  }

  return roots;
}

// ─────────────────────────────────────────────────────────────────────────────
// CODE EMISSION HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function indent(level: number, s: string): string {
  return "  ".repeat(level) + s;
}

/** Emit standard args block */
function emitArgs(whereRef: string): string {
  return `{
        cursor: t.arg.string(),
        limit: t.arg.int(),
        where: t.arg({ type: ${whereRef}, required: false }),
        sortBy: t.arg({ type: SortFieldEnum }),
        order: t.arg({ type: SortOrderEnum }),
      }`;
}

/** Emit one field accessor line for the mapper */
function emitAccessor(f: FieldInfo): string {
  const key = JSON.stringify(f.name);
  if (f.isDateTime) return `${f.name}: s(p, ${key}),`;
  if (f.gqlType === "string") return `${f.name}: s(p, ${key}),`;
  if (f.isIntegerType) return `${f.name}: n(p, ${key}),`;
  if (f.isBooleanType) return `${f.name}: b(p, ${key}),`;
  if (f.isStringArray) return `${f.name}: arr(p, ${key}),`;
  if (f.isStrongRef) return `${f.name}: extractStrongRef(j(p, ${key})),`;
  if (f.isStrongRefArray) return `${f.name}: extractStrongRefs(j(p, ${key})),`;
  if (f.needsBlob) return `${f.name}: await resolveBlobsInValue(j(p, ${key}), row.did),`;
  return `${f.name}: j(p, ${key}),`;
}

/** Emit one field definition line for a simpleObject */
function emitGqlField(f: FieldInfo): string {
  const opts: string[] = ["nullable: true"];
  if (f.description) opts.push(`description: ${JSON.stringify(f.description)}`);

  if (f.gqlType === "string") {
    return `${f.name}: t.string({ ${opts.join(", ")} }),`;
  }
  if (f.gqlType === "int") {
    return `${f.name}: t.int({ ${opts.join(", ")} }),`;
  }
  if (f.gqlType === "boolean") {
    return `${f.name}: t.boolean({ ${opts.join(", ")} }),`;
  }
  if (f.gqlType === "stringList") {
    return `${f.name}: t.stringList({ ${opts.join(", ")} }),`;
  }
  if (f.gqlType === "DateTime") {
    return `${f.name}: t.field({ type: "DateTime", ${opts.join(", ")} }),`;
  }
  if (f.gqlType === "StrongRef") {
    return `${f.name}: t.field({ type: StrongRefType, ${opts.join(", ")} }),`;
  }
  if (f.gqlType === "[StrongRef]") {
    return `${f.name}: t.field({ type: [StrongRefType], ${opts.join(", ")} }),`;
  }
  // JSON
  return `${f.name}: t.field({ type: "JSON", ${opts.join(", ")} }),`;
}

// ─────────────────────────────────────────────────────────────────────────────
// PER-COLLECTION CODE GENERATION
// ─────────────────────────────────────────────────────────────────────────────

function genCollectionBlock(col: CollectionInfo): string {
  const prefix = nsidToTypePrefix(col.nsid);
  const recordTypeName  = `${prefix}RecordType`;
  const itemTypeName    = `${prefix}ItemType`;
  const pageTypeName    = `${prefix}PageType`;
  const mapperName      = `map${prefix}`;
  const gqlRecordName   = `${prefix}Record`;
  const gqlItemName     = `${prefix}Item`;
  const gqlPageName     = `${prefix}Page`;
  const descSuffix      = col.description ? ` ${col.description}` : "";

  const fieldDefs = col.fields.map((f) => indent(4, emitGqlField(f))).join("\n");
  const accessors = col.fields.map((f) => indent(6, emitAccessor(f))).join("\n");

  // Mappers are always async: resolveCreatorInfo is async, and some fields
  // also need await for blob resolution.
  const lines: string[] = [
    `// ${"─".repeat(74)}`,
    `// ${col.nsid}`,
    `// ${"─".repeat(74)}`,
    ``,
    `export const ${recordTypeName} = builder.simpleObject(${JSON.stringify(gqlRecordName)}, {`,
    `  description: ${JSON.stringify(`Pure payload for ${col.nsid}.${descSuffix}`.trim())},`,
    `  fields: (t) => ({`,
    fieldDefs,
    `  }),`,
    `});`,
    ``,
    `export const ${itemTypeName} = builder.simpleObject(${JSON.stringify(gqlItemName)}, {`,
    `  description: ${JSON.stringify(`A record from ${col.nsid}.`)},`,
    `  fields: (t) => ({`,
    `    metadata:    t.field({ type: RecordMetaType }),`,
    `    creatorInfo: t.field({ type: CreatorInfoType }),`,
    `    record:      t.field({ type: ${recordTypeName} }),`,
    `  }),`,
    `});`,
    ``,
    `export const ${pageTypeName} = builder.simpleObject(${JSON.stringify(gqlPageName)}, {`,
    `  fields: (t) => ({`,
    `    data:     t.field({ type: [${itemTypeName}] }),`,
    `    pageInfo: t.field({ type: PageInfoType }),`,
    `  }),`,
    `});`,
    ``,
    `export async function ${mapperName}(row: RecordRow) {`,
    `  const p = payload(row);`,
    `  return {`,
    `    metadata:    rowToMeta(row),`,
    `    creatorInfo: await resolveCreatorInfo(row.did),`,
    `    record: {`,
    accessors,
    `    },`,
    `  };`,
    `}`,
    ``,
  ];

  return lines.join("\n");
}

// ─────────────────────────────────────────────────────────────────────────────
// NAMESPACE CLASS DECLARATIONS
// ─────────────────────────────────────────────────────────────────────────────

function collectAllNSClasses(roots: Map<string, NSNode>): string[] {
  const classes: string[] = [];

  function walk(node: NSNode) {
    // Export all NS classes so custom files can import them and attach
    // additional fields via a second builder.objectType() call.
    classes.push(`export class ${nsPathToClassName(node.pathParts)} {}`);
    for (const child of node.children.values()) walk(child);
  }

  for (const root of roots.values()) walk(root);
  return classes;
}

// ─────────────────────────────────────────────────────────────────────────────
// NAMESPACE OBJECTTYPE BLOCKS
// ─────────────────────────────────────────────────────────────────────────────

function genNamespaceBlock(node: NSNode): string {
  const className = nsPathToClassName(node.pathParts);
  const typeName  = nsPathToTypeName(node.pathParts);
  const pathDesc  = node.pathParts.join(".");

  const fieldLines: string[] = [];

  // sub-namespace fields
  for (const [seg, child] of node.children) {
    const childClass = nsPathToClassName(child.pathParts);
    fieldLines.push(
      `    ${seg}: t.field({ type: ${childClass}, description: "${nsPathToTypeName(child.pathParts)} namespace.", resolve: () => new ${childClass}() }),`,
    );
  }

  // collection query fields
  for (const col of node.collections) {
    const { segments } = nsidToParts(col.nsid);
    const fieldName = segments[segments.length - 1]; // last segment
    const prefix = nsidToTypePrefix(col.nsid);
    const pageTypeName = `${prefix}PageType`;
    const mapperName = `map${prefix}`;
    const whereRef = col.customWhereInput ?? "WhereInputRef";

    if (col.needsPdsBatch) {
      // Emit expanded resolve with getPdsHostsBatch
      fieldLines.push(
        `    ${fieldName}: t.field({`,
        `      type: ${pageTypeName},`,
        `      description: "Paginated list of ${col.nsid} records.",`,
        `      args: ${emitArgs(whereRef)},`,
        `      resolve: async (_, args) => {`,
        `        const { cursor, limit, where, sortBy, order } = args;`,
        `        let resolvedDid: string | undefined;`,
        `        if (where?.handle) resolvedDid = await resolveActorToDid(where.handle);`,
        `        else if (where?.did) resolvedDid = where.did;`,
        `        const page = await getRecordsByCollection(${JSON.stringify(col.nsid)}, {`,
        `          cursor: cursor ?? undefined, limit: limit ?? undefined, did: resolvedDid,`,
        `          sortField: (sortBy as "createdAt" | "indexedAt") ?? undefined,`,
        `          sortOrder: (order as "asc" | "desc") ?? undefined,`,
        `        });`,
        `        await getPdsHostsBatch([...new Set(page.records.map((r) => r.did))]);`,
        `        const data = await Promise.all(page.records.map(${mapperName}));`,
        `        return { data, pageInfo: toPageInfo(page.cursor, data.length) };`,
        `      },`,
        `    }),`,
      );
    } else {
      // Simple fetchCollectionPage path
      fieldLines.push(
        `    ${fieldName}: t.field({`,
        `      type: ${pageTypeName},`,
        `      description: "Paginated list of ${col.nsid} records.",`,
        `      args: ${emitArgs(whereRef)},`,
        `      resolve: (_, args) => fetchCollectionPage(${JSON.stringify(col.nsid)}, args, ${mapperName}),`,
        `    }),`,
      );
    }
  }

  const fields = fieldLines.join("\n");

  return [
    `builder.objectType(${className}, {`,
    `  name: ${JSON.stringify(typeName)},`,
    `  description: ${JSON.stringify(`${typeName} namespace (${pathDesc}.*).`)},`,
    `  fields: (t) => ({`,
    fields,
    `  }),`,
    `});`,
    ``,
  ].join("\n");
}

function genAllNamespaceBlocks(roots: Map<string, NSNode>): string {
  const blocks: string[] = [];

  // We need to emit children before parents so types are defined before use.
  function walkPostOrder(node: NSNode) {
    for (const child of node.children.values()) walkPostOrder(child);
    blocks.push(genNamespaceBlock(node));
  }

  for (const root of roots.values()) walkPostOrder(root);
  return blocks.join("\n");
}

// ─────────────────────────────────────────────────────────────────────────────
// QUERY FIELD REGISTRATION
// ─────────────────────────────────────────────────────────────────────────────

function genQueryFields(roots: Map<string, NSNode>): string {
  const fieldLines: string[] = [];
  for (const [queryField, node] of roots) {
    const className = nsPathToClassName(node.pathParts);
    const typeName  = nsPathToTypeName(node.pathParts);
    fieldLines.push(
      `  ${queryField}: t.field({`,
      `    type: ${className},`,
      `    description: "All ${typeName} indexed records.",`,
      `    resolve: () => new ${className}(),`,
      `  }),`,
    );
  }

  return [
    `builder.queryFields((t) => ({`,
    fieldLines.join("\n"),
    `}));`,
  ].join("\n");
}

// ─────────────────────────────────────────────────────────────────────────────
// FULL FILE GENERATION
// ─────────────────────────────────────────────────────────────────────────────

const BANNER = `/**
 * THIS FILE IS AUTO-GENERATED by GENERATED/scripts/generate-resolvers.ts
 *
 * DO NOT EDIT BY HAND.
 *
 * Re-generate with:  bun run gen:resolvers   (from monorepo root)
 *                    bun run codegen          (full pipeline)
 *
 * To exclude a collection or add a custom WhereInput, edit:
 *   apps/indexer/src/graphql/resolvers/_config.ts
 *
 * To override a collection's resolver entirely, add it to EXCLUDED_COLLECTIONS
 * in _config.ts and implement it in resolvers/custom/.
 */
`;

const IMPORTS = `
import { builder } from "../builder.ts";
import {
  PageInfoType,
  RecordMetaType,
  StrongRefType,
  CreatorInfoType,
  SortOrderEnum,
  SortFieldEnum,
  WhereInputRef,
  rowToMeta,
  payload,
  extractStrongRef,
  extractStrongRefs,
  resolveBlobsInValue,
  fetchCollectionPage,
  toPageInfo,
  resolveCreatorInfo,
} from "../types.ts";
import { getRecordsByCollection } from "@/db/queries.ts";
import { resolveActorToDid } from "../identity.ts";
import { getPdsHostsBatch } from "@/identity/pds.ts";
import type { RecordRow } from "@/db/types.ts";

// ─────────────────────────────────────────────────────────────────────────────
// JSONB payload accessors (shared by all mappers)
// ─────────────────────────────────────────────────────────────────────────────

const s = (p: Record<string, unknown>, k: string): string | null => {
  const v = p[k]; if (v == null) return null;
  return typeof v === "string" ? v : String(v);
};
const n = (p: Record<string, unknown>, k: string): number | null => {
  const v = p[k]; if (v == null) return null;
  if (typeof v === "number") return v;
  const x = Number(v); return isNaN(x) ? null : x;
};
const b = (p: Record<string, unknown>, k: string): boolean | null => {
  const v = p[k]; if (v == null) return null;
  return Boolean(v);
};
const arr = (p: Record<string, unknown>, k: string): string[] | null => {
  const v = p[k]; return Array.isArray(v) ? v.map(String) : null;
};
const j = (p: Record<string, unknown>, k: string): unknown => p[k] ?? null;
`;

async function generate(): Promise<string> {
  console.log("\n[generate-resolvers] Loading lexicons...");
  const allDocs = await loadAllLexicons();
  console.log(`[generate-resolvers] Loaded ${allDocs.size} lexicon documents.`);

  console.log("\n[generate-resolvers] Discovering collections...");
  const collections = await discoverCollections(allDocs);
  console.log(`[generate-resolvers] Found ${collections.length} generateable collection(s):`);
  for (const c of collections) {
    const blobMark = c.hasBlobField ? " [blob]" : "";
    const batchMark = c.needsPdsBatch ? " [pds-batch]" : "";
    console.log(`  ${c.nsid}${blobMark}${batchMark}`);
  }

  // Per-collection type + mapper blocks
  const collectionBlocks = collections.map(genCollectionBlock).join("\n");

  // Namespace tree
  const roots = buildNamespaceTree(collections);
  const nsClasses = collectAllNSClasses(roots).join("\n");
  const nsBlocks  = genAllNamespaceBlocks(roots);
  const queryBlock = genQueryFields(roots);

  const sections = [
    BANNER,
    IMPORTS,
    `// ${"═".repeat(76)}`,
    `// COLLECTION TYPES & MAPPERS`,
    `// ${"═".repeat(76)}`,
    ``,
    collectionBlocks,
    `// ${"═".repeat(76)}`,
    `// NAMESPACE CLASSES`,
    `// ${"═".repeat(76)}`,
    ``,
    nsClasses,
    ``,
    `// ${"═".repeat(76)}`,
    `// NAMESPACE OBJECTTYPES  (children declared before parents)`,
    `// ${"═".repeat(76)}`,
    ``,
    nsBlocks,
    `// ${"═".repeat(76)}`,
    `// QUERY FIELD REGISTRATION`,
    `// ${"═".repeat(76)}`,
    ``,
    queryBlock,
    ``,
  ];

  return sections.join("\n");
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

console.log("\n[generate-resolvers] Starting...");
console.log(`[generate-resolvers] Lexicons dir:  ${LEXICONS_DIR}`);
console.log(`[generate-resolvers] Output file:   ${OUT_PATH}`);
console.log(`[generate-resolvers] Config file:   ${CONFIG_PATH}`);
console.log(`[generate-resolvers] Excluded:      ${[...EXCLUDED_COLLECTIONS].join(", ") || "(none)"}`);

const output = await generate();
await writeFile(OUT_PATH, output, "utf-8");

console.log(`\n[generate-resolvers] Wrote ${OUT_PATH}`);
console.log("[generate-resolvers] Done.\n");
