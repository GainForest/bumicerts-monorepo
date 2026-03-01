# Migration Plan: Jetstream → Tap

## Overview

Replace the current Jetstream-based firehose with Bluesky's **Tap** (https://github.com/bluesky-social/indigo/blob/main/cmd/tap/README.md) utility for verified AT Protocol sync with automatic backfill, cryptographic verification, and simplified cursor management.

### Key Decisions
- **Migration strategy**: Hard cutover (no parallel testing)
- **Backfill**: Delete manual PDS backfill script entirely; rely on Tap
- **Repo discovery**: Signal collection (`org.hypercerts.claim.activity`) + explicit DID management
- **Tap database**: SQLite (separate from PostgreSQL)
- **Tap API**: Externally exposed with admin password authentication
- **GainForest DIDs**: Seed known organization DIDs on startup

---

## Phase 1: Infrastructure Setup

### Task 1.1: Add Tap to Docker Compose
**File**: `docker-compose.yml`

Add the Tap service alongside the existing PostgreSQL container:

```yaml
services:
  db:
    # ... existing postgres config ...

  tap:
    image: ghcr.io/bluesky-social/indigo/tap:latest
    container_name: gainforest_tap
    restart: unless-stopped
    ports:
      - "2480:2480"
    volumes:
      - tap_data:/data
    environment:
      TAP_DATABASE_URL: sqlite:///data/tap.db
      TAP_BIND: ":2480"
      TAP_SIGNAL_COLLECTION: org.hypercerts.claim.activity
      TAP_COLLECTION_FILTERS: "app.gainforest.*,org.hypercerts.*,org.impactindexer.*"
      TAP_DISABLE_ACKS: "false"
      TAP_ADMIN_PASSWORD: ${TAP_ADMIN_PASSWORD}
      TAP_LOG_LEVEL: info
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:2480/health"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
    driver: local
  tap_data:
    driver: local
```

### Task 1.2: Update Environment Configuration
**File**: `.env.example`

Replace Jetstream config with Tap config:

```bash
# ============================================================
# TAP SYNC SERVICE
# ============================================================

# Tap server URL (internal Docker network or external)
TAP_URL=http://tap:2480

# Admin password for Tap API (required for adding/removing repos)
TAP_ADMIN_PASSWORD=your-secure-password-here

# ============================================================
# SEED DIDS (optional)
# Known GainForest organization DIDs to track on startup.
# Comma-separated list. These are added via Tap API on boot.
# ============================================================
SEED_DIDS=did:plc:gainforest-org-1,did:plc:gainforest-org-2
```

**Remove these variables** (no longer needed):
- `JETSTREAM_URL`
- `CURSOR_PERSIST_EVENTS`
- `CURSOR_PERSIST_INTERVAL_MS`
- `BACKFILL_HOURS`
- `BACKFILL_FULL`

---

## Phase 2: Install Dependencies

### Task 2.1: Add @atproto/tap Client
**File**: `package.json`

```bash
bun add @atproto/tap
```

```json
{
  "dependencies": {
    "@atproto/tap": "^0.1.0",
    // ... existing deps ...
  }
}
```

---

## Phase 3: Rewrite Firehose Consumer

### Task 3.1: Create New Tap Consumer
**New file**: `src/tap/consumer.ts`

Replace the complex Jetstream consumer with a simple Tap client:

```typescript
/**
 * Tap WebSocket consumer.
 *
 * Connects to a Tap instance for verified AT Protocol sync.
 * Tap handles: backfill, cursor management, reconnection, verification.
 */

import { Tap, SimpleIndexer, type TapChannel, type RecordEvent, type IdentityEvent } from '@atproto/tap'
import type { EventHandler } from './handler.ts'

export class TapConsumer {
  private readonly tap: Tap
  private readonly handler: EventHandler
  private channel: TapChannel | null = null

  status: 'idle' | 'running' | 'stopped' = 'idle'

  constructor(options: {
    tapUrl: string
    adminPassword?: string
    handler: EventHandler
  }) {
    this.tap = new Tap(options.tapUrl, {
      adminPassword: options.adminPassword,
    })
    this.handler = options.handler
  }

  async start(): Promise<void> {
    this.status = 'running'

    const indexer = new SimpleIndexer()

    indexer.record(async (evt: RecordEvent) => {
      if (evt.action === 'create') {
        this.handler.handleCreate(evt)
      } else if (evt.action === 'update') {
        this.handler.handleUpdate(evt)
      } else if (evt.action === 'delete') {
        this.handler.handleDelete(evt)
      }
    })

    indexer.identity(async (evt: IdentityEvent) => {
      if (!evt.isActive) {
        await this.handler.handleAccountTombstone(evt)
      }
    })

    indexer.error((err) => {
      console.error('[tap] Error:', err)
    })

    this.channel = this.tap.channel(indexer)
    
    // This promise resolves when the channel is destroyed
    await this.channel.start()
  }

  async stop(): Promise<void> {
    this.status = 'stopped'
    if (this.channel) {
      await this.channel.destroy()
      this.channel = null
    }
  }

  /**
   * Add repos to track (triggers backfill).
   */
  async addRepos(dids: string[]): Promise<void> {
    await this.tap.addRepos(dids)
  }

  /**
   * Remove repos from tracking.
   */
  async removeRepos(dids: string[]): Promise<void> {
    await this.tap.removeRepos(dids)
  }

  /**
   * Get Tap client for direct API access.
   */
  getTap(): Tap {
    return this.tap
  }
}
```

