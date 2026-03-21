/**
 * createAuthSetup — the main entry point for @gainforest/atproto-auth-next.
 *
 * Creates a fully-configured auth setup object containing:
 * - Route handlers (authorize, callback, logout, client-metadata, jwks, ePDS)
 * - Server actions (authorize, logout, checkSession, getProfile, checkSessionAndGetProfile)
 * - Session utilities (getSession, restoreSession, getAuthenticatedAgent)
 * - Configuration metadata (isEpdsEnabled, publicUrl, isLoopback)
 *
 * Designed for the single-file setup pattern:
 *
 * ```typescript
 * // lib/auth.ts
 * import { createAuthSetup } from "@gainforest/atproto-auth-next";
 * import { createClient } from "@supabase/supabase-js";
 *
 * const supabase = createClient(
 *   process.env.NEXT_PUBLIC_SUPABASE_URL!,
 *   process.env.SUPABASE_SERVICE_ROLE_KEY!
 * );
 *
 * export const auth = createAuthSetup({
 *   privateKeyJwk: process.env.ATPROTO_JWK_PRIVATE!,
 *   cookieSecret: process.env.COOKIE_SECRET!,
 *   supabase,
 *   appId: "myapp",
 *   clientName: "My App",
 *   defaultPdsDomain: "climateai.org",
 *   epds: process.env.NEXT_PUBLIC_EPDS_URL
 *     ? { url: process.env.NEXT_PUBLIC_EPDS_URL }
 *     : undefined,
 *   onCallback: { redirectTo: "/" },
 * });
 * ```
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { NodeOAuthClient } from "@atproto/oauth-client-node";
import type { NextRequest } from "next/server";
import { createOAuthClient, DEFAULT_OAUTH_SCOPE } from "./oauth-client";
import { createSupabaseSessionStore } from "./stores/session-store";
import { createSupabaseStateStore } from "./stores/state-store";
import { resolvePublicUrl, isLoopback, PLACEHOLDER_URL } from "./utils/url";
import { configureDebug } from "./utils/debug";
import { buildSessionOptions, type SessionConfig } from "./session/config";
import { getSession, saveSession, clearSession } from "./session/cookie";
import { restoreSession, getAuthenticatedAgent } from "./session/restore";
import { createAuthorizeHandler } from "./handlers/routes";
import { createCallbackHandler } from "./handlers/routes";
import { createLogoutHandler } from "./handlers/routes";
import { createClientMetadataHandler, createJwksHandler } from "./handlers/metadata";
import {
  createEpdsLoginHandler,
  createEpdsCallbackHandler,
  type EpdsLoginHandlerConfig,
  type EpdsCallbackHandlerConfig,
} from "./handlers/epds";
import { createAuthActions } from "./actions";
import type { AuthActions } from "./actions";
import type { AnySession } from "./session/types";
import type { Agent } from "@atproto/api";

// ─── Config types ─────────────────────────────────────────────────────────────

export type AuthSetupConfig = {
  // ─── Required ───────────────────────────────────────────────────────────────
  /**
   * Private JWK as a JSON string (the `ATPROTO_JWK_PRIVATE` env var).
   * Must be an EC P-256 key used for client authentication and JWKS.
   */
  privateKeyJwk: string;
  /**
   * Secret for iron-session cookie encryption. Must be at least 32 characters.
   */
  cookieSecret: string;
  /**
   * Supabase client (server-side, service role key).
   */
  supabase: SupabaseClient;
  /**
   * Unique identifier for this app in the shared Supabase tables.
   * e.g. "bumicerts", "myapp"
   */
  appId: string;

  // ─── Optional: URL / Environment ─────────────────────────────────────────────
  /**
   * The app's public URL. Should be resolved by the consuming app from its
   * own environment variables (e.g. VERCEL_URL) and passed in here.
   * Falls back to "https://placeholder.invalid" at build time if omitted.
   */
  publicUrl?: string;

  // ─── Optional: OAuth config ───────────────────────────────────────────────────
  /**
   * OAuth scope. Defaults to "atproto transition:generic".
   */
  scope?: string;
  /**
   * App name shown in OAuth consent and client metadata. Defaults to "Gainforest".
   */
  clientName?: string;
  /**
   * Cookie name for the app session. Defaults to "gainforest_session".
   */
  cookieName?: string;
  /**
   * Whether to set the cookie `Secure` flag. Should be set by the consuming
   * app (e.g. `NODE_ENV === "production"`). Defaults to false if not provided.
   */
  cookieSecure?: boolean;
  /**
   * Enable debug logging for this auth setup. Defaults to false.
   * Pass true when you want verbose auth logs (e.g. `DEBUG === "1"`).
   */
  debug?: boolean;

  // ─── Optional: Handle normalization ──────────────────────────────────────────
  /**
   * Default PDS domain for handle normalization.
   * When set, "alice" → "alice.{defaultPdsDomain}".
   * e.g. "climateai.org"
   */
  defaultPdsDomain?: string;

  // ─── Optional: ePDS (email-based auth) ───────────────────────────────────────
  /**
   * ePDS configuration. When provided, email-based OAuth is enabled.
   * The ePDS login/callback route handlers are wired automatically.
   */
  epds?: {
    /** ePDS base URL (e.g. https://climateai.org). */
    url: string;
  };

  // ─── Optional: Redirect paths ────────────────────────────────────────────────
  /**
   * Redirect paths after OAuth callbacks. Defaults to "/".
   */
  onCallback?: {
    redirectTo: string;
  };
  /**
   * Redirect path after logout. If not set, logout returns `{ ok: true }`.
   */
  onLogout?: {
    redirectTo?: string;
  };

  // ─── Optional: Branding / OAuth consent screen ───────────────────────────────
  /**
   * Logo URI shown on OAuth consent screens.
   * e.g. "https://example.com/logo.png"
   */
  logoUri?: string;
  /**
   * Brand color (hex) for OAuth consent screens.
   * e.g. "#2FCE8A"
   */
  brandColor?: string;
  /**
   * Background color (hex) for OAuth consent screens.
   * e.g. "#FFFFFF"
   */
  backgroundColor?: string;
  /**
   * Email template URI for OTP emails (ePDS).
   * e.g. "https://example.com/email-template.html"
   */
  emailTemplateUri?: string;
  /**
   * Email subject template for OTP emails (ePDS).
   * Supports placeholders: {{code}}, {{app_name}}
   * e.g. "{{code}} — Your {{app_name}} sign-in code"
   */
  emailSubjectTemplate?: string;
  /**
   * Terms of service URI.
   */
  tosUri?: string;
  /**
   * Privacy policy URI.
   */
  policyUri?: string;
};

