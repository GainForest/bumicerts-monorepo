# @gainforest/atproto-auth-next

ATProto OAuth authentication for Next.js — **handle-based** and **email-based (ePDS)** login, Supabase-backed token storage, encrypted cookie sessions, server actions factory, profile fetching.

Designed for the **single-file setup pattern**: one config file + minimal route re-exports.

## Install

```bash
bun add @gainforest/atproto-auth-next @supabase/supabase-js
```

`next` must already be installed.

---

## Supabase setup

Run this SQL once in your project before anything else:

```sql
-- Long-lived OAuth tokens, keyed by app + DID
CREATE TABLE atproto_oauth_session (
  id          TEXT PRIMARY KEY,
  app_id      TEXT NOT NULL,
  did         TEXT NOT NULL,
  value       JSONB NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(app_id, did)
);
CREATE INDEX idx_atproto_oauth_session_app_did ON atproto_oauth_session(app_id, did);

-- Short-lived OAuth state + ePDS ephemeral state
CREATE TABLE atproto_oauth_state (
  id          TEXT PRIMARY KEY,
  app_id      TEXT NOT NULL,
  value       JSONB NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  expires_at  TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 hour')
);
CREATE INDEX idx_atproto_oauth_state_app_expires ON atproto_oauth_state(app_id, expires_at);
```

---

## Generating the OAuth private key

```bash
node -e "
const { generateKeyPairSync } = require('crypto');
const { exportJWK } = require('jose');
const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
exportJWK(privateKey).then(jwk => {
  jwk.kid = 'key-1'; jwk.use = 'sig'; jwk.alg = 'ES256';
  console.log(JSON.stringify(jwk));
});
"
```

Never paste your private key into an online tool. Store it in `.env.local` as `ATPROTO_JWK_PRIVATE`.

---

## Quick setup (recommended)

### Step 1 — Single config file (`lib/auth.ts`)

This is the **only file you need to write** — everything is exported from here.

```ts
// lib/auth.ts  (server-only — not a "use client" file)
import { createAuthSetup } from "@gainforest/atproto-auth-next";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const auth = createAuthSetup({
  // Required
  privateKeyJwk: process.env.ATPROTO_JWK_PRIVATE!,
  cookieSecret:  process.env.COOKIE_SECRET!,   // min 32 chars
  supabase,
  appId: "myapp",                              // unique per app

  // Branding
  clientName: "My App",

  // Handle normalization — "alice" → "alice.climateai.org"
  defaultPdsDomain: "climateai.org",

  // ePDS email-based auth (optional — remove if not needed)
  epds: process.env.NEXT_PUBLIC_EPDS_URL
    ? { url: process.env.NEXT_PUBLIC_EPDS_URL }
    : undefined,
  // Optional: control handle step for new ePDS signups
  // "random" skips the choose-handle screen
  epdsHandleMode: "random",

  // Where to redirect after login/logout
  onCallback: { redirectTo: "/" },
  // onLogout:  { redirectTo: "/login" },  // optional
});
```

> **publicUrl** is auto-detected from `NEXT_PUBLIC_BASE_URL` → `VERCEL_BRANCH_URL` → `VERCEL_URL` → `http://127.0.0.1:PORT`. Override it with `publicUrl: process.env.NEXT_PUBLIC_BASE_URL` if needed.
>
> **Dev vs prod** is also auto-detected: loopback URLs (`127.0.0.1`) use the RFC 8252 native client; all other URLs use the standard web client.

### Step 2 — Route files (one-liners)

```ts
// app/api/oauth/authorize/route.ts
import { auth } from "@/lib/auth";
export const POST = auth.handlers.authorize.POST;

// app/api/oauth/callback/route.ts
import { auth } from "@/lib/auth";
export const GET = auth.handlers.callback.GET;

// app/api/oauth/logout/route.ts
import { auth } from "@/lib/auth";
export const POST = auth.handlers.logout.POST;

// app/client-metadata.json/route.ts
import { auth } from "@/lib/auth";
export const GET = auth.handlers.clientMetadata.GET;

// app/.well-known/jwks.json/route.ts
import { auth } from "@/lib/auth";
export const GET = auth.handlers.jwks.GET;
```

**Email-based login (ePDS)** — only add these if `epds.url` is configured:

```ts
// app/api/oauth/epds/login/route.ts
import { auth } from "@/lib/auth";
export const GET = auth.handlers.epds.login.GET;

// app/api/oauth/epds/callback/route.ts
import { auth } from "@/lib/auth";
export const GET = auth.handlers.epds.callback.GET;
```