### Task 3.2: Simplify Event Handler
**File**: `src/tap/handler.ts` (renamed/simplified from `src/firehose/handler.ts`)

Simplify the handler since Tap handles cursor management:

```typescript
/**
 * Tap event handler.
 *
 * Simplified from the Jetstream handler:
 * - No cursor management (Tap handles this)
 * - Same batching logic for DB writes
 * - Same validation logic
 */

import type { RecordEvent, IdentityEvent } from '@atproto/tap'
import { isIndexedCollection } from './collections.ts'
import { upsertRecords, deleteRecord, deleteRecordsByDid } from '@/db/queries.ts'
import type { RecordInsert } from '@/db/types.ts'
import { validateRecord } from './validation.ts'

// ... (same batching/flush logic, but remove all cursor ticking)
```

### Task 3.3: Create Tap Orchestration Class
**New file**: `src/tap/index.ts`

```typescript
/**
 * Tap — main orchestration class.
 *
 * Ties together:
 *   - TapConsumer (WebSocket connection)
 *   - EventHandler (batching, validation, DB writes)
 *   - Seed DID management (add GainForest org DIDs on startup)
 */

import { EventHandler } from './handler.ts'
import { TapConsumer } from './consumer.ts'

export class TapSync {
  private readonly consumer: TapConsumer
  private readonly handler: EventHandler
  private readonly seedDids: string[]

  constructor(options: {
    tapUrl?: string
    adminPassword?: string
    batchSize?: number
    batchTimeoutMs?: number
    validateRecords?: boolean
    seedDids?: string[]
  } = {}) {
    const tapUrl = options.tapUrl ?? process.env.TAP_URL ?? 'http://localhost:2480'
    const adminPassword = options.adminPassword ?? process.env.TAP_ADMIN_PASSWORD

    this.seedDids = options.seedDids ?? 
      (process.env.SEED_DIDS?.split(',').filter(Boolean) ?? [])

    this.handler = new EventHandler({
      batchSize: options.batchSize,
      batchTimeoutMs: options.batchTimeoutMs,
      validateRecords: options.validateRecords,
    })

    this.consumer = new TapConsumer({
      tapUrl,
      adminPassword,
      handler: this.handler,
    })
  }

  async start(): Promise<void> {
    console.log('\n=== GainForest Indexer — Tap Sync Starting ===\n')

    // Seed known GainForest organization DIDs
    if (this.seedDids.length > 0) {
      console.log(`  Seeding ${this.seedDids.length} DIDs...`)
      await this.consumer.addRepos(this.seedDids)
    }

    // Start consuming events (blocks until destroyed)
    await this.consumer.start()
  }

  async stop(): Promise<void> {
    console.log('\n[tap] Stopping...')
    await this.consumer.stop()
    await this.handler.flush()
    console.log('[tap] Stopped cleanly.')
  }

  // Expose for GraphQL mutations or admin API
  async addRepos(dids: string[]): Promise<void> {
    await this.consumer.addRepos(dids)
  }

  async removeRepos(dids: string[]): Promise<void> {
    await this.consumer.removeRepos(dids)
  }

  getStats() {
    return {
      status: this.consumer.status,
      ...this.handler.stats,
    }
  }
}
```

---

## Phase 4: Update Entry Point

### Task 4.1: Replace Firehose with TapSync
**File**: `src/index.ts`

```typescript
import { TapSync } from '@/tap/index.ts'
import { startHealthServer } from '@/health/index.ts'
import { startGraphQLServer } from '@/graphql/server.ts'

const tap = new TapSync()

startHealthServer(tap)
startGraphQLServer()

// Graceful shutdown
let isShuttingDown = false

async function shutdown(signal: string): Promise<void> {
  if (isShuttingDown) return
  isShuttingDown = true
  console.log(`\n[main] Received ${signal}, shutting down...`)
  await tap.stop()
  process.exit(0)
}

process.on('SIGINT', () => void shutdown('SIGINT'))
process.on('SIGTERM', () => void shutdown('SIGTERM'))

await tap.start()
```

---

## Phase 5: Clean Up Deleted Code

### Task 5.1: Delete Old Firehose Directory
**Delete entire directory**: `src/firehose/`

Files being removed:
- `src/firehose/consumer.ts` (206 lines) — replaced by `src/tap/consumer.ts`
- `src/firehose/cursor.ts` (93 lines) — **no replacement needed** (Tap handles cursors)
- `src/firehose/handler.ts` (284 lines) — simplified version in `src/tap/handler.ts`
- `src/firehose/index.ts` (173 lines) — replaced by `src/tap/index.ts`
- `src/firehose/types.ts` — simplified/merged

