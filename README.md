# atproto-packages

Monorepo of GainForest's ATProto packages for Next.js apps — OAuth authentication, typed mutations, and shared generated types.

---

## Packages

| Package | Description |
|---|---|
| [`@gainforest/atproto-auth-next`](packages/atproto-auth-next/README.md) | ATProto OAuth authentication for Next.js. OAuth client setup, Supabase-backed token storage, encrypted cookie sessions, and pluggable route handlers. |
| [`@gainforest/atproto-mutations-core`](packages/atproto-mutations-core/README.md) | Framework-agnostic ATProto mutation primitives. Typed results, Effect-based services, GeoJSON utilities. Use directly in scripts, workers, or as the foundation for `atproto-mutations-next`. |
| [`@gainforest/atproto-mutations-next`](packages/atproto-mutations-next/README.md) | ATProto mutations for Next.js. Server actions, OAuth session integration, and a client-side `useMutation`-ready namespace built on top of `atproto-mutations-core`. |

## Getting started

If you're building a Next.js app, the typical setup order is:

1. **Set up auth** → follow [`@gainforest/atproto-auth-next`](packages/atproto-auth-next/README.md)
2. **Add mutations** → follow [`@gainforest/atproto-mutations-next`](packages/atproto-mutations-next/README.md)

If you're in a non-Next.js environment (scripts, workers, serverless):

- Use [`@gainforest/atproto-mutations-core`](packages/atproto-mutations-core/README.md) directly with `makeCredentialAgentLayer`.

---

## Monorepo structure

```
atproto-packages/
├── packages/
│   ├── atproto-auth-next/       # @gainforest/atproto-auth-next
│   ├── atproto-mutations-core/  # @gainforest/atproto-mutations-core
│   ├── atproto-mutations-next/  # @gainforest/atproto-mutations-next
│   └── internal-utils/          # @gainforest/internal-utils (private)
└── GENERATED/
    ├── lexicons/                # Fetched ATProto lexicon JSON (gitignored)
    ├── types/                   # Generated TypeScript types (gitignored)
    └── scripts/
        ├── fetch-lexicons.sh    # Fetches lexicons from upstream repos
        └── codegen.ts           # Generates types via @atproto/lex
```

`GENERATED/lexicons/` and `GENERATED/types/` are gitignored — they are populated at dev/build time by running the codegen scripts below.

---

## Development

### Prerequisites

- [Bun](https://bun.sh) >= 1.0

### Install dependencies

```bash
bun install
```

### Lexicons

`GENERATED/lexicons/` is **committed to this repo** — you do not need to fetch anything to get started. The lexicons currently tracked come from two upstream sources, merged in priority order (later source wins on conflicts):

| # | Repo |
|---|---|
| 1 | [`GainForest/lexicons`](https://github.com/GainForest/lexicons) |
| 2 | [`hypercerts-org/hypercerts-lexicon`](https://github.com/hypercerts-org/hypercerts-lexicon) |

**If you add or change lexicons**, edit the JSON files in `GENERATED/lexicons/` directly and commit them. To re-sync from the upstream repos instead, run `bun run fetch-lexicons` (or `bun run fetch-lexicons:local` for local sibling repos) and commit the result. The fetch script also verifies that every `$ref` across all lexicons can be resolved locally — it will exit loudly if anything is missing.

### Generate types

`GENERATED/types/` is gitignored and must be regenerated from the lexicons. Run this once after cloning and again whenever `GENERATED/lexicons/` changes.

```bash
# Generate types from the committed lexicons
bun run GENERATED/scripts/codegen.ts

# Or re-fetch from upstream first, then generate
bun run codegen          # fetch from GitHub @ main + generate
bun run codegen:local    # fetch from local sibling repos + generate
```

### Build all packages

```bash
bun run build
```

### Watch mode (dev)

```bash
bun run dev
```

### Run tests

```bash
# All packages
bun test

# Single package
cd packages/atproto-mutations-core && bun test
```

### Clean build artifacts

```bash
bun run clean
```

---

## Releases

This repo uses [Changesets](https://github.com/changesets/changesets) for versioning and publishing.

```bash
# Record a change
bun run changeset

# Bump versions according to pending changesets
bun run version

# Build + publish all packages to npm
bun run release
```