// ─── Output types ─────────────────────────────────────────────────────────────

type RouteHandler = (req: NextRequest) => Promise<Response | void>;
type NoopHandler = () => never;

export type AuthSetup = {
  /** The underlying NodeOAuthClient (for advanced use). */
  oauthClient: NodeOAuthClient;
  /** iron-session configuration (for advanced use). */
  sessionConfig: SessionConfig;

  /** Route handlers — re-export these from your API route files. */
  handlers: {
    /** Mount at: /api/oauth/authorize (POST) */
    authorize: { POST: RouteHandler };
    /** Mount at: /api/oauth/callback (GET) */
    callback: { GET: RouteHandler };
    /** Mount at: /api/oauth/logout (POST) */
    logout: { POST: RouteHandler };
    /** Mount at: /client-metadata.json (GET) */
    clientMetadata: { GET: (req: NextRequest) => Response };
    /** Mount at: /.well-known/jwks.json (GET) */
    jwks: { GET: () => Response };
    /**
     * ePDS handlers. Only operational when `epds.url` is configured.
     * If ePDS is not configured, calling these handlers throws an error.
     */
    epds: {
      /** Mount at: /api/oauth/epds/login (GET) */
      login: { GET: RouteHandler | NoopHandler };
      /** Mount at: /api/oauth/epds/callback (GET) */
      callback: { GET: RouteHandler | NoopHandler };
    };
  };

  /**
   * Server action factories — wrap these in a "use server" file.
   *
   * @example
   * ```typescript
   * // actions/auth.ts
   * "use server";
   * import { auth } from "@/lib/auth";
   * export const authorize = auth.actions.authorize;
   * export const logout = auth.actions.logout;
   * export const checkSession = auth.actions.checkSession;
   * export const checkSessionAndGetProfile = auth.actions.checkSessionAndGetProfile;
   * ```
   */
  actions: AuthActions;

  /** Session utilities for use in server-side code. */
  session: {
    /**
     * Read the current session from the encrypted cookie.
     * Returns `{ isLoggedIn: false }` if no session exists.
     */
    getSession: () => Promise<AnySession>;
    /**
     * Restore the OAuth session from Supabase for a given DID.
     * Returns `null` if the session is gone (user must re-authenticate).
     */
    restoreSession: (did: string) => Promise<Awaited<ReturnType<NodeOAuthClient["restore"]>> | null>;
    /**
     * Get an authenticated @atproto/api Agent for a given DID.
     * Returns `null` if the session cannot be restored.
     */
    getAuthenticatedAgent: (did: string) => Promise<Agent | null>;
    /** Save a session to the encrypted cookie. */
    saveSession: (data: {
      did: string;
      handle: string;
      isLoggedIn: true;
    }) => Promise<void>;
    /** Clear the session cookie (logout). */
    clearSession: () => Promise<void>;
  };

  /** Resolved public URL used for this setup. */
  publicUrl: string;
  /** Whether the resolved URL is a loopback (127.0.0.1/localhost). */
  isLoopback: boolean;
  /** Whether ePDS email-based auth is enabled. */
  isEpdsEnabled: boolean;
};

