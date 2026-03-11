# Deploying to Railway

This guide walks you through deploying the GainForest Indexer stack to Railway.

## Prerequisites

- A [Railway](https://railway.app) account
- This repository connected to your GitHub account
- ~10 minutes for initial setup

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

**Data flow:**
1. **Tap** connects to the AT Protocol relay (bsky.network) and syncs records
2. **Indexer** connects to Tap via WebSocket and processes events
3. **Indexer** writes to **Postgres** and serves a GraphQL API

---

## Step-by-Step Setup

### Step 1: Create a Railway Project

1. Go to [railway.app](https://railway.app) and log in
2. Click **"New Project"** in the top right
3. Select **"Empty Project"**
4. Give it a name like `gainforest-indexer`

You should now see an empty project canvas.

---

### Step 2: Add PostgreSQL Database

1. Click **"+ New"** button (top right of canvas)
2. Select **"Database"**
3. Choose **"PostgreSQL"**
4. Wait for it to provision (~30 seconds)

A PostgreSQL service will appear on the canvas. **No configuration needed** - Railway automatically sets up the database.

---

### Step 3: Add Tap Service

Tap is the AT Protocol sync service that handles firehose connections and backfilling.

#### 3.1: Create the service

1. Click **"+ New"** → **"GitHub Repo"**
2. Search for and select **this repository** (`atproto-packages`)
3. A service will appear on the canvas named `atproto-packages`

#### 3.2: Rename and configure the service

1. Click on the `atproto-packages` service to open its settings
2. Go to the **Settings** tab
3. **IMPORTANT: Rename the service first!** Set these values:

| Setting | Value |
|---------|-------|
| **Service Name** | `tap` ⚠️ **Must be exactly this name!** |
| **Root Directory** | *(leave empty)* |
| **Config Path** | `apps/indexer/railway/tap.railway.json` |

> **Why the name matters:** The Indexer connects to Tap using `${{tap.RAILWAY_PRIVATE_DOMAIN}}`. If the service isn't named `tap`, this reference won't work.

4. Click **"Save"** if prompted

#### 3.3: Add environment variables

1. Go to the **Variables** tab
2. Click **"+ New Variable"** and add each of these:

```bash
PORT=2480
TAP_DATABASE_URL=sqlite:///data/tap.db
TAP_BIND=:2480
TAP_RELAY_URL=https://bsky.network
TAP_SIGNAL_COLLECTION=org.hypercerts.claim.activity
TAP_COLLECTION_FILTERS=app.bumicerts.*,app.certified.*,app.gainforest.*,org.hyperboards.*,org.hypercerts.*,org.impactindexer.*
TAP_DISABLE_ACKS=false
TAP_LOG_LEVEL=info
```

> **CRITICAL:** `PORT=2480` is **required** - Railway uses this to detect when the service is ready. Tap always listens on port 2480 internally, but Railway needs this env var to know which port to check. Without it, Railway will mark the service as unhealthy.

3. For `TAP_ADMIN_PASSWORD`, click **"+ New Variable"** and:
   - Name: `TAP_ADMIN_PASSWORD`
   - Click the **"Generate"** button (or type `${{secret(32)}}`)
   - This creates a secure random password

> **Note on healthchecks:** The Tap admin auth middleware protects ALL endpoints including `/health`. Railway uses TCP port detection (checking if port 2480 is open) instead of HTTP healthchecks. Do NOT configure a healthcheck path in Railway - just set `PORT=2480` and leave the healthcheck settings empty.

#### 3.4: Add a volume for persistent storage

1. Go to the **Volumes** tab (or right-click service → "Add Volume")
2. Click **"+ New Volume"**
3. Set **Mount Path**: `/data`
4. Click **"Create"**

This volume stores Tap's SQLite database and sync cursor.

#### 3.5: Verify (do NOT expose publicly)

- Do **NOT** add a domain to Tap - it only needs internal networking
- The Indexer will connect to it via Railway's private network

---

### Step 4: Add Indexer Service

The Indexer processes events from Tap, stores them in Postgres, and serves a GraphQL API.

#### 4.1: Create the service

1. Click **"+ New"** → **"GitHub Repo"**
2. Select **this repository** again (`GainForest/atproto-packages`)
3. Click **"Add Service"**

#### 4.2: Configure the service

1. Click on the new service to open settings
2. Go to the **Settings** tab
3. Set these values:

| Setting | Value |
|---------|-------|
| **Service Name** | `indexer` (important - must be exactly this!) |
| **Root Directory** | *(leave empty)* |
| **Config Path** | `apps/indexer/railway.json` |

#### 4.3: Add environment variables

1. Go to the **Variables** tab
2. Add these variables:

**Database connection** (uses Railway reference variable):
```
DATABASE_URL=${{Postgres.DATABASE_URL}}
```

**Tap connection** (uses private networking):
```
TAP_URL=http://${{tap.RAILWAY_PRIVATE_DOMAIN}}:2480
TAP_ADMIN_PASSWORD=${{tap.TAP_ADMIN_PASSWORD}}
```

**Discovery settings**:
```
ENABLE_DISCOVERY=true
DISCOVERY_COLLECTIONS=app.certified.actor.profile,app.gainforest.organization.info,org.hypercerts.claim.activity
DISCOVERY_RELAY_URL=https://bsky.network
DISCOVERY_BATCH_SIZE=500
```

**Server configuration**:
```
GRAPHQL_PORT=4000
HEALTH_PORT=4001
HOST=0.0.0.0
LOG_LEVEL=info
```

**Performance settings**:
```
BATCH_SIZE=100
BATCH_TIMEOUT_MS=5000
VALIDATE_RECORDS=true
LOG_VALIDATION_ERRORS=true
PDS_HOST_CACHE_TTL_SECONDS=3600
```

**Hyperlabel integration**:
```
HYPERLABEL_URL=https://hyperlabel-production.up.railway.app
HYPERLABEL_DID=did:plc:5rw6of6lry7ihmyhm323ycwn
```

#### 4.4: Add a public domain

1. Go to the **Networking** tab
2. Click **"Generate Domain"**
3. Railway will create a URL like `indexer-production-xxxx.up.railway.app`

This is your public GraphQL API endpoint!

---

### Step 5: Deploy

1. Both services should start building automatically
2. Watch the **Deployments** tab on each service
3. First deploy takes ~3-5 minutes

**Build order matters!** If Indexer deploys before Tap is ready, it will fail to connect. Just redeploy the Indexer once Tap is healthy.

---

## Verifying the Deployment

### Check Tap is running

In Railway, click on the Tap service → **Deployments** → latest deployment → **View Logs**

You should see logs like:
```
{"level":"INFO","msg":"starting tap server","bind":":2480"}
{"level":"INFO","msg":"connected to relay","url":"https://bsky.network"}
```

### Check Indexer is running

```bash
curl https://your-indexer-xxxx.up.railway.app/health
```

Should return:
```json
{"status":"ok"}
```

### Test the GraphQL API

Open `https://your-indexer-xxxx.up.railway.app/graphql` in your browser.

Try this query:
```graphql
query {
  hypercerts {
    activities(limit: 5) {
      records {
        title
        shortDescription
        meta { uri did }
      }
    }
  }
}
```

---

## Setting Up GitHub Actions (Optional but Recommended)

The GitHub Action automatically syncs `TAP_COLLECTION_FILTERS` when you add new lexicons.

### Step 1: Create a Railway API Token

1. Go to [Railway Tokens](https://railway.app/account/tokens)
2. Click **"Create Token"**
3. Select your **workspace** (not a specific project)
4. Name it something like `github-actions`
5. Copy the token

### Step 2: Add Token to GitHub

1. Go to your repo: `https://github.com/GainForest/atproto-packages/settings/secrets/actions`
2. Click **"New repository secret"**
3. Name: `RAILWAY_TOKEN`
4. Value: paste the token from step 1
5. Click **"Add secret"**

### Step 3: Verify the Workflow

The workflow at `.github/workflows/deploy-indexer.yml` will now:
- Automatically sync `TAP_COLLECTION_FILTERS` when lexicons change
- Trigger redeployment of Tap and Indexer services

---

## Updating

### When you add new lexicons:

1. Add your lexicon files
2. Run `bun run gen:indexer` locally
3. Commit and push

The GitHub Action will automatically:
- Generate new `TAP_COLLECTION_FILTERS`
- Update the Tap service on Railway
- Trigger redeployment

### Manual updates (if GitHub Action isn't set up):

1. Run locally: `bun run sync:filters`
2. Copy the output filter string
3. Update `TAP_COLLECTION_FILTERS` in Railway → Tap service → Variables
4. Click "Redeploy" on the Tap service

---

## Troubleshooting

### Tap healthcheck failing ("service unavailable")

If you see this in the Tap deployment logs:
```
Attempt #1 failed with service unavailable. Continuing to retry for 4m49s
```

**Cause:** Railway's healthcheck doesn't know which port to check.

**Fix:** Add `PORT=2480` to Tap's environment variables. This tells Railway to check port 2480 for the healthcheck.

### "Invalid RAILWAY_TOKEN" in GitHub Actions

- Make sure you created a **workspace token**, not a project token
- Verify the token is added to GitHub Secrets correctly
- Check the token hasn't expired

### Indexer can't connect to Tap

1. Verify Tap service name is exactly `tap` (lowercase)
2. Check Tap is running (green status in Railway)
3. Verify `TAP_URL` uses `${{tap.RAILWAY_PRIVATE_DOMAIN}}`
4. Check Tap logs for errors

### No data appearing after deployment

1. Check Tap logs for "backfill" messages
2. Verify `TAP_COLLECTION_FILTERS` includes your collections
3. Make sure `DISCOVERY_COLLECTIONS` has at least one collection
4. Wait for initial backfill to complete (~5-10 minutes)

### Tap cursor is stale (stops syncing)

1. Go to Tap service → Volumes
2. Delete the volume
3. Create a new volume at `/data`
4. Redeploy Tap (this triggers a fresh backfill)

### Database connection errors

1. Check Postgres service is running
2. Verify `DATABASE_URL` is set to `${{Postgres.DATABASE_URL}}`
3. Try redeploying the Indexer

---

## Cost Estimation

| Service | Typical Usage | ~Monthly Cost |
|---------|---------------|---------------|
| Postgres | 1GB storage, low CPU | $5-10 |
| Tap | Low CPU, 1GB volume | $5-10 |
| Indexer | Medium CPU during backfill | $10-20 |
| **Total** | | **$20-40/month** |

Costs scale with usage. Initial backfill uses more resources.

---

## Environment Variable Reference

### Tap Service

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | Yes | Healthcheck port: `2480` (must match TAP_BIND) |
| `TAP_DATABASE_URL` | Yes | SQLite path: `sqlite:///data/tap.db` |
| `TAP_BIND` | Yes | Listen address: `:2480` |
| `TAP_RELAY_URL` | Yes | AT Protocol relay: `https://bsky.network` |
| `TAP_COLLECTION_FILTERS` | Yes | Collections to sync (wildcards) |
| `TAP_ADMIN_PASSWORD` | Yes | Admin API password |
| `TAP_SIGNAL_COLLECTION` | No | Auto-discover DIDs with this collection |
| `TAP_LOG_LEVEL` | No | `debug`, `info`, `warn`, `error` |

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
| `LOG_LEVEL` | No | `debug`, `info`, `warn`, `error` |

---

## Support

- Check the [main README](./README.md) for detailed documentation
- Open an issue on GitHub for bugs
- Join the GainForest Discord for help
