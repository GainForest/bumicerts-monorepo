# @gainforest/indexer

AT Protocol indexer for GainForest. Syncs records from custom lexicons across the network, stores them in PostgreSQL, and serves them via GraphQL.

> Part of the `atproto-packages` monorepo. Run codegen from the root: `bun run gen:indexer`

---

## Architecture

```
AT Protocol Network
        ↓
   Tap (:2480)  ← verifies commits, handles backfill
        ↓
  Indexer      ← filters, validates, batches
        ↓
  PostgreSQL   → GraphQL API (:4000)
```

Tap handles crypto verification, cursor management, and full-history backfilling. The indexer filters events, validates against lexicon schemas, and writes to PostgreSQL.

---

## Quick Start

### 1. Generate lexicon types

From the **monorepo root** (`atproto-packages/`):
```bash
bun run codegen
```

This fetches lexicons from GitHub and generates TypeScript types.

### 2. Install dependencies
```bash
# Back in apps/indexer/
bun install
```

### 3. Configure
```bash
cp .env.example .env
```

Edit `.env` - see [Environment Variables](#environment-variables) for all options. At minimum, set:
- `TAP_ADMIN_PASSWORD` - Pick a strong password
- `DATABASE_URL` - Use default for Docker Postgres, or set your own

### 4. Setup infrastructure
```bash
bun run setup
```

Starts Docker containers (Postgres + Tap) and runs database migrations.

### 5. Run
```bash
bun run dev
```

GraphQL API: `http://localhost:4000/graphql`

---

## Updating & Migrations

### After code changes
```bash
git pull
bun install              # Update dependencies
bun run db:migrate       # Apply schema changes
```

From monorepo root (if lexicons changed):
```bash
bun run gen:indexer      # Regenerate types
```

Then restart:
```bash
bun run dev
```

### Reset database
Wipe all data and start fresh:

```bash
bun run docker:reset     # Destroy containers + volumes
bun run db:migrate       # Re-apply schema
bun run dev              # Fresh backfill
```

Database only (keep Tap state):
```bash
docker exec -it gainforest_db psql -U gainforest -d postgres \
  -c "DROP DATABASE gainforest_indexer;" \
  -c "CREATE DATABASE gainforest_indexer;"
bun run db:migrate
bun run dev
```

---

## DID Discovery

The indexer discovers DIDs to backfill using three methods:

### Network-wide Discovery (recommended)
Queries the relay for all DIDs that have used your lexicons:

```bash
ENABLE_DISCOVERY=true
DISCOVERY_COLLECTIONS=app.certified.actor.profile,app.gainforest.organization.info,org.hypercerts.claim.activity
```

Runs on startup. Discovers ~189 DIDs currently. Takes 1-5 minutes.

**Disable for faster startup:**
```bash
ENABLE_DISCOVERY=false
```

### PDS Crawling
Crawl specific PDS hosts:

```bash
SEED_PDSS=https://climateai.org
```

### Manual DIDs
Explicit DID list:

```bash
SEED_DIDS=did:plc:abc123,did:plc:xyz456
```

**All three methods are combined and deduplicated.** Discovered DIDs are passed to Tap for full historical backfilling.

---

## Environment Variables

### Required
| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Postgres connection string |
| `TAP_ADMIN_PASSWORD` | Admin password for Tap API |

### Discovery
| Variable | Default | Description |
|----------|---------|-------------|
| `ENABLE_DISCOVERY` | `true` | Network-wide DID discovery via relay |
| `DISCOVERY_COLLECTIONS` | GainForest + Hypercerts | Comma-separated collection NSIDs to discover |
| `DISCOVERY_RELAY_URL` | `https://bsky.network` | Relay endpoint for discovery |
| `DISCOVERY_BATCH_SIZE` | `500` | DIDs to add per batch (rate limiting) |

### Seeding
| Variable | Default | Description |
|----------|---------|-------------|
| `SEED_DIDS` | *(empty)* | Comma-separated DIDs to track |
| `SEED_PDSS` | *(empty)* | Comma-separated PDS hosts to crawl |

### Tap Connection
| Variable | Default | Description |
|----------|---------|-------------|
| `TAP_URL` | `http://tap:2480` | Tap server URL (use `http://localhost:2480` for local dev) |

### Performance
| Variable | Default | Description |
|----------|---------|-------------|
| `BATCH_SIZE` | `100` | Events to buffer before flushing to DB |
| `BATCH_TIMEOUT_MS` | `5000` | Max milliseconds before forced flush |
| `VALIDATE_RECORDS` | `true` | Validate records against schemas |
| `LOG_VALIDATION_ERRORS` | `true` | Log validation errors |
| `PDS_HOST_CACHE_TTL_SECONDS` | `3600` | DID→PDS host cache TTL |

### Servers
| Variable | Default | Description |
|----------|---------|-------------|
| `GRAPHQL_PORT` | `4000` | GraphQL API port |
| `HEALTH_PORT` | `4001` | Health check port |
| `HOST` | `0.0.0.0` | Bind address |
| `LOG_LEVEL` | `info` | `debug` \| `info` \| `warn` \| `error` |

### Labeller (Optional HuggingFace Classifier)
| Variable | Default | Description |
|----------|---------|-------------|
| `HF_TOKEN` | _(empty — disabled)_ | HuggingFace API token for optional AI classification |
| `HF_MODEL` | `facebook/bart-large-mnli` | HuggingFace model for zero-shot classification |

---

## GraphQL API

### Endpoint
```
http://localhost:4000/graphql
```

### Example Query
```graphql
query {
  hypercerts {
    activities(limit: 10) {
      records {
        title
        shortDescription
        label { tier }
        meta { uri did indexedAt }
      }
      pageInfo { endCursor hasNextPage }
    }
  }
  
  gainforest {
    organization {
      infos(limit: 5, handle: "gainforest.bsky.social") {
        records { name description }
      }
    }
  }
}
```

### Namespaces
- `certified` - Certified badges and profiles
- `gainforest.dwc` - Darwin Core biodiversity records
- `gainforest.evaluator` - Evaluation services
- `gainforest.organization` - Organization data and observations
- `hypercerts` - Hypercerts activities and collections
- `impactIndexer` - Attestations and reviews

### Common Arguments
| Argument | Type | Description |
|----------|------|-------------|
| `limit` | `Int` | Page size (1-100, default 50) |
| `cursor` | `String` | Pagination token from `pageInfo.endCursor` |
| `did` | `String` | Filter by author DID |
| `handle` | `String` | Filter by handle (resolved to DID) |
| `sortBy` | `SortField` | `CREATED_AT` (default) or `INDEXED_AT` |
| `order` | `SortOrder` | `DESC` (default) or `ASC` |
| `labelTier` | `String` | (activities only) `high-quality` \| `standard` \| `draft` \| `likely-test` |

### Mutations
```graphql
# Add DIDs (triggers backfill)
mutation {
  addRepos(dids: ["did:plc:abc123"])
}

# Remove DIDs
mutation {
  removeRepos(dids: ["did:plc:abc123"])
}
```

---

## Development

### Commands
```bash
bun run dev              # Start with file watching
bun run start            # Production mode
bun run typecheck        # Type check
bun run db:migrate       # Apply migrations
bun run docker:up        # Start containers
bun run docker:down      # Stop containers
bun run docker:reset     # Wipe all data and restart
```

### Codegen (from monorepo root)
```bash
bun run codegen          # Fetch lexicons + regenerate all
bun run gen:indexer      # Just regenerate indexer files
```

### Health Endpoints
```
GET /health   → { "status": "ok" }
GET /ready    → { "ready": true, ... }  (503 if Tap not connected)
GET /stats    → { indexer + Tap stats }
```

### Monitoring Backfill
```bash
curl http://localhost:2480/stats/repo-count      # DIDs tracked
curl http://localhost:2480/stats/record-count    # Records delivered
curl http://localhost:2480/stats/outbox-buffer   # Backlog (0 = caught up)
```

---

## Production Deployment

### Railway (Recommended)

See **[RAILWAY.md](./RAILWAY.md)** for a complete guide to deploying on Railway with:
- Postgres database
- Tap service with persistent volume
- Indexer with GraphQL API

The guide includes all environment variables and step-by-step instructions.

### Docker Compose

For self-hosted deployments:

```bash
# From monorepo root
docker build -f apps/indexer/Dockerfile.railway -t gainforest-indexer .
```

```yaml
services:
  indexer:
    image: gainforest-indexer:latest
    ports:
      - "4000:4000"
      - "4001:4001"
    environment:
      DATABASE_URL: postgres://...
      TAP_URL: http://tap:2480
      TAP_ADMIN_PASSWORD: ${TAP_ADMIN_PASSWORD}
      ENABLE_DISCOVERY: "true"
  
  tap:
    image: ghcr.io/bluesky-social/indigo/tap:latest
    volumes:
      - tap_data:/data
    environment:
      TAP_DATABASE_URL: sqlite:///data/tap.db
      TAP_RELAY_URL: https://bsky.network
      TAP_SIGNAL_COLLECTION: org.hypercerts.claim.activity
      TAP_COLLECTION_FILTERS: ${TAP_COLLECTION_FILTERS}
      TAP_ADMIN_PASSWORD: ${TAP_ADMIN_PASSWORD}
```

**Important:** Run `bun run sync:filters` to generate `TAP_COLLECTION_FILTERS` from your indexed collections.

---

## Backfilling

Backfill is automatic via Tap. When a DID is registered (via discovery, `SEED_DIDS`, `SEED_PDSS`, or mutation), Tap:
1. Fetches full repo history from the DID's PDS
2. Verifies all commits cryptographically
3. Streams records to the indexer

### Add DIDs Manually

**Via GraphQL:**
```graphql
mutation { addRepos(dids: ["did:plc:abc123"]) }
```

**Via curl:**
```bash
curl -X POST http://localhost:2480/repos/add \
  -u admin:$TAP_ADMIN_PASSWORD \
  -H 'Content-Type: application/json' \
  -d '{"dids":["did:plc:abc123"]}'
```

### Signal Collection
Tap auto-discovers DIDs that publish `org.hypercerts.claim.activity` records.

---

## Project Structure

```
apps/indexer/
├── src/
│   ├── index.ts              # Entry point
│   ├── db/                   # Postgres queries, migrations
│   ├── tap/
│   │   ├── discovery.ts      # Network-wide DID discovery
│   │   ├── index.ts          # TapSync orchestration
│   │   ├── consumer.ts       # WebSocket to Tap
│   │   ├── handler.ts        # Event batching + validation
│   │   ├── pds.ts            # PDS crawler
│   │   ├── collections.ts    # AUTO-GENERATED allow-list
│   │   └── validation.ts     # AUTO-GENERATED validators
│   ├── graphql/
│   │   ├── schema.ts         # GraphQL schema
│   │   ├── server.ts         # Yoga server
│   │   └── resolvers/        # Query/mutation resolvers
│   ├── labeller/             # Hyperlabel API client
│   └── health/               # Health check server
├── docker-compose.yml        # Postgres + Tap
├── Dockerfile               # Production image
└── .env.example             # All config options
```

---

## License

MIT