// ─── Implementation ───────────────────────────────────────────────────────────

/**
 * Creates the complete auth setup for a Next.js application.
 *
 * Returns route handlers, server actions, and session utilities — all
 * wired together from a single configuration object.
 */
export function createAuthSetup(config: AuthSetupConfig): AuthSetup {
  const {
    privateKeyJwk,
    cookieSecret,
    supabase,
    appId,
    scope = DEFAULT_OAUTH_SCOPE,
    clientName = "Gainforest",
    cookieName,
    cookieSecure,
    defaultPdsDomain,
    epds: epdsConfig,
    onCallback,
    onLogout,
    // Branding options
    logoUri,
    brandColor,
    backgroundColor,
    emailTemplateUri,
    emailSubjectTemplate,
    tosUri,
    policyUri,
    debug,
  } = config;

  // ─── Debug configuration ─────────────────────────────────────────────────────
  configureDebug(debug ?? false);

  // ─── URL resolution ─────────────────────────────────────────────────────────
  const publicUrl = resolvePublicUrl(config.publicUrl);

  // Guard: the placeholder is only valid during `next build`. If the server is
  // actually handling requests without a real publicUrl, the OAuth client_id and
  // redirect_uris would point to an unresolvable domain and every PDS would
  // reject them. Fail fast with a clear message so the developer knows exactly
  // what to fix — without the package ever reading env vars itself.
  if (publicUrl === PLACEHOLDER_URL) {
    throw new Error(
      "[atproto-auth] createAuthSetup() was called without a valid publicUrl.\n" +
      "Pass the app's public URL via the `publicUrl` option:\n" +
      "  • Production / Vercel:  publicUrl: `https://${VERCEL_URL}`\n" +
      "  • Local dev (loopback): publicUrl: 'http://127.0.0.1:3000'\n" +
      "  • Local dev (ngrok):    publicUrl: process.env.NEXT_PUBLIC_BASE_URL\n" +
      "The package never reads environment variables directly — the consuming app is responsible for resolving and passing this value.",
    );
  }

  const loopback = isLoopback(publicUrl);
  const isEpdsEnabled = !!epdsConfig;

  // ─── Session config ─────────────────────────────────────────────────────────
  const sessionConfig: SessionConfig = {
    cookieSecret,
    cookieName,
    secure: cookieSecure,
  };

  // ─── Stores ─────────────────────────────────────────────────────────────────
  const sessionStore = createSupabaseSessionStore(supabase, appId);
  const stateStore = createSupabaseStateStore(supabase, appId);

  // ─── Extra redirect URIs for ePDS ───────────────────────────────────────────
  const extraRedirectUris = isEpdsEnabled
    ? [`${publicUrl}/api/oauth/epds/callback`]
    : [];

  // ─── OAuth client ────────────────────────────────────────────────────────────
  const oauthClient = createOAuthClient({
    publicUrl,
    privateKeyJwk,
    sessionStore,
    stateStore,
    scope,
    extraRedirectUris,
    clientName,
  });

  // ─── Route handlers ──────────────────────────────────────────────────────────
  const authorizeHandler = createAuthorizeHandler(oauthClient, {
    defaultPdsDomain,
    scope,
  });

  const callbackHandler = createCallbackHandler(oauthClient, sessionConfig, {
    redirectTo: onCallback?.redirectTo,
  });

  const logoutHandler = createLogoutHandler(oauthClient, sessionConfig, {
    redirectTo: onLogout?.redirectTo,
  });

  const clientMetadataHandler = createClientMetadataHandler(publicUrl, {
    clientName,
    extraRedirectUris,
    scope,
    logoUri,
    brandColor,
    backgroundColor,
    emailTemplateUri,
    emailSubjectTemplate,
    tosUri,
    policyUri,
  });

  const jwksHandler = createJwksHandler(privateKeyJwk);

  // ─── ePDS handlers ───────────────────────────────────────────────────────────
  // Both handlers use the shared oauthClient. The SDK handles all OAuth
  // complexity (PKCE, DPoP, PAR, token exchange, session storage) internally
  // via client.authorize(epdsUrl) and client.callback(params).
  const noopEpdsHandler = (): never => {
    throw new Error(
      "[atproto-auth] ePDS is not configured. " +
        "Pass `epds: { url: '...' }` to createAuthSetup() to enable email-based auth.",
    );
  };

  const epdsLoginHandlerConfig: EpdsLoginHandlerConfig | null = isEpdsEnabled
    ? {
        oauthClient,
        epdsUrl: epdsConfig!.url,
        scope,
        errorRedirectTo: "/?error=auth_failed",
      }
    : null;

  const epdsCallbackHandlerConfig: EpdsCallbackHandlerConfig | null = isEpdsEnabled
    ? {
        oauthClient,
        sessionConfig,
        successRedirectTo: onCallback?.redirectTo,
        errorRedirectTo: "/?error=auth_failed",
      }
    : null;

  const epdsLoginHandler = epdsLoginHandlerConfig
    ? createEpdsLoginHandler(epdsLoginHandlerConfig)
    : noopEpdsHandler;

  const epdsCallbackHandler = epdsCallbackHandlerConfig
    ? createEpdsCallbackHandler(epdsCallbackHandlerConfig)
    : noopEpdsHandler;

  // ─── Server actions ──────────────────────────────────────────────────────────
  const actions = createAuthActions({
    oauthClient,
    sessionConfig,
    defaultPdsDomain,
    scope,
  });

  // ─── Session utilities ────────────────────────────────────────────────────────
  const sessionUtils = {
    getSession: () => getSession(sessionConfig),
    restoreSession: (did: string) => restoreSession(oauthClient, did),
    getAuthenticatedAgent: (did: string) =>
      getAuthenticatedAgent(oauthClient, did),
    saveSession: (data: { did: string; handle: string; isLoggedIn: true }) =>
      saveSession(data, sessionConfig),
    clearSession: () => clearSession(sessionConfig),
  };

  return {
    oauthClient,
    sessionConfig,
    handlers: {
      authorize: { POST: authorizeHandler },
      callback: { GET: callbackHandler },
      logout: { POST: logoutHandler },
      clientMetadata: { GET: clientMetadataHandler },
      jwks: { GET: jwksHandler },
      epds: {
        login: { GET: epdsLoginHandler },
        callback: { GET: epdsCallbackHandler },
      },
    },
    actions,
    session: sessionUtils,
    publicUrl,
    isLoopback: loopback,
    isEpdsEnabled,
  };
}

// ─── Legacy low-level exports (backwards compat) ─────────────────────────────

/** @deprecated Use createAuthSetup() instead. */
export type OAuthSetupConfig = {
  publicUrl: string;
  privateKeyJwk: string;
  cookieSecret: string;
  cookieName?: string;
  secure?: boolean;
  supabase: SupabaseClient;
  appId: string;
};

/** @deprecated Use createAuthSetup() instead. */
export type OAuthSetup = {
  oauthClient: NodeOAuthClient;
  sessionConfig: SessionConfig;
};

/** @deprecated Use createAuthSetup() instead. */
export function createOAuthSetup({
  publicUrl,
  privateKeyJwk,
  cookieSecret,
  cookieName,
  secure,
  supabase,
  appId,
}: OAuthSetupConfig): OAuthSetup {
  const oauthClient = createOAuthClient({
    publicUrl,
    privateKeyJwk,
    sessionStore: createSupabaseSessionStore(supabase, appId),
    stateStore: createSupabaseStateStore(supabase, appId),
  });

  const sessionConfig: SessionConfig = {
    cookieSecret,
    cookieName,
    secure,
  };

  return { oauthClient, sessionConfig };
}
