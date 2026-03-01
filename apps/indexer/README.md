# @gainforest/indexer

An AT Protocol indexer for the [GainForest](https://gainforest.earth) organisation. It connects to a self-hosted [Tap](https://github.com/bluesky-social/indigo/blob/main/cmd/tap/README.md) relay, indexes records from GainForest and partner lexicons across all PDSes, stores them in PostgreSQL, and serves them through a namespace-grouped GraphQL API.

> **This app lives in the `atproto-packages` monorepo** under `apps/indexer/`.
> Lexicons are the shared source of truth at `GENERATED/lexicons/` — never edit `lexicons/` here directly (it no longer exists).
> Run codegen from the monorepo root: `bun run gen:indexer` or `bun run codegen`.

---

## Overview

```
                ┌─────────────────────────────────────────────┐
                │               AT Protocol network            │
                │  (GainForest PDS, bsky.social, others…)      │
                └──────────────────┬──────────────────────────┘
                                   │  repo sync (verified)
                                   ▼
                        ┌──────────────────┐
                        │   Tap  (:2480)   │  ← signal collection
                        │   SQLite state   │    auto-discovers repos
                        └────────┬─────────┘
                                 │  WebSocket (/channel)
                                 ▼
                   ┌─────────────────────────────┐
                   │      gainforest-indexer      │
                   │                             │
                   │  EventHandler               │
                   │  • filter to indexed NSIDs  │
                   │  • validate with @atproto/  │
                   │    lex schemas              │
                   │  • batch-upsert to Postgres │
                   └───────────┬─────────────────┘
                               │
              ┌────────────────┴─────────────────┐
              ▼                                   ▼
   ┌──────────────────┐               ┌───────────────────┐
   │  PostgreSQL       │               │  GraphQL API      │
   │  records + labels │               │  :4000/graphql    │
   └──────────────────┘               └───────────────────┘
```

**Tap** is the official Bluesky sync relay. It handles the hard parts:
- **Cryptographic verification** of every repo commit
- **Full-history backfill** — when you add a DID, Tap fetches its entire repo from the PDS
- **Cursor management** — Tap tracks its own position; the indexer never needs to manage a cursor
- **Signal-based repo discovery** — any DID that publishes an `org.hypercerts.claim.activity` record is automatically tracked

The indexer's job is to filter, validate, and store whatever Tap delivers.

### Indexed lexicons

| Namespace | Collections |
|-----------|-------------|
| `app.gainforest.dwc.*` | `event`, `measurement`, `occurrence` |
| `app.gainforest.evaluator.*` | `evaluation`, `service`, `subscription` |
| `app.gainforest.organization.*` | `defaultSite`, `info`, `layer`, `observations.dendogram`, `observations.fauna`, `observations.flora`, `observations.measuredTreesCluster`, `predictions.fauna`, `predictions.flora`, `recordings.audio` |
| `org.hypercerts.claim.*` | `activity`, `collection`, `contribution`, `evaluation`, `evidence`, `measurement`, `project`, `rights` |
| `org.hypercerts.funding.*` | `receipt` |
| `org.impactindexer.link.*` | `attestation` |
| `org.impactindexer.review.*` | `comment`, `like` |

> `app.certified.*` is excluded — those lexicons use a mixed-type union field that `@atproto/lex` cannot generate valid TypeScript for.

---

## Requirements

- [Bun](https://bun.sh) v1.2+
- [Docker](https://www.docker.com) + Docker Compose

---

## First-time setup

### 1. Install dependencies

```bash
bun install
```

This installs all Node/Bun dependencies declared in `package.json`, including `@atproto/tap`, `graphql-yoga`, `postgres`, `multiformats`, and their transitive dependencies. The `patches/` directory is applied automatically by Bun to fix a known issue with `@atproto/ws-client`.

### 2. Configure environment

```bash
cp .env.example .env
```

Open `.env` and set the values for your environment. The variables you **must** change from their defaults are:

| Variable | What to set |
|----------|-------------|
| `TAP_ADMIN_PASSWORD` | Pick a strong password. This same value is used by the Tap Docker container on startup and by the indexer to authenticate management API calls — they must match. |
| `SEED_DIDS` | Comma-separated list of known GainForest organisation DIDs (e.g. `did:plc:abc123,did:plc:xyz456`). These are registered with Tap on every startup, which triggers a full repo backfill for each DID from its PDS. Leave empty if you plan to use `SEED_PDSS` or add repos manually later. |
| `SEED_PDSS` | Comma-separated list of PDS host URLs to crawl on startup (e.g. `https://climateai.org`). The indexer calls `com.atproto.sync.listRepos` on each host, collects all active DIDs, and registers them with Tap — equivalent to listing every account on that PDS in `SEED_DIDS`. Results are merged with `SEED_DIDS` and deduplicated. Leave empty if you are using `SEED_DIDS` directly or adding repos manually. |
| `DATABASE_URL` | Leave as-is (`postgres://gainforest:gainforest@localhost:5432/gainforest_indexer`) if you are using the bundled Docker PostgreSQL container. Change only if you are pointing at an external database. |

Everything else (`BATCH_SIZE`, `BATCH_TIMEOUT_MS`, `GRAPHQL_PORT`, `HEALTH_PORT`, etc.) has sensible defaults for local development and does not need to be changed.

> **`TAP_URL`** defaults to `http://tap:2480` (the in-Docker hostname). When running the indexer directly on the host with `bun run dev`, change this to `http://localhost:2480`.

### 3. Start infrastructure and run migrations

```bash
bun run setup
```

This command does three things in sequence:

1. **`docker compose up -d db tap`** — starts the PostgreSQL 16 container (bound to `localhost:5432`) and the Tap relay container (bound to `localhost:2480`). Both use named Docker volumes so their data persists across restarts.
2. **Waits 3 seconds** — gives both containers time to finish initialising before the migration runs.
3. **`bun run src/db/migrate.ts`** — reads `src/db/schema.sql` and executes it against the database. This creates the `records`, `labels`, `pds_hosts`, and `cursor` tables, plus all indexes. The entire schema uses `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS`, so it is safe to run against an existing database — nothing is dropped or replaced.

You can verify the containers are running with:

```bash
docker compose ps
```

And confirm the schema was applied by connecting to the database:

```bash
docker exec -it gainforest-indexer-db-1 psql -U gainforest -d gainforest_indexer -c '\dt'
```

### 4. Generate TypeScript types from lexicons

> **This step must be run from the monorepo root**, not from `apps/indexer/`.
> The lexicons live at `GENERATED/lexicons/` — the shared source of truth for the whole monorepo.

```bash
# From the monorepo root (atproto-packages/)
bun run codegen           # fetch from GitHub + regenerate all types + indexer collections
bun run gen:indexer       # just regenerate indexer collections + types (no fetch)
```

The codegen pipeline does the following:

1. **Fetches lexicons** (`GENERATED/scripts/fetch-lexicons.sh`) — performs a shallow, sparse Git checkout of two upstream repositories into `GENERATED/lexicons/`:
   - `GainForest/lexicons` — GainForest-specific AT Protocol lexicon definitions
   - `hypercerts-org/hypercerts-lexicon` — Hypercerts lexicon definitions
2. **Generates package types** (`GENERATED/scripts/codegen.ts`) — runs `@atproto/lex build` pointing at `GENERATED/lexicons/`, outputs to `GENERATED/types/` (used by the npm packages).
3. **Generates indexer collections** (`GENERATED/scripts/generate-collections.ts`) — walks the same `GENERATED/lexicons/` and produces:
   - `src/tap/collections.ts` — the allow-list of collection NSIDs the indexer will index, plus inferred key types (`"literal:self"` vs `"tid"`)
   - `src/tap/validation.ts` — per-collection validation functions built from the generated types
   - Runs `@atproto/lex build` again, outputting indexer-specific types to `src/generated/`

> `src/generated/`, `src/tap/collections.ts`, and `src/tap/validation.ts` are committed to the repository.
> Run `bun run gen:indexer` from the monorepo root only when `GENERATED/lexicons/` has changed.

### 5. Start the indexer

```bash
bun run dev
```

On startup the indexer will:

1. **Connect to PostgreSQL** and confirm the schema is in place.
2. **Crawl `SEED_PDSS` hosts** *(if set)* — for each PDS URL, the indexer calls `com.atproto.sync.listRepos` (paginating until all repos are retrieved) and collects every active DID hosted there.
3. **Register seed DIDs with Tap** — the combined set of `SEED_DIDS` and any DIDs discovered via `SEED_PDSS` (deduplicated) is registered with Tap. If a DID is already tracked by Tap, the call is a no-op. Newly registered DIDs trigger an immediate full backfill: Tap fetches their entire AT Protocol repo history directly from their PDS using `com.atproto.sync.getRepo`, cryptographically verifies each commit, and streams the records into the indexer's WebSocket channel.
4. **Open a WebSocket channel to Tap** and begin consuming events. The indexer filters events to the indexed collection allow-list, optionally validates them with lexicon schemas, normalises any embedded blob references to compact CID form, and batch-upserts them to PostgreSQL.

Backfill progress can be monitored via:

```bash
curl http://localhost:2480/stats/repo-count    # repos Tap is tracking
curl http://localhost:2480/stats/record-count  # records Tap has delivered
curl http://localhost:4001/stats               # combined indexer + Tap stats
```

The **GraphQL API** is available immediately at **`http://localhost:4000/graphql`** — even while backfill is in progress, you can query whatever has already been indexed. Explore the schema interactively via [Apollo Sandbox](https://studio.apollo.dev/sandbox/explorer) by pointing it at that URL.

---

## Updating after a code change

When the repository has been updated — new lexicons, schema additions, dependency bumps, or logic changes — follow this sequence to bring a running installation up to date without losing any indexed data.

### 1. Pull the latest code

```bash
git pull
```

### 2. Install any new or updated dependencies

```bash
bun install
```

Bun compares `bun.lock` against what is currently installed and fetches only what changed. Any patches in `patches/` are re-applied automatically. This is always safe to run and is a no-op if nothing changed.

### 3. Apply database migrations

```bash
bun run db:migrate
```

The migration script re-executes `src/db/schema.sql` against the live database. Because every `CREATE TABLE` and `CREATE INDEX` statement uses `IF NOT EXISTS`, this is fully idempotent — new tables and indexes are added, existing ones are left untouched, and no data is ever dropped. Run this any time the schema file changes (check the git diff for `src/db/schema.sql` if you're unsure).

### 4. Re-generate TypeScript types (if lexicons changed)

> Run from the **monorepo root** (`atproto-packages/`):

```bash
bun run gen:indexer    # regenerate from GENERATED/lexicons/ (no network fetch)
# — or —
bun run codegen        # fetch from GitHub first, then regenerate everything
```

Only required when:
- `GENERATED/scripts/generate-collections.ts` has changed, **or**
- `GENERATED/lexicons/` has been updated (either manually or via `bun run fetch-lexicons`)

When in doubt, run `bun run gen:indexer` — it reads the committed `GENERATED/lexicons/` and completes in seconds. The generated files in `src/generated/` and `src/tap/collections.ts` / `src/tap/validation.ts` are overwritten in place.

> `src/generated/`, `src/tap/collections.ts`, and `src/tap/validation.ts` are committed to the repository, so this step is only needed when `GENERATED/lexicons/` has actually changed.

### 5. Restart the indexer

```bash
bun run dev        # development (file-watching, auto-restart)
bun run start      # production (single run)
```

Tap maintains its own cursor position in its SQLite state (the `tap_data` Docker volume). When the indexer reconnects, Tap resumes delivery from exactly where it left off — no events are skipped, and nothing already indexed is re-processed. Downtime during a code update results in a small backlog in Tap's outbox, which drains automatically once the indexer is back online.

---

## Resetting from scratch

Use this when you want to wipe all indexed data and start over — for example, after a breaking schema change, to test a clean backfill, or to recover from a corrupted state. This is destructive and cannot be undone.

### Full reset (recommended)

This tears down both Docker containers and their named volumes (deleting all PostgreSQL data and Tap's SQLite state), then recreates and re-migrates everything:

```bash
bun run docker:reset   # destroys volumes + containers, then recreates them
bun run db:migrate     # re-applies schema.sql to the fresh database
```

`docker:reset` is equivalent to `docker compose down -v && docker compose up -d db tap`. The `-v` flag removes the named volumes, so both the PostgreSQL data directory and Tap's SQLite cursor are wiped.

After this, Tap has no memory of any repos it was tracking. On the next `bun run dev`, the indexer will crawl any `SEED_PDSS` hosts and re-register all seed DIDs, triggering fresh backfills for each.

### Database-only reset (keep Tap state)

If you only want to clear the PostgreSQL records — for instance, to re-index from data Tap has already collected — you can reset just the database without touching Tap:

```bash
# Stop the indexer (Ctrl+C if running in dev mode)

# Drop and recreate just the database
docker exec -it gainforest-indexer-db-1 psql -U gainforest -d postgres \
  -c "DROP DATABASE gainforest_indexer;" \
  -c "CREATE DATABASE gainforest_indexer;"

# Re-apply the schema
bun run db:migrate
```

Because Tap's SQLite state is untouched, it still knows which repos it is tracking and where its cursor is. However, since the indexer's database is now empty, you will need to trigger a re-delivery of all records. The simplest way is to reset Tap's cursor by restarting its container with its volume cleared:

```bash
docker compose rm -sf tap
docker volume rm gainforest-indexer_tap_data   # adjust volume name if needed
docker compose up -d tap
```

Then restart the indexer — Tap will backfill everything from scratch into the freshly migrated database.

### Selective table wipe (advanced)

To clear only specific tables without dropping the whole database — for example, to re-index records while keeping cached PDS host mappings and quality labels:

```bash
docker exec -it gainforest-indexer-db-1 psql -U gainforest -d gainforest_indexer \
  -c "TRUNCATE TABLE records RESTART IDENTITY CASCADE;"
```

Or to also clear the PDS host cache (e.g. after bulk PDS migrations):

```bash
docker exec -it gainforest-indexer-db-1 psql -U gainforest -d gainforest_indexer \
  -c "TRUNCATE TABLE records, pds_hosts RESTART IDENTITY CASCADE;"
```

The `labels` table is safe to truncate independently — it is repopulated lazily from the Hyperlabel API as `activities` queries come in.

---

## Backfill

Backfill is handled entirely by Tap. You never need to run a separate script.

### How it works

When a DID is registered with Tap (either via `SEED_DIDS` on startup, via the GraphQL `addRepos` mutation, or via signal collection), Tap fetches that DID's full repo history directly from their PDS using `com.atproto.sync.getRepo`. The commits are verified cryptographically and streamed to the indexer's channel exactly like live events — the indexer processes them identically.

### Adding a new organisation

**Option A — via `SEED_PDSS` (whole PDS, permanent):**

Add the PDS host to `SEED_PDSS` in your `.env`:

```
SEED_PDSS=https://climateai.org
```

On every startup the indexer crawls the PDS, collects all active DIDs, and registers them with Tap. This is the easiest way to track an entire organisation's PDS — no need to list individual DIDs.

**Option B — via `SEED_DIDS` (individual DIDs, permanent):**

Add the DID to `SEED_DIDS` in your `.env` and restart the indexer. The DID will be re-registered on every startup (Tap deduplicates, so this is safe).

**Option C — via the GraphQL mutation (one-shot):**

```graphql
mutation {
  addRepos(dids: ["did:plc:yourorgdid"])
}
```

Tap begins backfilling immediately. If the indexer restarts before you add the DID to `SEED_DIDS` or `SEED_PDSS`, Tap remembers it in its own SQLite state — but it's good practice to add it to your `.env` so the indexer is the source of truth.

**Option D — via curl:**

```bash
curl -X POST http://localhost:2480/repos/add \
  -H 'Content-Type: application/json' \
  -u admin:$TAP_ADMIN_PASSWORD \
  -d '{"dids":["did:plc:yourorgdid"]}'
```

### Signal collection

Tap watches `org.hypercerts.claim.activity` records from the global firehose. Any DID that publishes one is automatically added to Tap's tracking list and backfilled — no manual registration needed. This is how new participants are auto-discovered.

### Monitoring backfill progress

```bash
# Number of repos Tap is tracking
curl http://localhost:2480/stats/repo-count

# Total records Tap has delivered
curl http://localhost:2480/stats/record-count

# Outbox buffer depth (0 = all caught up)
curl http://localhost:2480/stats/outbox-buffer

# Or via the health endpoint (combines indexer + Tap stats)
curl http://localhost:4001/stats
```

---

## Development

### Running in watch mode

```bash
bun run dev
```

Bun restarts the indexer automatically on any source file change.

### Type-checking

```bash
bun run typecheck
```

Runs `tsc --noEmit` across the whole project. The generated files (`src/generated/`, `src/tap/collections.ts`, `src/tap/validation.ts`) must exist first — run `bun run codegen` if you haven't already.

### Fetching updated lexicons

Lexicons are managed at the **monorepo root**. From `atproto-packages/`:

```bash
bun run codegen                  # fetch from GitHub + regenerate everything
bun run gen:indexer              # skip fetch, just regenerate indexer files
```

Or, to fetch only from a non-main branch of GainForest/lexicons:

```bash
# From the monorepo root
./GENERATED/scripts/fetch-lexicons.sh --gainforest-branch my-branch
bun run gen:indexer
```

### Database

```bash
bun run db:migrate          # apply schema (safe to re-run)
bun run docker:up           # start Postgres + Tap containers
bun run docker:down         # stop containers (data preserved)
bun run docker:reset        # destroy + recreate everything (wipes all data)
```

### Tap management scripts

```bash
# Add repos (backfills immediately)
bun run tap:add-repo '{"dids":["did:plc:abc123"]}'

# Check stats
bun run tap:stats
```

### Health endpoints

```
GET http://localhost:4001/health   → { "status": "ok" }
GET http://localhost:4001/ready    → { "ready": true, "status": "running" }  (503 if not yet connected)
GET http://localhost:4001/stats    → indexer stats + Tap server stats
```

---

## GraphQL API

### Endpoint

```
http://localhost:4000/graphql
```

### Mutations

```graphql
# Register a DID with Tap (triggers backfill)
mutation {
  addRepos(dids: ["did:plc:abc123", "did:plc:xyz456"])
}

# Stop tracking a DID
mutation {
  removeRepos(dids: ["did:plc:abc123"])
}
```

### Common query arguments

Every paginated collection query accepts:

| Argument | Type | Description |
|----------|------|-------------|
| `cursor` | `String` | Pagination token from `pageInfo.endCursor` |
| `limit` | `Int` | Page size — 1 to 100, default 50 |
| `did` | `String` | Filter to records authored by this DID |
| `handle` | `String` | Filter by AT Protocol handle (resolved to DID automatically) |
| `sortBy` | `SortField` | `CREATED_AT` (default) or `INDEXED_AT` |
| `order` | `SortOrder` | `DESC` (default, newest first) or `ASC` |

The `activities` query additionally accepts:

| Argument | Type | Description |
|----------|------|-------------|
| `labelTier` | `String` | Filter by Hyperlabel quality tier: `high-quality` \| `standard` \| `draft` \| `likely-test` |

### Query shape

```graphql
query {
  gainforest {
    dwc {
      occurrences(limit: 20, handle: "gainforest.bsky.social") {
        records { meta { uri did cid indexedAt } scientificName country }
        pageInfo { endCursor hasNextPage }
      }
      events(limit: 20) { ... }
      measurements(limit: 20) { ... }
    }
    evaluator {
      evaluations(limit: 20) { ... }
      services(limit: 20) { ... }
      subscriptions(limit: 20) { ... }
    }
    organization {
      infos(limit: 20) { ... }
      layers(limit: 20) { ... }
      defaultSites(limit: 20) { ... }
      observations {
        fauna(limit: 20) { ... }
        flora(limit: 20) { ... }
        dendograms(limit: 20) { ... }
        measuredTreesClusters(limit: 20) { ... }
      }
      predictions {
        fauna(limit: 20) { ... }
        flora(limit: 20) { ... }
      }
      recordings {
        audio(limit: 20) { ... }
      }
    }
  }

  hypercerts {
    activities(limit: 10, labelTier: "high-quality") {
      records {
        title shortDescription
        label { tier labeler labeledAt syncedAt }
      }
      pageInfo { endCursor hasNextPage }
    }
    collections(limit: 20) { ... }
    contributions(limit: 20) { ... }
    projects(limit: 20) { ... }
    fundingReceipts(limit: 20) { ... }
  }

  impactIndexer {
    attestations(limit: 20) { ... }
    comments(limit: 20) { ... }
    likes(limit: 20) { ... }
  }

  collectionStats { collection count }
}
```

### Pagination

```graphql
# First page
query {
  hypercerts {
    activities(limit: 20) {
      records { title }
      pageInfo { endCursor hasNextPage }
    }
  }
}

# Next page — pass endCursor as cursor
query {
  hypercerts {
    activities(limit: 20, cursor: "<endCursor from previous page>") {
      records { title }
      pageInfo { endCursor hasNextPage }
    }
  }
}
```

### Activity quality labels (Hyperlabel)

`org.hypercerts.claim.activity` records include a `label` field populated from the [Hyperlabel](https://hyperlabel-production.up.railway.app) AT Protocol labeller.

| Tier | Meaning |
|------|---------|
| `high-quality` | Well-documented record with comprehensive activity details |
| `standard` | Adequate record with basic activity information |
| `draft` | Minimal record — appears to be a work in progress |
| `likely-test` | Contains test or placeholder data |

Labels are served from a local `labels` table (zero added latency). After each `activities` query, the indexer fires a background request to the Hyperlabel API and refreshes labels for the returned author DIDs — so labels converge toward freshness on the next query without blocking the caller.

---

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | *(required)* | PostgreSQL connection string |
| `TAP_URL` | `http://tap:2480` | Tap server URL (use `http://localhost:2480` for local dev outside Docker) |
| `TAP_ADMIN_PASSWORD` | *(required)* | Admin password for Tap's management API |
| `SEED_DIDS` | *(optional)* | Comma-separated DIDs to register with Tap on every startup |
| `SEED_PDSS` | *(optional)* | Comma-separated PDS host URLs to crawl on startup — all active DIDs found are registered with Tap. Merged with `SEED_DIDS` and deduplicated. Example: `https://climateai.org` |
| `BATCH_SIZE` | `100` | Buffer N events before flushing to DB |
| `BATCH_TIMEOUT_MS` | `5000` | Flush after N ms even if batch is not full |
| `VALIDATE_RECORDS` | `true` | Validate records against lexicon schemas before storing |
| `LOG_VALIDATION_ERRORS` | `true` | Log validation errors to the console. Set to `false` to suppress all validation error logs (e.g. to reduce noise during backfill when many legacy records are expected to fail) |
| `LOG_VALIDATION_FILTER` | *(optional)* | Comma-separated collection NSIDs to selectively re-enable validation error logging when `LOG_VALIDATION_ERRORS=false`. Has no effect when `LOG_VALIDATION_ERRORS=true`. Example: `app.gainforest.organization.info,org.hypercerts.claim.activity` |
| `PDS_HOST_CACHE_TTL_SECONDS` | `3600` | In-memory TTL for DID → PDS host mappings. Hosts are also stored permanently in the `pds_hosts` table; this only controls the in-process LRU cache lifetime before the DB is re-consulted. Raise for fewer DB lookups; lower to reflect PDS migrations faster. |
| `HYPERLABEL_URL` | `https://hyperlabel-production.up.railway.app` | Hyperlabel labeller base URL |
| `HYPERLABEL_DID` | `did:plc:5rw6of6lry7ihmyhm323ycwn` | Hyperlabel labeller DID |
| `GRAPHQL_PORT` | `4000` | GraphQL API port |
| `HEALTH_PORT` | `4001` | Health check server port |
| `HOST` | `0.0.0.0` | Bind address for both servers |
| `LOG_LEVEL` | `info` | Log verbosity: `debug` \| `info` \| `warn` \| `error` |

---

## Scripts

### From this directory (`apps/indexer/`)

| Script | Description |
|--------|-------------|
| `bun run dev` | Start with file-watching (auto-restart on changes) |
| `bun run start` | Start in production mode |
| `bun run typecheck` | Run `tsc --noEmit` across the whole project |
| `bun run db:migrate` | Apply database migrations (creates tables and indexes) |
| `bun run docker:up` | Start the PostgreSQL and Tap Docker containers |
| `bun run docker:down` | Stop containers (data is preserved) |
| `bun run docker:reset` | Destroy and recreate containers (wipes all data) |
| `bun run setup` | `docker:up` + wait + `db:migrate` (one-shot first-time setup) |
| `bun run tap:add-repo` | Register DIDs with Tap via curl |
| `bun run tap:stats` | Print Tap repo-count and record-count |

---

## Project structure

```
atproto-packages/                              ← monorepo root
├── GENERATED/
│   ├── lexicons/                              ← SHARED LEXICON SOURCE OF TRUTH
│   └── scripts/
│       ├── fetch-lexicons.sh                  # Fetch from GainForest/lexicons + hypercerts-org/hypercerts-lexicon
│       ├── codegen.ts                         # Generate GENERATED/types/ for npm packages
│       └── generate-collections.ts            # Generate indexer's collections.ts, validation.ts, src/generated/
└── apps/indexer/                              ← this app
    ├── .env.example                           # All environment variables with documentation
    ├── Dockerfile                             # Multi-stage build (context = monorepo root)
    ├── docker-compose.yml                     # PostgreSQL 16 + Tap containers
    └── src/
        ├── index.ts                           # Entry point — starts TapSync + GraphQL + health servers
        ├── db/
        │   ├── index.ts                       # postgres connection pool
        │   ├── migrate.ts                     # Applies schema.sql
        │   ├── queries.ts                     # All DB query functions (records, labels, pds_hosts)
        │   ├── schema.sql                     # PostgreSQL schema + indexes (records, labels, pds_hosts, cursor)
        │   └── types.ts                       # RecordRow, LabelRow, PaginationParams, PageResult, etc.
        ├── identity/
        │   └── pds.ts                         # PDS host resolution — two-tier cache (LRU + pds_hosts table) + plc.directory fallback
        ├── tap/
        │   ├── blobs.ts                       # Blob normalisation — converts decoded CID byte-arrays to compact string form
        │   ├── collections.ts                 # AUTO-GENERATED by gen:indexer — indexed collection allow-list + key types
        │   ├── validation.ts                  # AUTO-GENERATED by gen:indexer — validation functions per collection
        │   ├── consumer.ts                    # TapConsumer — wraps @atproto/tap Tap + SimpleIndexer
        │   ├── handler.ts                     # EventHandler — batching, validation, blob normalisation, DB writes
        │   ├── pds.ts                         # PDS crawler — listRepos pagination, used to expand SEED_PDSS into DIDs
        │   └── index.ts                       # TapSync — orchestration class (seed DIDs, SEED_PDSS crawl, start/stop)
        ├── generated/                         # AUTO-GENERATED by gen:indexer — committed to git
        │   └── index.ts                       # Re-exports app, pub, com, org namespaces
        ├── graphql/
        │   ├── builder.ts                     # Pothos SchemaBuilder + DateTime/JSON scalars + enums
        │   ├── identity.ts                    # resolveActorToDid() — handle→DID with 10-min TTL cache
        │   ├── tap-context.ts                 # Singleton to expose TapSync to GraphQL resolvers
        │   ├── types.ts                       # PageInfoType, RecordMetaType, BlobRefType, extractBlobRef, helpers
        │   ├── schema.ts                      # Assembles the full GraphQL schema
        │   ├── server.ts                      # GraphQL Yoga HTTP server
        │   └── resolvers/
        │       ├── gainforest.ts              # gainforest { dwc evaluator organization } namespace
        │       ├── hypercerts.ts              # hypercerts { ... } namespace (activities carry label field)
        │       ├── impactIndexer.ts           # impactIndexer { ... } namespace
        │       ├── stats.ts                   # collectionStats query
        │       └── tap.ts                     # addRepos / removeRepos mutations
        ├── labeller/
        │   └── hyperlabel.ts                  # Hyperlabel API client — fetchLabelsForDids, refreshLabelsAsync
        └── health/
            └── index.ts                       # Health server (/health, /ready, /stats)
```

---

## Technical notes

- **`exactOptionalPropertyTypes` is disabled** — required for compatibility with `@atproto/lex`-generated types.
- **`app.certified.*` exclusion** — these four lexicons use a mixed-type union (string DID ref + object strongRef) that `@atproto/lex` cannot represent in valid TypeScript. Excluded via `EXCLUDED_COLLECTIONS` in `GENERATED/scripts/generate-collections.ts`.
- **Tap's cursor lives in Tap, not in Postgres** — the `cursor` table in `schema.sql` is kept for potential rollback but is unused. Tap persists its own position in its SQLite database (`tap_data` Docker volume), so the indexer never needs to manage cursor state.
- **Handle resolution** — `resolveActorToDid()` in `src/graphql/identity.ts` calls the public Bluesky AppView API. Results are cached in-process with a 10-minute TTL, bounded to 1000 entries.
- **Label refresh strategy** — the `labels` table caches one quality tier per (subject DID, labeller DID) pair. After every `activities` query, `refreshLabelsAsync()` fires a non-blocking background request to the Hyperlabel API and upserts any updated labels. The caller always receives the current DB state with zero added latency; labels converge toward freshness on the next request.
- **Blob normalisation** — `@atproto/lex` deserialises CID references into a verbose decoded form (`{ $type: "blob", ref: { hash: { 0: 18, 1: 32, … } } }`). At indexing time, `src/tap/blobs.ts` walks every record recursively and converts all blobs to a compact form (`{ $type: "blob", cid: "Qm…", mimeType, size }`) using `multiformats/cid` before writing to PostgreSQL. This keeps the stored JSONB small and makes CIDs directly queryable.
- **PDS host resolution** — blob URIs are constructed at query time using the DID's PDS service endpoint (e.g. `https://climateai.org`), looked up from [`plc.directory`](https://plc.directory). `src/identity/pds.ts` maintains a two-tier cache: an in-process LRU (1000 entries, TTL from `PDS_HOST_CACHE_TTL_SECONDS`) backed by the `pds_hosts` PostgreSQL table (permanent, no TTL). The plc.directory is only reached on first encounter. On a cache miss, up to 10 DIDs are resolved in parallel. Falls back to `https://unknown.invalid` on any error so blob URIs are never null — the domain is RFC 2606 reserved and will never resolve, making stale entries easy to find in logs.
- **Batch insert workaround** — the `postgres` library's `sql(array, ...cols)` helper crashes when values include `sql.json()`. All batch writes use `sql.begin()` with individual parameterised statements, which PostgreSQL pipelines within the transaction for equivalent throughput at the batch sizes used here (≤ 100 rows).
