# @gainforest/atproto-auth-next

ATProto OAuth authentication for Next.js. Handles the full auth lifecycle: OAuth client setup, Supabase-backed token storage, encrypted cookie sessions, and pluggable route handlers.

## Install

```bash
bun add @gainforest/atproto-auth-next @supabase/supabase-js
```

`next` must already be installed. `@supabase/supabase-js` is required if you use the Supabase stores.

---

## Supabase setup

Run this SQL once in your Supabase project before anything else.

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

-- Short-lived state, expires after 1 hour
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

Never paste your private key into an online tool.

---

## Quick setup (recommended)

Everything is wired in as few files as possible. All values come from your config — no hardcoded env variable names.

### 1 — Single setup file (`lib/atproto.ts`)

```ts
// lib/atproto.ts  (server-only)
import { createOAuthSetup } from "@gainforest/atproto-auth-next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const { oauthClient, sessionConfig } = createOAuthSetup({
  publicUrl:     process.env.NEXT_PUBLIC_APP_URL!,
  privateKeyJwk: process.env.OAUTH_PRIVATE_KEY!,
  cookieSecret:  process.env.COOKIE_SECRET!,
  cookieName:    process.env.COOKIE_NAME,       // optional — default: "gainforest_session"
  supabase,
  appId: "your-app-name",                       // unique per app, e.g. "greenglobe"
});
```

### 2 — OAuth metadata routes

```ts
// app/client-metadata.json/route.ts
import { createClientMetadataHandler } from "@gainforest/atproto-auth-next/server";

export const GET = createClientMetadataHandler(process.env.NEXT_PUBLIC_APP_URL!, {
  clientName: "Your App",
  // redirectPath: "/api/oauth/callback",  — this is the default
});
```

```ts
// app/.well-known/jwks.json/route.ts
import { createJwksHandler } from "@gainforest/atproto-auth-next/server";

export const GET = createJwksHandler(process.env.OAUTH_PRIVATE_KEY!);
```

### 3 — Auth routes

```ts
// app/api/oauth/authorize/route.ts
import { createAuthorizeHandler } from "@gainforest/atproto-auth-next/server";
import { oauthClient } from "@/lib/atproto";

export const POST = createAuthorizeHandler(oauthClient);
```

```ts
// app/api/oauth/callback/route.ts
import { createCallbackHandler } from "@gainforest/atproto-auth-next/server";
import { oauthClient, sessionConfig } from "@/lib/atproto";

export const GET = createCallbackHandler(oauthClient, sessionConfig, {
  redirectTo: "/dashboard",
});
```

```ts
// app/api/oauth/logout/route.ts
import { createLogoutHandler } from "@gainforest/atproto-auth-next/server";
import { oauthClient, sessionConfig } from "@/lib/atproto";

export const POST = createLogoutHandler(oauthClient, sessionConfig);
// Pass { redirectTo: "/login" } to redirect instead of returning { ok: true }
```

That's the entire auth wiring — 6 files, each 3-5 lines.

---

## Reading the session

### Server Component

```tsx
// app/dashboard/page.tsx
import { getSession } from "@gainforest/atproto-auth-next/server";
import { redirect } from "next/navigation";
import { sessionConfig } from "@/lib/atproto";

export default async function DashboardPage() {
  const session = await getSession(sessionConfig);

  if (!session.isLoggedIn) redirect("/login");

  // session.did and session.handle are narrowed — no `?.`
  return <h1>Hello, {session.handle}</h1>;
}
```

### Client Component

```tsx
// components/user-menu.tsx
"use client";

import type { AnySession } from "@gainforest/atproto-auth-next/client";

export function UserMenu({ session }: { session: AnySession }) {
  if (!session.isLoggedIn) return <a href="/login">Sign in</a>;
  return <span>{session.handle}</span>;
}
```

```tsx
// app/layout.tsx  (Server Component)
import { getSession } from "@gainforest/atproto-auth-next/server";
import { UserMenu } from "@/components/user-menu";
import { sessionConfig } from "@/lib/atproto";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession(sessionConfig);
  return (
    <html>
      <body>
        <nav><UserMenu session={session} /></nav>
        {children}
      </body>
    </html>
  );
}
```

---

## Cleanup expired states (optional)

OAuth states expire after 1 hour and accumulate in the database. Run this on a schedule:

```ts
import { cleanupExpiredStates } from "@gainforest/atproto-auth-next/stores";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(url, serviceRoleKey);
const deleted = await cleanupExpiredStates(supabase);
console.log(`Cleaned up ${deleted} expired OAuth states`);
```

---

## Manual setup (advanced)

If you need custom stores or a non-Supabase backend, skip `createOAuthSetup` and wire the pieces individually.

```ts
// lib/atproto.ts
import { createOAuthClient } from "@gainforest/atproto-auth-next";
import {
  createSupabaseSessionStore,
  createSupabaseStateStore,
} from "@gainforest/atproto-auth-next/stores";
import type { SessionConfig } from "@gainforest/atproto-auth-next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const oauthClient = createOAuthClient({
  publicUrl:     process.env.NEXT_PUBLIC_APP_URL!,
  privateKeyJwk: process.env.OAUTH_PRIVATE_KEY!,
  sessionStore:  createSupabaseSessionStore(supabase, "your-app"),
  stateStore:    createSupabaseStateStore(supabase, "your-app"),
});

export const sessionConfig: SessionConfig = {
  cookieSecret: process.env.COOKIE_SECRET!,
  cookieName:   process.env.COOKIE_NAME,
};
```

---

## Local development

ATProto OAuth supports loopback URIs for local dev — no HTTPS required.

```env
NEXT_PUBLIC_APP_URL=http://127.0.0.1:3000
```

---

## Type reference

```ts
// Session — discriminated union, TypeScript narrows on isLoggedIn
type SessionData  = { isLoggedIn: true;  did: string; handle: string };
type EmptySession = { isLoggedIn: false };
type AnySession   = SessionData | EmptySession;

// Passed to every cookie helper and route handler factory
type SessionConfig = {
  cookieSecret: string;  // min 32 chars
  cookieName?: string;   // default: "gainforest_session"
  secure?: boolean;      // default: NODE_ENV === "production"
};

// createOAuthSetup config
type OAuthSetupConfig = {
  publicUrl:     string;
  privateKeyJwk: string;
  cookieSecret:  string;
  cookieName?:   string;
  secure?:       boolean;
  supabase:      SupabaseClient;
  appId:         string;
};

// createClientMetadataHandler options
type ClientMetadataOptions = {
  clientName:    string;
  redirectPath?: string;  // default: "/api/oauth/callback"
  scope?:        string;  // default: "atproto"
};

// createCallbackHandler options
type CallbackHandlerOptions = {
  redirectTo: string;
};

// createLogoutHandler options
type LogoutHandlerOptions = {
  redirectTo?: string;  // if omitted, returns { ok: true }
};
```
