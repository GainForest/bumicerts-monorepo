import { createClient } from "@supabase/supabase-js";
import {
  createATProtoSDK,
  createSupabaseSessionStore,
  createSupabaseStateStore,
} from "gainforest-sdk/oauth";
import { createEpdsStateStore } from "@/lib/epds/state-store";
import { debug } from "@/lib/logger";

export const OAUTH_SCOPE = "atproto transition:generic"

// Create Supabase client with service role key (server-side only!)
// Cast to work around version mismatch between SDK's bundled supabase and ours
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
) as unknown as Parameters<typeof createSupabaseSessionStore>[0];

// Unique identifier for this app in the shared Supabase tables
const APP_ID = "bumicerts";

// Environment detection
const isDev = process.env.NODE_ENV === "development";

/**
 * Resolves the public URL of the app from available environment variables.
 * 
 * We need to set the production url to NEXT_PUBLIC_BASE_URL and for the previews we just use VERCEL_BRANCH_URL
 *
 * Priority:
 * 1. NEXT_PUBLIC_BASE_URL — explicit override (ngrok, custom domain, etc.) — always wins
 * 2. VERCEL_BRANCH_URL — stable per-branch URL for preview deploys (auto-set by Vercel)
 * 3. VERCEL_URL — fallback Vercel auto-detected URL
 * 4. Default to http://127.0.0.1:3000 in development mode (loopback OAuth)
 * 
 * Disclaimer when testing previews only works with the branch name preview and not with the commit name preview
 */
export const resolvePublicUrl = (): string => {
  // 1. Explicit override — always wins (ngrok, custom domain, etc.)
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL;
  }
  // 2. Vercel auto-detection
  if (process.env.VERCEL_BRANCH_URL) {
    return `https://${process.env.VERCEL_BRANCH_URL}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  // 3. Local development fallback
  if (isDev) {
    return `http://127.0.0.1:${process.env.PORT ?? 3000}`;
  }
  // Build-time fallback — next build evaluates this module at compile time
  // when no Vercel env vars are available. Return a placeholder that will
  // never be used at runtime (Vercel injects VERCEL_BRANCH_URL/VERCEL_URL).
  // Using .invalid TLD (RFC 2606) ensures loud failure if accidentally used.
  console.warn(
    "[atproto] No public URL configured — using build-time placeholder. " +
    "Set NEXT_PUBLIC_BASE_URL or deploy to Vercel."
  );
  return "https://placeholder.invalid";
};

const PUBLIC_URL = resolvePublicUrl();

/**
 * Returns true if the resolved public URL is a loopback address.
 * Used to decide between loopback (native) and web OAuth config.
 * This correctly handles ngrok/tunnels where NODE_ENV is 'development'
 * but the URL is publicly accessible.
 */
export const isLoopback = (): boolean => {
  const url = resolvePublicUrl();
  return url.includes('127.0.0.1') || url.includes('localhost');
};

/**
 * ATProto SDK instance configured for OAuth authentication.
 *
 * This SDK handles:
 * - OAuth authorization flow initiation
 * - OAuth callback processing and token exchange
 * - Session restoration for authenticated API calls
 *
 * Sessions are stored in Supabase (atproto_oauth_session table).
 * Auth flow state is stored temporarily in Supabase (atproto_oauth_state table).
 */
const atprotoJwkPrivate = process.env.ATPROTO_JWK_PRIVATE;
if (!atprotoJwkPrivate) {
  throw new Error("ATPROTO_JWK_PRIVATE is not set");
}

/**
 * Development OAuth Configuration (Loopback Client)
 * 
 * RFC 8252 compliant loopback client for local development.
 * - Uses http://localhost (no port) in client ID per RFC 8252
 * - Actual redirect URI uses 127.0.0.1:3000
 * - No client authentication required (token_endpoint_auth_method: "none")
 * - Application type: "native"
 * - When NEXT_PUBLIC_EPDS_URL is set, both redirect URIs are embedded in the client_id
 */
const epdsEnabled = !!process.env.NEXT_PUBLIC_EPDS_URL;
const redirectUris = [`${PUBLIC_URL}/api/oauth/callback`];
if (epdsEnabled) {
  redirectUris.push(`${PUBLIC_URL}/api/oauth/epds/callback`);
}

// For loopback client_id, embed all redirect URIs using URLSearchParams.append
const clientIdParams = new URLSearchParams();
clientIdParams.set('scope', OAUTH_SCOPE);
for (const uri of redirectUris) {
  clientIdParams.append('redirect_uri', uri);
}
const devClientId = `http://localhost?${clientIdParams.toString()}`;

export const DEV_OAUTH_CONFIG = {
  clientId: devClientId,
  redirectUri: `${PUBLIC_URL}/api/oauth/callback`,
  jwksUri: `${PUBLIC_URL}/.well-known/jwks.json`,
  jwkPrivate: atprotoJwkPrivate,
  scope: OAUTH_SCOPE,
};

/**
 * Production OAuth Configuration (Web Client)
 * 
 * Standard web client using client metadata endpoint.
 * - Client ID points to metadata endpoint
 * - Uses private_key_jwt authentication
 * - Application type: "web"
 */
export const PROD_OAUTH_CONFIG = {
  clientId: `${PUBLIC_URL}/client-metadata.json`,
  redirectUri: `${PUBLIC_URL}/api/oauth/callback`,
  jwksUri: `${PUBLIC_URL}/.well-known/jwks.json`,
  jwkPrivate: atprotoJwkPrivate,
  scope: OAUTH_SCOPE,
};

/**
 * Named export of the Supabase session store.
 * Shared with the ePDS callback route so both flows write to the same store.
 * Wrapped with debug logging to trace all SDK-internal and route-level calls.
 */
const _sessionStore = createSupabaseSessionStore(supabase, APP_ID);
export const sessionStore = {
  async get(did: string) {
    const result = await _sessionStore.get(did);
    debug.log('[session-store] GET', { did, found: !!result, hasDpopJwk: !!result?.dpopJwk, hasTokenSet: !!result?.tokenSet, tokenType: result?.tokenSet?.token_type, iss: result?.tokenSet?.iss, sub: result?.tokenSet?.sub });
    return result;
  },
  async set(did: string, session: Parameters<typeof _sessionStore.set>[1]) {
    debug.log('[session-store] SET', { did, hasDpopJwk: !!session?.dpopJwk, hasTokenSet: !!session?.tokenSet, tokenType: session?.tokenSet?.token_type, iss: session?.tokenSet?.iss, sub: session?.tokenSet?.sub, hasRefreshToken: !!session?.tokenSet?.refresh_token, hasAccessToken: !!session?.tokenSet?.access_token });
    return _sessionStore.set(did, session);
  },
  async del(did: string) {
    debug.log('[session-store] DEL', { did });
    return _sessionStore.del(did);
  },
};

/**
 * ePDS-specific ephemeral state store (delete-on-read).
 * Uses a separate app_id prefix ('bumicerts-epds') to avoid key collisions
 * with the SDK's own state store ('bumicerts').
 */
export const epdsStateStore = createEpdsStateStore(
  // Cast back to SupabaseClient — same version-mismatch workaround as sessionStore above
  supabase as unknown as import("@supabase/supabase-js").SupabaseClient,
  "bumicerts-epds"
);

export const atprotoSDK = createATProtoSDK({
  oauth: isLoopback() ? DEV_OAUTH_CONFIG : PROD_OAUTH_CONFIG,
  storage: {
    sessionStore,
    stateStore: createSupabaseStateStore(supabase, APP_ID),
  },
});