### Step 3 — Server actions (`"use server"` wrapper)

Next.js requires the `"use server"` directive to be in the *consuming app's* files. Create one wrapper:

```ts
// actions/auth.ts
"use server";
import { auth } from "@/lib/auth";

export const authorize                = auth.actions.authorize;
export const logout                   = auth.actions.logout;
export const checkSession             = auth.actions.checkSession;
export const getProfile               = auth.actions.getProfile;
export const checkSessionAndGetProfile = auth.actions.checkSessionAndGetProfile;
```

### Step 4 — Use in components

```tsx
// Server Component — reading the session
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth.session.getSession();
  if (!session.isLoggedIn) redirect("/login");

  return <h1>Hello, {session.handle}</h1>;
}
```

```tsx
// Client Component — triggering auth
"use client";
import { authorize } from "@/actions/auth";

export function LoginButton() {
  const handleLogin = async () => {
    const { authorizationUrl } = await authorize("alice");
    window.location.href = authorizationUrl;
  };
  return <button onClick={handleLogin}>Sign in with handle</button>;
}
```

Email-based login (ePDS) — just redirect:

```tsx
// No server action needed — user hits the route directly
<a href={`/api/oauth/epds/login?email=${encodeURIComponent(email)}`}>
  Sign in with email
</a>
```

---

## Server actions reference

All actions are available on `auth.actions`:

| Action | Description |
|--------|-------------|
| `authorize(handle)` | Starts the OAuth flow for a handle. Returns `{ authorizationUrl }`. |
| `logout()` | Revokes the OAuth session and clears the cookie. Returns `{ success: true }`. |
| `checkSession()` | Verifies the session is still valid in Supabase. Returns `{ authenticated, did?, handle? }`. |
| `getProfile(did)` | Fetches certified + bsky profile in parallel. Returns `ProfileData \| ProfileAuthError \| null`. |
| `checkSessionAndGetProfile()` | Checks session + fetches profile in a single OAuth restore. Returns `{ isLoggedIn, did?, handle?, profile? }`. |

### `authorize(handle: string)`

Normalizes the handle (adds `defaultPdsDomain` if configured) then starts the OAuth flow.

```ts
const { authorizationUrl } = await authorize("alice");
// alice → alice.climateai.org → redirect to ATProto auth server
window.location.href = authorizationUrl;
```

### `checkSession()`

Reads the cookie and verifies the OAuth tokens are still alive in Supabase. Clears a stale cookie if the session has been revoked (e.g. by logging in on another device).

```ts
const session = await checkSession();
if (!session.authenticated) redirect("/login");
// session.did and session.handle are available
```

### `checkSessionAndGetProfile()`

Restores the OAuth session **once** and fetches the profile in the same call — more efficient than calling `checkSession()` + `getProfile()` separately.

```ts
const result = await checkSessionAndGetProfile();
if (result.isLoggedIn) {
  const { did, handle, profile } = result;
  // profile?.displayName, profile?.avatar, profile?.description
}
```

---

## Session utilities

Available on `auth.session`:

```ts
// Read the cookie
const session = await auth.session.getSession();
// { isLoggedIn: false } or { isLoggedIn: true, did, handle }

// Restore an OAuth session for API calls
const oauthSession = await auth.session.restoreSession(did);
if (oauthSession) {
  const agent = new Agent(oauthSession);
  // make authenticated ATProto API calls
}

// Get an authenticated agent directly
const agent = await auth.session.getAuthenticatedAgent(did);
if (agent) {
  const res = await agent.com.atproto.repo.listRecords({ repo: did, collection: "..." });
}
```

---

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ATPROTO_JWK_PRIVATE` | ✅ | Private JWK (EC P-256) for OAuth client auth |
| `COOKIE_SECRET` | ✅ | iron-session secret (min 32 chars) |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase service role key (server-side only) |
| `NEXT_PUBLIC_BASE_URL` | — | Explicit public URL override (wins over Vercel env vars) |
| `NEXT_PUBLIC_EPDS_URL` | — | ePDS base URL — enables email auth when present |
| `AUTH_DEBUG` | — | Set to `1` to enable debug logging |

> Auto-detected URL priority: `NEXT_PUBLIC_BASE_URL` → `VERCEL_BRANCH_URL` → `VERCEL_URL` → `http://127.0.0.1:PORT`

---

## Local development

No special config needed. When the resolved URL is `127.0.0.1` or `localhost`, the package automatically switches to the RFC 8252 loopback OAuth client (no HTTPS required, no client auth).

