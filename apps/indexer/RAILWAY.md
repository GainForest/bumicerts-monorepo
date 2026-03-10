# Deploying to Railway

This guide walks you through deploying the GainForest Indexer stack to Railway.

## Architecture

The indexer requires three services:

```
┌─────────────────────────────────────────────────────────┐
│                     Railway Project                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────┐    ┌──────────┐    ┌──────────────────┐  │
│  │ Postgres │◄───│   Tap    │◄───│     Indexer      │  │
│  │ (plugin) │    │ (docker) │    │    (docker)      │  │
│  └──────────┘    └────┬─────┘    └────────┬─────────┘  │
│                       │                    │            │
│                  ┌────┴────┐          ┌────┴────┐      │
│                  │ Volume  │          │ GraphQL │      │
│                  │ /data   │          │  :4000  │      │
│                  └─────────┘          └─────────┘      │
│                                                          │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
                 AT Protocol Network
                  (bsky.network)
```

## Quick Deploy (Recommended)

### Step 1: Create a new Railway project

1. Go to [railway.app](https://railway.app) and create a new project
2. Choose "Empty Project"

### Step 2: Add PostgreSQL

1. Click **+ New** → **Database** → **PostgreSQL**
2. Wait for it to provision (takes ~30 seconds)
3. No configuration needed - Railway handles everything

### Step 3: Add Tap Service

1. Click **+ New** → **GitHub Repo**
2. Select your this repository
3. Railway will auto-detect the monorepo. Click **Add Service** anyway.
4. Go to **Settings** tab:
   - **Root Directory**: Leave empty (monorepo root)
   - **Config Path**: `apps/indexer/railway/tap.railway.json`
5. Go to **Variables** tab and add:

```bash
TAP_DATABASE_URL=sqlite:///data/tap.db
TAP_BIND=:2480
TAP_RELAY_URL=https://bsky.network
TAP_SIGNAL_COLLECTION=org.hypercerts.claim.activity
TAP_COLLECTION_FILTERS=app.bumicerts.*,app.certified.*,app.gainforest.*,org.hyperboards.*,org.hypercerts.*,org.impactindexer.*
TAP_DISABLE_ACKS=false
TAP_ADMIN_PASSWORD=${{secret(32)}}
TAP_LOG_LEVEL=info
```

6. Go to **Volumes** tab:
   - Click **+ New Volume**
   - Mount path: `/data`
   - This persists Tap's SQLite database and cursor

7. **Important**: Do NOT expose Tap publicly (no need for a domain)

### Step 4: Add Indexer Service

1. Click **+ New** → **GitHub Repo**
2. Select the repository again
3. Go to **Settings** tab:
   - **Root Directory**: Leave empty
   - **Config Path**: `apps/indexer/railway.json`
4. Go to **Variables** tab and add:

```bash
# Database - uses Railway reference variable
DATABASE_URL=${{Postgres.DATABASE_URL}}

# Tap connection - uses Railway private networking
TAP_URL=http://${{tap.RAILWAY_PRIVATE_DOMAIN}}:2480
TAP_ADMIN_PASSWORD=${{tap.TAP_ADMIN_PASSWORD}}

# Discovery
ENABLE_DISCOVERY=true
DISCOVERY_COLLECTIONS=app.certified.actor.profile,app.gainforest.organization.info,org.hypercerts.claim.activity
DISCOVERY_RELAY_URL=https://bsky.network
DISCOVERY_BATCH_SIZE=500

# Ports
GRAPHQL_PORT=4000
HEALTH_PORT=4001
HOST=0.0.0.0

# Performance
LOG_LEVEL=info
BATCH_SIZE=100
BATCH_TIMEOUT_MS=5000
VALIDATE_RECORDS=true
LOG_VALIDATION_ERRORS=true
PDS_HOST_CACHE_TTL_SECONDS=3600

# Hyperlabel
HYPERLABEL_URL=https://hyperlabel-production.up.railway.app
HYPERLABEL_DID=did:plc:5rw6of6lry7ihmyhm323ycwn
```

5. Go to **Networking** tab:
   - Click **Generate Domain** for public GraphQL access
   - Or use a custom domain

### Step 5: Deploy

1. Railway will automatically build and deploy all services
2. Check the **Deployments** tab to monitor progress
3. First deploy takes ~5 minutes (building + initial backfill)

## Verifying the Deployment

### Check Tap is running
```bash
# From your local machine (replace with your Tap internal URL)
# You can't access this externally - use Railway's shell
railway run -s tap -- wget -qO- http://localhost:2480/health
```

### Check Indexer is running
```bash
curl https://your-indexer.up.railway.app/health
# Should return: {"status":"ok"}
```

### Check GraphQL API
Open `https://your-indexer.up.railway.app/graphql` in your browser.

Try this query:
```graphql
query {
  hypercerts {
    activities(limit: 5) {
      records {
        title
        meta { uri }
      }
    }
  }
}
```

## Updating

When you push changes to your repository:

1. Railway automatically triggers a new deployment
2. The indexer rebuilds with the latest code
3. Tap continues running (no rebuild needed unless you change its config)

### Updating Collection Filters

If you add new lexicons:

1. Run locally: `bun run sync:filters` to generate the new filter string
2. Copy the new `TAP_COLLECTION_FILTERS` value
3. Update the Tap service variables in Railway
4. Restart the Tap service

## Troubleshooting

### Indexer can't connect to Tap

1. Check that Tap is running (green status)
2. Verify `TAP_URL` uses the correct private domain
3. Check Tap logs for errors

### No data appearing

1. Check Tap logs - should see "backfill" messages
2. Verify `TAP_COLLECTION_FILTERS` includes your collections
3. Check `DISCOVERY_COLLECTIONS` includes your signal collections

### Tap cursor is stale

If Tap stops syncing after a while:

1. Go to Tap service → Volumes
2. Delete the volume (this resets Tap's state)
3. Create a new volume at `/data`
4. Redeploy Tap

### Database connection errors

1. Check Postgres is running
2. Verify `DATABASE_URL` reference variable is correct
3. Try redeploying the indexer

## Cost Estimation

Typical monthly costs on Railway:

| Service | Usage | ~Cost |
|---------|-------|-------|
| Postgres | 1GB storage, low CPU | $5-10 |
| Tap | Low CPU, 1GB volume | $5-10 |
| Indexer | Medium CPU during backfill, low after | $10-20 |
| **Total** | | **$20-40/month** |

Costs scale with usage. Initial backfill uses more resources.

## Environment Variable Reference

### Indexer Service

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Postgres connection string |
| `TAP_URL` | Yes | Tap service URL (private networking) |
| `TAP_ADMIN_PASSWORD` | Yes | Must match Tap's password |
| `ENABLE_DISCOVERY` | No | Enable DID discovery (default: true) |
| `DISCOVERY_COLLECTIONS` | No | Collections to discover DIDs from |
| `GRAPHQL_PORT` | No | GraphQL port (default: 4000) |
| `HEALTH_PORT` | No | Health check port (default: 4001) |

### Tap Service

| Variable | Required | Description |
|----------|----------|-------------|
| `TAP_DATABASE_URL` | Yes | SQLite path (use volume) |
| `TAP_BIND` | Yes | Listen address |
| `TAP_RELAY_URL` | Yes | AT Protocol relay URL |
| `TAP_SIGNAL_COLLECTION` | No | Auto-discover DIDs with this collection |
| `TAP_COLLECTION_FILTERS` | Yes | Collections to sync (comma-separated wildcards) |
| `TAP_ADMIN_PASSWORD` | Yes | Admin API password |

## Support

- Check the [main README](./README.md) for detailed documentation
- Open an issue on GitHub for bugs
- Join the GainForest Discord for help
