#!/usr/bin/env bun
/**
 * init-marketplace-route
 *
 * Scaffolds a new route under app/(marketplace)/ with the Shell pattern.
 *
 * Usage:
 *   bun run init-marketplace-route <path>         # path relative to (marketplace)/
 *   bun run init-marketplace-route .              # CWD must be inside (marketplace)/
 *   bun run init-marketplace-route <path> --force # overwrite existing files
 *
 * Examples:
 *   bun run init-marketplace-route dashboard
 *   bun run init-marketplace-route reports/summary
 *   bun run init-marketplace-route organization/[did]/timeline
 */

import { mkdir, writeFile, access } from "node:fs/promises";
import { join, resolve, normalize, sep } from "node:path";

// ── Paths ──────────────────────────────────────────────────────────────────────

const SCRIPT_DIR = import.meta.dir;
const BUMICERTS_ROOT = resolve(SCRIPT_DIR, "..");
const MARKETPLACE_ROOT = join(BUMICERTS_ROOT, "app", "(marketplace)");

// ── Helpers ────────────────────────────────────────────────────────────────────

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function toPascalCase(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join("");
}

/**
 * Derives the route name from a target directory path.
 * Walks backwards through path segments, picks the first non-dynamic one
 * (i.e. doesn't start with "["), strips Next.js route group parens "(...)".
 *
 * Examples:
 *   .../explore                    → Explore
 *   .../organization/all           → All
 *   .../organization/[did]         → Organization
 *   .../organization/[did]/bumicerts → Bumicerts
 *   .../a/b/c/[id]                 → C
 */
function deriveRouteName(targetDir: string): string {
  const segments = normalize(targetDir)
    .split(sep)
    .filter(Boolean)
    .filter((s) => !s.startsWith("(") || !s.endsWith(")")); // strip route groups

  for (let i = segments.length - 1; i >= 0; i--) {
    const seg = segments[i];
    if (!seg.startsWith("[")) {
      return toPascalCase(seg);
    }
  }

  throw new Error(
    `Could not derive a route name from path: ${targetDir}\n` +
    `Every segment is dynamic (e.g. [param]). Add a static parent segment.`
  );
}

// ── Templates ──────────────────────────────────────────────────────────────────

function shellTemplate(name: string): string {
  return `"use client";

import { motion } from "framer-motion";

export function ${name}Shell({
  animate = true,
  children,
}: {
  animate?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <section className="pt-6 pb-20 md:pb-28 px-6">
      <div className="max-w-6xl mx-auto">

        <motion.div
          initial={animate ? { opacity: 0, y: 16 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
          className="mb-8"
        >
          <h1
            className="text-3xl md:text-4xl lg:text-5xl font-light tracking-[-0.02em] leading-[1.1] text-foreground"
            style={{ fontFamily: "var(--font-garamond-var)" }}
          >
            ${name}
          </h1>
        </motion.div>

        {/* Main content slot */}
        {children}

      </div>
    </section>
  );
}
`;
}

function skeletonTemplate(name: string): string {
  return `import { Skeleton } from "@/components/ui/skeleton";

export function ${name}Skeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}
`;
}

function loadingTemplate(name: string): string {
  return `import { ${name}Shell } from "./_components/${name}Shell";
import { ${name}Skeleton } from "./_components/${name}Skeleton";

export default function ${name}Loading() {
  return (
    <${name}Shell animate={true}>
      <${name}Skeleton />
    </${name}Shell>
  );
}
`;
}

function pageTemplate(name: string): string {
  return `import { ${name}Shell } from "./_components/${name}Shell";

export const metadata = {
  title: "${name} — Bumicerts",
  description: "TODO: Add description",
};

export default async function ${name}Page() {
  // TODO: Fetch data here

  return (
    <${name}Shell animate={false}>
      {/* TODO: Add content */}
    </${name}Shell>
  );
}
`;
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    console.log(
      [
        "",
        "  Usage:",
        "    bun run init-marketplace-route <path>          path relative to (marketplace)/",
        "    bun run init-marketplace-route .               run from inside the target directory",
        "    bun run init-marketplace-route <path> --force  overwrite existing files",
        "",
        "  Examples:",
        "    bun run init-marketplace-route dashboard",
        "    bun run init-marketplace-route reports/summary",
        "    bun run init-marketplace-route organization/[did]/timeline",
        "    bun run init-marketplace-route . --force",
        "",
      ].join("\n")
    );
    process.exit(0);
  }

  const pathArg = args[0];
  const force = args.includes("--force");

  // ── Resolve target directory ─────────────────────────────────────────────────

  let targetDir: string;

  if (pathArg === ".") {
    targetDir = resolve(process.cwd());
  } else {
    targetDir = resolve(MARKETPLACE_ROOT, pathArg);
  }

  // ── Validate: must be inside (marketplace)/ ──────────────────────────────────

  const normalTarget = normalize(targetDir);
  const normalMarketplace = normalize(MARKETPLACE_ROOT);

  if (!normalTarget.startsWith(normalMarketplace)) {
    console.error(
      `\n  Error: Target directory is outside (marketplace)/\n` +
      `  Target:     ${targetDir}\n` +
      `  Allowed under: ${MARKETPLACE_ROOT}\n`
    );
    process.exit(1);
  }

  // ── Derive route name ────────────────────────────────────────────────────────

  let routeName: string;
  try {
    routeName = deriveRouteName(targetDir);
  } catch (err: unknown) {
    console.error(`\n  Error: ${err instanceof Error ? err.message : String(err)}\n`);
    process.exit(1);
  }

  // ── Check for existing files ─────────────────────────────────────────────────

  const componentsDir = join(targetDir, "_components");
  const filesToCreate = [
    join(componentsDir, `${routeName}Shell.tsx`),
    join(componentsDir, `${routeName}Skeleton.tsx`),
    join(targetDir, "loading.tsx"),
    join(targetDir, "page.tsx"),
  ];

  if (!force) {
    const existing = (
      await Promise.all(filesToCreate.map(async (f) => ({ f, exists: await fileExists(f) })))
    )
      .filter(({ exists }) => exists)
      .map(({ f }) => f);

    if (existing.length > 0) {
      console.error(
        `\n  Error: The following files already exist:\n` +
        existing.map((f) => `    ${f.replace(BUMICERTS_ROOT + sep, "")}`).join("\n") +
        `\n\n  Use --force to overwrite.\n`
      );
      process.exit(1);
    }
  }

  // ── Create files ─────────────────────────────────────────────────────────────

  await mkdir(componentsDir, { recursive: true });

  await Promise.all([
    writeFile(join(componentsDir, `${routeName}Shell.tsx`),    shellTemplate(routeName)),
    writeFile(join(componentsDir, `${routeName}Skeleton.tsx`), skeletonTemplate(routeName)),
    writeFile(join(targetDir, "loading.tsx"),                  loadingTemplate(routeName)),
    writeFile(join(targetDir, "page.tsx"),                     pageTemplate(routeName)),
  ]);

  // ── Success ───────────────────────────────────────────────────────────────────

  const rel = (p: string) => p.replace(BUMICERTS_ROOT + sep, "");

  console.log(
    [
      "",
      `  ✓ Scaffolded ${routeName} route`,
      `    ${rel(join(targetDir, "page.tsx"))}`,
      `    ${rel(join(targetDir, "loading.tsx"))}`,
      `    ${rel(join(componentsDir, `${routeName}Shell.tsx`))}`,
      `    ${rel(join(componentsDir, `${routeName}Skeleton.tsx`))}`,
      "",
    ].join("\n")
  );
}

main().catch((err) => {
  console.error(`\n  Unexpected error: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