**Keep and move**:
- `src/firehose/collections.ts` → `src/tap/collections.ts` (auto-generated)
- `src/firehose/validation.ts` → `src/tap/validation.ts` (auto-generated)

### Task 5.2: Delete Backfill Script
**Delete file**: `scripts/backfill.ts` (366 lines)

No replacement needed — Tap handles all backfill automatically.

### Task 5.3: Update npm Scripts
**File**: `package.json`

Remove:
```json
"backfill": "bun run scripts/backfill.ts"
```

Add:
```json
"tap:add-repo": "curl -X POST http://localhost:2480/repos/add -H 'Content-Type: application/json' -u admin:$TAP_ADMIN_PASSWORD -d",
"tap:stats": "curl http://localhost:2480/stats/repo-count && curl http://localhost:2480/stats/record-count"
```

### Task 5.4: Update Database Schema
**File**: `src/db/schema.sql`

The `cursor` table is **no longer needed** since Tap manages its own cursor in SQLite. Keep it for now (harmless, just unused) in case a rollback is ever needed.

### Task 5.5: Remove Cursor DB Functions
**File**: `src/db/queries.ts`

Remove these functions (no longer called):
- `getCursor()`
- `setCursor()`

---

## Phase 6: Optional Enhancements

### Task 6.1: Add GraphQL Mutations for Repo Management

Expose Tap's repo management through your GraphQL API:

```graphql
type Mutation {
  addRepos(dids: [String!]!): Boolean!
  removeRepos(dids: [String!]!): Boolean!
}
```

### Task 6.2: Add Tap Stats to Health Endpoint

Extend your health server to include Tap stats:

```typescript
// GET /stats now includes Tap stats
{
  indexer: { ... },
  tap: {
    repoCount: await fetch('http://tap:2480/stats/repo-count'),
    recordCount: await fetch('http://tap:2480/stats/record-count'),
    outboxBuffer: await fetch('http://tap:2480/stats/outbox-buffer'),
  }
}
```

---

## Phase 7: Testing & Deployment

### Task 7.1: Local Testing Checklist

1. `docker compose up -d` — verify Tap starts and shows `"status":"ok"` at `:2480/health`
2. `curl http://localhost:2480/stats/repo-count` — should show `0` initially
3. `bun run dev` — indexer connects to Tap
4. Verify signal collection kicks in — any repo creating `org.hypercerts.claim.activity` should auto-track
5. Manually add a GainForest org: `curl -X POST http://localhost:2480/repos/add -H 'Content-Type: application/json' -u admin:password -d '{"dids":["did:plc:..."]}'`
6. Query GraphQL — verify records appear

### Task 7.2: Production Deployment

1. Add `TAP_ADMIN_PASSWORD` to production secrets
2. Add `SEED_DIDS` with known GainForest organization DIDs
3. Deploy Tap container alongside existing services
4. Deploy updated indexer
5. Monitor Tap logs for backfill progress

---

## Summary: Lines of Code Impact

| Action | Lines Removed | Lines Added | Net |
|--------|--------------|-------------|-----|
| Delete `firehose/consumer.ts` | -206 | — | -206 |
| Delete `firehose/cursor.ts` | -93 | — | -93 |
| Delete `firehose/index.ts` | -173 | — | -173 |
| Simplify `handler.ts` | -50 | — | -50 |
| Delete `scripts/backfill.ts` | -366 | — | -366 |
| New `tap/consumer.ts` | — | +80 | +80 |
| New `tap/index.ts` | — | +70 | +70 |
| Update `docker-compose.yml` | — | +25 | +25 |
| Update `.env.example` | -15 | +10 | -5 |
| **Total** | **-903** | **+185** | **-718** |

**Net reduction: ~720 lines of code** while gaining:
- Cryptographic verification
- Automatic full-history backfill
- Signal-based repo auto-discovery
- Simplified cursor management
- Official Bluesky-maintained sync infrastructure

---

## File Structure After Migration

```
gainforest-indexer/
├── docker-compose.yml          # + Tap service
├── .env.example                 # Updated config
├── package.json                 # + @atproto/tap, removed backfill script
├── scripts/
│   ├── fetch-lexicons.sh       # unchanged
│   └── generate-collections.ts # unchanged
└── src/
    ├── index.ts                # Uses TapSync instead of Firehose
    ├── db/                     # unchanged (cursor table unused but kept)
    ├── tap/                    # NEW — replaces firehose/
    │   ├── consumer.ts         # Tap WebSocket client
    │   ├── handler.ts          # Simplified event handler
    │   ├── index.ts            # TapSync orchestration
    │   ├── collections.ts      # moved from firehose/
    │   └── validation.ts       # moved from firehose/
    ├── graphql/                # unchanged
    ├── health/                 # minor updates for Tap stats
    ├── labeller/               # unchanged
    └── generated/              # unchanged
```