```env
# .env.local — only needed if you want to override the auto-detected URL
# NEXT_PUBLIC_BASE_URL=http://127.0.0.1:3000
```

---

## Email login flow (ePDS)

When `epds.url` is configured, users can sign in via email OTP through the ePDS server:

```
1. User enters email
2. App redirects to /api/oauth/epds/login?email=user@example.com
3. Package generates PKCE + DPoP, sends PAR to ePDS, stores state
4. User redirected to ePDS auth page, receives OTP email
5. User enters OTP on ePDS
6. ePDS redirects to /api/oauth/epds/callback?code=...&state=...
7. Package exchanges code for DPoP-bound tokens, saves session
8. User redirected to onCallback.redirectTo
```

The ePDS flow reuses the same Supabase session table as the standard OAuth flow — both produce a valid session that `restoreSession()` can use.

### ePDS handle mode (optional)

You can set a preferred handle mode for new account creation via `createAuthSetup`:

```ts
epdsHandleMode: "picker-with-random" | "picker" | "random"
```

- `picker-with-random`: show the handle picker with a random option
- `picker`: show the picker without random option
- `random`: skip picker and auto-assign a random handle

This value is emitted as `epds_handle_mode` in `/client-metadata.json`.
Per ePDS behavior, an `epds_handle_mode` query param on the authorization URL takes precedence over client metadata.

---

## Middleware (optional)

Redirect `localhost` to `127.0.0.1` for OAuth compatibility:

```ts
// middleware.ts
import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  if (host.startsWith("localhost")) {
    const url = request.nextUrl.clone();
    url.host = host.replace("localhost", "127.0.0.1");
    return NextResponse.redirect(url);
  }
}
```

---

## Advanced: Manual setup

For custom stores or non-Supabase backends, wire the pieces individually:

```ts
import {
  createOAuthClient,
  DEFAULT_OAUTH_SCOPE,
  resolvePublicUrl,
} from "@gainforest/atproto-auth-next";
import {
  createSupabaseSessionStore,
  createSupabaseStateStore,
  createEpdsStateStore,
} from "@gainforest/atproto-auth-next/stores";
import {
  createAuthorizeHandler,
  createCallbackHandler,
  createAuthActions,
  createEpdsLoginHandler,
  createEpdsCallbackHandler,
  type SessionConfig,
} from "@gainforest/atproto-auth-next/server";
```

---

## Cleanup expired states (cron job)

OAuth states expire after 1 hour and accumulate in the database. Run this on a schedule:

```ts
import { cleanupExpiredStates } from "@gainforest/atproto-auth-next/stores";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(url, serviceRoleKey);
const deleted = await cleanupExpiredStates(supabase);
console.log(`Cleaned up ${deleted} expired OAuth states`);
```

---

## Package exports

| Import path | Purpose |
|-------------|---------|
| `@gainforest/atproto-auth-next` | `createAuthSetup`, types — main entry point |
| `@gainforest/atproto-auth-next/server` | Low-level handler factories, session utils — server-only |
| `@gainforest/atproto-auth-next/stores` | Supabase store factories |
| `@gainforest/atproto-auth-next/client` | Session + profile types — safe for client components |

---

## Type reference

```ts
// Session — discriminated union, TypeScript narrows on isLoggedIn
type SessionData  = { isLoggedIn: true;  did: string; handle: string };
type EmptySession = { isLoggedIn: false };
type AnySession   = SessionData | EmptySession;

// Profile — returned by getProfile / checkSessionAndGetProfile
type ProfileData = {
  handle: string;
  displayName?: string;
  description?: string;
  avatar?: string;        // only set if avatar is a plain URL, not a blob ref
};

// Auth error
type ProfileAuthError = { error: "unauthorized" };

// createAuthSetup config
type AuthSetupConfig = {
  // Required
  privateKeyJwk: string;
  cookieSecret: string;
  supabase: SupabaseClient;
  appId: string;

  // Optional
  publicUrl?: string;        // auto-detected from env vars
  scope?: string;            // default: "atproto transition:generic"
  clientName?: string;       // default: "Gainforest"
  cookieName?: string;       // default: "gainforest_session"
  cookieSecure?: boolean;    // default: NODE_ENV === "production"
  defaultPdsDomain?: string; // for handle normalization
  epds?: { url: string };    // enables email auth
  onCallback?: { redirectTo: string };
  onLogout?: { redirectTo?: string };
};
```
