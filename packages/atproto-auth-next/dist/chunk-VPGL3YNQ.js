import {
  createSupabaseSessionStore,
  createSupabaseStateStore
} from "./chunk-KQLTEQV7.js";

// src/utils/url.ts
var PLACEHOLDER_URL = "https://placeholder.invalid";
function resolvePublicUrl(explicitUrl) {
  if (explicitUrl) {
    return explicitUrl.replace(/\/$/, "");
  }
  return PLACEHOLDER_URL;
}
function isLoopback(url) {
  return url.includes("127.0.0.1") || url.includes("localhost");
}
function resolveRequestPublicUrl(req, fallbackPublicUrl) {
  try {
    const parsed = new URL(req.url);
    const origin = parsed.origin.replace("localhost", "127.0.0.1");
    return origin;
  } catch {
    return fallbackPublicUrl;
  }
}

// src/oauth-client.ts
import { NodeOAuthClient } from "@atproto/oauth-client-node";
import { JoseKey } from "@atproto/jwk-jose";
var DEFAULT_OAUTH_SCOPE = "atproto transition:generic";
function createOAuthClient({
  publicUrl,
  privateKeyJwk,
  stateStore,
  sessionStore,
  scope = DEFAULT_OAUTH_SCOPE,
  extraRedirectUris = [],
  clientName = "Gainforest"
}) {
  const url = publicUrl.replace(/\/$/, "");
  const redirectUris = [
    `${url}/api/oauth/callback`,
    ...extraRedirectUris
  ];
  const loopback = isLoopback(url);
  const parsed = JSON.parse(privateKeyJwk);
  const rawJwk = Array.isArray(parsed?.keys) ? parsed.keys[0] : parsed;
  if (!rawJwk.kid) {
    rawJwk.kid = "default";
  }
  const key = new JoseKey(rawJwk);
  if (loopback) {
    const params = new URLSearchParams();
    params.set("scope", scope);
    for (const uri of redirectUris) {
      params.append("redirect_uri", uri);
    }
    const clientId = `http://localhost?${params.toString()}`;
    return new NodeOAuthClient({
      clientMetadata: {
        client_id: clientId,
        client_name: clientName,
        client_uri: url,
        redirect_uris: redirectUris,
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
        scope,
        token_endpoint_auth_method: "none",
        application_type: "native",
        dpop_bound_access_tokens: true
      },
      keyset: [key],
      stateStore,
      sessionStore
    });
  }
  return new NodeOAuthClient({
    clientMetadata: {
      client_id: `${url}/client-metadata.json`,
      client_name: clientName,
      client_uri: url,
      redirect_uris: redirectUris,
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      scope,
      token_endpoint_auth_method: "private_key_jwt",
      token_endpoint_auth_signing_alg: "ES256",
      application_type: "web",
      dpop_bound_access_tokens: true,
      jwks_uri: `${url}/.well-known/jwks.json`
    },
    keyset: [key],
    stateStore,
    sessionStore
  });
}

// src/session/cookie.ts
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";

// src/session/config.ts
var COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
var DEFAULT_COOKIE_NAME = "gainforest_session";
function buildSessionOptions({
  cookieSecret,
  cookieName = DEFAULT_COOKIE_NAME,
  secure
}) {
  if (cookieSecret.length < 32) {
    throw new Error("cookieSecret must be at least 32 characters");
  }
  return {
    password: cookieSecret,
    cookieName,
    cookieOptions: {
      httpOnly: true,
      secure: secure ?? false,
      sameSite: "lax",
      maxAge: COOKIE_MAX_AGE_SECONDS,
      path: "/"
    }
  };
}

// src/session/cookie.ts
async function getSession(config) {
  const cookieStore = await cookies();
  const session = await getIronSession(
    cookieStore,
    buildSessionOptions(config)
  );
  if (!session.isLoggedIn) {
    return { isLoggedIn: false };
  }
  return {
    isLoggedIn: true,
    did: session.did,
    handle: session.handle
  };
}
async function saveSession(data, config) {
  const cookieStore = await cookies();
  const session = await getIronSession(
    cookieStore,
    buildSessionOptions(config)
  );
  session.did = data.did;
  session.handle = data.handle;
  session.isLoggedIn = true;
  await session.save();
}
async function saveSessionToResponse(data, config, req, res) {
  const session = await getIronSession(req, res, buildSessionOptions(config));
  session.did = data.did;
  session.handle = data.handle;
  session.isLoggedIn = true;
  await session.save();
}
async function clearSession(config) {
  const cookieStore = await cookies();
  const session = await getIronSession(
    cookieStore,
    buildSessionOptions(config)
  );
  session.destroy();
}

// src/session/restore.ts
import { Agent } from "@atproto/api";

// src/utils/debug.ts
var isEnabled = false;
function configureDebug(enabled) {
  isEnabled = enabled;
}
var debug = {
  log(label, data) {
    if (!isEnabled) return;
    if (data !== void 0) {
      console.log(`[atproto-auth] ${label}`, data);
    } else {
      console.log(`[atproto-auth] ${label}`);
    }
  },
  warn(label, data) {
    if (!isEnabled) return;
    if (data !== void 0) {
      console.warn(`[atproto-auth] ${label}`, data);
    } else {
      console.warn(`[atproto-auth] ${label}`);
    }
  },
  error(label, data) {
    if (data !== void 0) {
      console.error(`[atproto-auth] ${label}`, data);
    } else {
      console.error(`[atproto-auth] ${label}`);
    }
  }
};

// src/session/restore.ts
async function restoreSession(client, did) {
  try {
    const session = await client.restore(did);
    debug.log("[restore-session] Restored", { did, found: !!session });
    console.log("SESSION========", JSON.stringify(session));
    return session;
  } catch (error) {
    console.log("ERROR_SESSION_RESTORE========", error);
    debug.warn("[restore-session] Failed to restore session", {
      did,
      error: error instanceof Error ? error.message : String(error)
    });
    return null;
  }
}
async function getAuthenticatedAgent(client, did) {
  const session = await restoreSession(client, did);
  if (!session) return null;
  return new Agent(session);
}

// src/handlers/routes.ts
import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { Agent as Agent2 } from "@atproto/api";
function createAuthorizeHandler(client, options = {}) {
  return async function POST(req) {
    const { handle } = await req.json();
    const normalizedHandle = handle.includes(".") || !options.defaultPdsDomain ? handle : `${handle}.${options.defaultPdsDomain}`;
    debug.log("[authorize] Starting OAuth flow", {
      handle: normalizedHandle
    });
    const authUrl = await client.authorize(normalizedHandle, {
      scope: options.scope ?? DEFAULT_OAUTH_SCOPE
    });
    return NextResponse.json({ url: authUrl.toString() });
  };
}
function createCallbackHandler(client, sessionConfig, options = {}) {
  return async function GET(req) {
    let success = false;
    try {
      const params = req.nextUrl.searchParams;
      const result = await client.callback(params);
      const agent = new Agent2(result.session);
      const { data } = await agent.com.atproto.repo.describeRepo({
        repo: result.session.did
      });
      await saveSession(
        { did: result.session.did, handle: data.handle, isLoggedIn: true },
        sessionConfig
      );
      debug.log("[callback] Session saved", {
        did: result.session.did,
        handle: data.handle
      });
      success = true;
    } catch (error) {
      if (error instanceof Error && error.message === "NEXT_REDIRECT") {
        throw error;
      }
      debug.error("[callback] OAuth callback failed", error);
    }
    if (success) {
      redirect(options.redirectTo ?? "/");
    } else {
      redirect("/?error=auth_failed");
    }
  };
}
function createLogoutHandler(client, sessionConfig, options = {}) {
  return async function POST() {
    const session = await getSession(sessionConfig);
    if (session.isLoggedIn) {
      try {
        await client.revoke(session.did);
        debug.log("[logout] Session revoked", { did: session.did });
      } catch (error) {
        debug.warn("[logout] Failed to revoke session", error);
      }
    }
    await clearSession(sessionConfig);
    if (options.redirectTo) {
      return NextResponse.redirect(options.redirectTo);
    }
    return NextResponse.json({ ok: true });
  };
}

// src/handlers/metadata.ts
import { NextResponse as NextResponse2 } from "next/server";
function createClientMetadataHandler(publicUrl, options) {
  const loopback = isLoopback(publicUrl);
  const scope = options.scope ?? DEFAULT_OAUTH_SCOPE;
  return function GET(req) {
    const url = resolveRequestPublicUrl(req, publicUrl);
    const redirectUris = [
      `${url}/api/oauth/callback`,
      ...options.extraRedirectUris?.map(
        (u) => (
          // extraRedirectUris may be absolute (loopback) or path-relative — keep absolute as-is
          u.startsWith("http") ? u.replace(/^https?:\/\/[^/]+/, url) : `${url}${u}`
        )
      ) ?? []
    ];
    const commonFields = {
      client_name: options.clientName,
      client_uri: url,
      redirect_uris: redirectUris,
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      scope,
      dpop_bound_access_tokens: true,
      jwks_uri: `${url}/.well-known/jwks.json`
    };
    if (options.logoUri) commonFields.logo_uri = options.logoUri;
    if (options.brandColor) commonFields.brand_color = options.brandColor;
    if (options.backgroundColor) commonFields.background_color = options.backgroundColor;
    if (options.emailTemplateUri) commonFields.email_template_uri = options.emailTemplateUri;
    if (options.emailSubjectTemplate) commonFields.email_subject_template = options.emailSubjectTemplate;
    if (options.tosUri) commonFields.tos_uri = options.tosUri;
    if (options.policyUri) commonFields.policy_uri = options.policyUri;
    if (loopback) {
      const params = new URLSearchParams();
      params.set("scope", scope);
      for (const uri of redirectUris) {
        params.append("redirect_uri", uri);
      }
      return NextResponse2.json(
        {
          client_id: `http://localhost?${params.toString()}`,
          ...commonFields,
          token_endpoint_auth_method: "none",
          application_type: "native"
        },
        { headers: { "Cache-Control": "no-store" } }
      );
    }
    return NextResponse2.json(
      {
        client_id: `${url}/client-metadata.json`,
        ...commonFields,
        token_endpoint_auth_method: "private_key_jwt",
        token_endpoint_auth_signing_alg: "ES256",
        application_type: "web"
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  };
}
function createJwksHandler(privateKeyJwk) {
  const parsed = JSON.parse(privateKeyJwk);
  const rawKey = Array.isArray(parsed?.keys) ? parsed.keys[0] : parsed;
  if (!rawKey.kid) {
    rawKey.kid = "default";
  }
  const { d: _d, ...publicKey } = rawKey;
  return function GET() {
    return NextResponse2.json(
      { keys: [publicKey] },
      { headers: { "Cache-Control": "public, max-age=3600" } }
    );
  };
}

// src/handlers/epds.ts
import { NextResponse as NextResponse3 } from "next/server";
import { Agent as Agent3 } from "@atproto/api";
function createEpdsLoginHandler(config) {
  return async function GET(req) {
    try {
      const email = req.nextUrl.searchParams.get("email") ?? void 0;
      debug.log("[epds/login] Starting ePDS flow", { email: !!email, epdsUrl: config.epdsUrl });
      const authUrl = await config.oauthClient.authorize(config.epdsUrl, {
        scope: config.scope
      });
      const url = new URL(authUrl.toString());
      if (email) {
        url.searchParams.set("login_hint", email);
      }
      debug.log("[epds/login] Redirecting to ePDS auth", { url: url.toString() });
      return NextResponse3.redirect(url.toString());
    } catch (error) {
      debug.error("[epds/login] Unexpected error", error);
      const base = new URL(req.url).origin;
      return NextResponse3.redirect(
        new URL(config.errorRedirectTo ?? "/?error=auth_failed", base)
      );
    }
  };
}
function createEpdsCallbackHandler(config) {
  return async function GET(req) {
    const base = new URL(req.url).origin;
    const errorRedirect = () => NextResponse3.redirect(
      new URL(config.errorRedirectTo ?? "/?error=auth_failed", base)
    );
    try {
      debug.log("[epds/callback] Processing ePDS callback");
      const { session } = await config.oauthClient.callback(req.nextUrl.searchParams);
      debug.log("[epds/callback] OAuth callback succeeded", { did: session.did });
      let resolvedHandle = session.did;
      try {
        const agent = new Agent3(session);
        const { data } = await agent.com.atproto.repo.describeRepo({
          repo: session.did
        });
        resolvedHandle = data.handle;
        debug.log("[epds/callback] Handle resolved", { handle: resolvedHandle });
      } catch (handleError) {
        debug.warn("[epds/callback] Handle resolution failed, using DID as fallback", handleError);
      }
      const successUrl = new URL(config.successRedirectTo ?? "/", base);
      const response = NextResponse3.redirect(successUrl);
      await saveSessionToResponse(
        { did: session.did, handle: resolvedHandle, isLoggedIn: true },
        config.sessionConfig,
        req,
        response
      );
      debug.log("[epds/callback] Session cookie saved, redirecting", { successUrl: successUrl.toString() });
      return response;
    } catch (error) {
      debug.error("[epds/callback] Unexpected error", error);
      return errorRedirect();
    }
  };
}

// src/profile/index.ts
async function fetchProfile(agent, did, handle) {
  const fetchRecord = async (collection) => {
    try {
      const res = await agent.com.atproto.repo.getRecord({
        repo: did,
        collection,
        rkey: "self"
      });
      return res.data.value ?? null;
    } catch {
      return null;
    }
  };
  debug.log("[profile] Fetching profiles in parallel", { did });
  const [certifiedProfile, bskyProfile] = await Promise.all([
    fetchRecord("app.certified.profile"),
    fetchRecord("app.bsky.actor.profile")
  ]);
  const raw = certifiedProfile ?? bskyProfile;
  if (!raw) {
    debug.log("[profile] No profile found", { did });
    return null;
  }
  let avatarUrl;
  if (typeof raw.avatar === "string") {
    avatarUrl = raw.avatar;
  }
  debug.log("[profile] Profile fetched", {
    did,
    source: certifiedProfile ? "certified" : "bsky",
    hasDisplayName: !!raw.displayName,
    hasAvatar: !!avatarUrl
  });
  return {
    handle,
    displayName: raw.displayName,
    description: raw.description,
    avatar: avatarUrl
  };
}

// src/actions/index.ts
function createAuthActions(config) {
  const { oauthClient, sessionConfig, defaultPdsDomain, scope = DEFAULT_OAUTH_SCOPE } = config;
  async function authorize(handle) {
    const normalizedHandle = handle.includes(".") || !defaultPdsDomain ? handle : `${handle}.${defaultPdsDomain}`;
    debug.log("[actions/authorize] Starting OAuth flow", { handle: normalizedHandle });
    const authUrl = await oauthClient.authorize(normalizedHandle, { scope });
    return { authorizationUrl: authUrl.toString() };
  }
  async function logout() {
    const session = await getSession(sessionConfig);
    try {
      if (session.isLoggedIn) {
        await oauthClient.revoke(session.did);
        debug.log("[actions/logout] Session revoked", { did: session.did });
      }
    } catch (error) {
      debug.warn("[actions/logout] Failed to revoke session", error);
    } finally {
      await clearSession(sessionConfig);
    }
    return { success: true };
  }
  async function checkSession() {
    const session = await getSession(sessionConfig);
    if (!session.isLoggedIn) {
      return { authenticated: false };
    }
    const oauthSession = await restoreSession(oauthClient, session.did);
    if (!oauthSession) {
      debug.warn("[actions/checkSession] Session gone \u2014 clearing cookie", {
        did: session.did
      });
      await clearSession(sessionConfig);
      return { authenticated: false };
    }
    return {
      authenticated: true,
      did: session.did,
      handle: session.handle
    };
  }
  async function getProfileAction(did) {
    const appSession = await getSession(sessionConfig);
    if (!appSession.isLoggedIn || appSession.did !== did) {
      return { error: "unauthorized" };
    }
    const agent = await getAuthenticatedAgent(oauthClient, did);
    if (!agent) {
      debug.warn("[actions/getProfile] Could not restore session", { did });
      return null;
    }
    try {
      return await fetchProfile(agent, did, appSession.handle ?? did);
    } catch (error) {
      debug.error("[actions/getProfile] Profile fetch failed", error);
      return null;
    }
  }
  async function checkSessionAndGetProfile() {
    const session = await getSession(sessionConfig);
    if (!session.isLoggedIn) {
      return { isLoggedIn: false };
    }
    const oauthSession = await restoreSession(oauthClient, session.did);
    if (!oauthSession) {
      debug.warn("[actions/checkSessionAndGetProfile] Session gone \u2014 clearing cookie", {
        did: session.did
      });
      await clearSession(sessionConfig);
      return { isLoggedIn: false };
    }
    let profile;
    try {
      const { Agent: Agent4 } = await import("@atproto/api");
      const agent = new Agent4(oauthSession);
      const fetched = await fetchProfile(agent, session.did, session.handle ?? session.did);
      profile = fetched ?? void 0;
    } catch (error) {
      debug.warn("[actions/checkSessionAndGetProfile] Profile fetch failed", error);
    }
    return {
      isLoggedIn: true,
      did: session.did,
      handle: session.handle,
      profile
    };
  }
  return {
    authorize,
    logout,
    checkSession,
    getProfile: getProfileAction,
    checkSessionAndGetProfile
  };
}

// src/setup.ts
function createAuthSetup(config) {
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
    debug: debug2
  } = config;
  configureDebug(debug2 ?? false);
  const publicUrl = resolvePublicUrl(config.publicUrl);
  if (publicUrl === PLACEHOLDER_URL) {
    throw new Error(
      "[atproto-auth] createAuthSetup() was called without a valid publicUrl.\nPass the app's public URL via the `publicUrl` option:\n  \u2022 Production / Vercel:  publicUrl: `https://${VERCEL_URL}`\n  \u2022 Local dev (loopback): publicUrl: 'http://127.0.0.1:3000'\n  \u2022 Local dev (ngrok):    publicUrl: process.env.NEXT_PUBLIC_BASE_URL\nThe package never reads environment variables directly \u2014 the consuming app is responsible for resolving and passing this value."
    );
  }
  const loopback = isLoopback(publicUrl);
  const isEpdsEnabled = !!epdsConfig;
  const sessionConfig = {
    cookieSecret,
    cookieName,
    secure: cookieSecure
  };
  const sessionStore = createSupabaseSessionStore(supabase, appId);
  const stateStore = createSupabaseStateStore(supabase, appId);
  const extraRedirectUris = isEpdsEnabled ? [`${publicUrl}/api/oauth/epds/callback`] : [];
  const oauthClient = createOAuthClient({
    publicUrl,
    privateKeyJwk,
    sessionStore,
    stateStore,
    scope,
    extraRedirectUris,
    clientName
  });
  const authorizeHandler = createAuthorizeHandler(oauthClient, {
    defaultPdsDomain,
    scope
  });
  const callbackHandler = createCallbackHandler(oauthClient, sessionConfig, {
    redirectTo: onCallback?.redirectTo
  });
  const logoutHandler = createLogoutHandler(oauthClient, sessionConfig, {
    redirectTo: onLogout?.redirectTo
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
    policyUri
  });
  const jwksHandler = createJwksHandler(privateKeyJwk);
  const noopEpdsHandler = () => {
    throw new Error(
      "[atproto-auth] ePDS is not configured. Pass `epds: { url: '...' }` to createAuthSetup() to enable email-based auth."
    );
  };
  const epdsLoginHandlerConfig = isEpdsEnabled ? {
    oauthClient,
    epdsUrl: epdsConfig.url,
    scope,
    errorRedirectTo: "/?error=auth_failed"
  } : null;
  const epdsCallbackHandlerConfig = isEpdsEnabled ? {
    oauthClient,
    sessionConfig,
    successRedirectTo: onCallback?.redirectTo,
    errorRedirectTo: "/?error=auth_failed"
  } : null;
  const epdsLoginHandler = epdsLoginHandlerConfig ? createEpdsLoginHandler(epdsLoginHandlerConfig) : noopEpdsHandler;
  const epdsCallbackHandler = epdsCallbackHandlerConfig ? createEpdsCallbackHandler(epdsCallbackHandlerConfig) : noopEpdsHandler;
  const actions = createAuthActions({
    oauthClient,
    sessionConfig,
    defaultPdsDomain,
    scope
  });
  const sessionUtils = {
    getSession: () => getSession(sessionConfig),
    restoreSession: (did) => restoreSession(oauthClient, did),
    getAuthenticatedAgent: (did) => getAuthenticatedAgent(oauthClient, did),
    saveSession: (data) => saveSession(data, sessionConfig),
    clearSession: () => clearSession(sessionConfig)
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
        callback: { GET: epdsCallbackHandler }
      }
    },
    actions,
    session: sessionUtils,
    publicUrl,
    isLoopback: loopback,
    isEpdsEnabled
  };
}
function createOAuthSetup({
  publicUrl,
  privateKeyJwk,
  cookieSecret,
  cookieName,
  secure,
  supabase,
  appId
}) {
  const oauthClient = createOAuthClient({
    publicUrl,
    privateKeyJwk,
    sessionStore: createSupabaseSessionStore(supabase, appId),
    stateStore: createSupabaseStateStore(supabase, appId)
  });
  const sessionConfig = {
    cookieSecret,
    cookieName,
    secure
  };
  return { oauthClient, sessionConfig };
}

export {
  resolvePublicUrl,
  isLoopback,
  NodeOAuthClient,
  DEFAULT_OAUTH_SCOPE,
  createOAuthClient,
  getSession,
  saveSession,
  clearSession,
  restoreSession,
  getAuthenticatedAgent,
  createAuthorizeHandler,
  createCallbackHandler,
  createLogoutHandler,
  createClientMetadataHandler,
  createJwksHandler,
  createEpdsLoginHandler,
  createEpdsCallbackHandler,
  fetchProfile,
  createAuthActions,
  createAuthSetup,
  createOAuthSetup
};
//# sourceMappingURL=chunk-VPGL3YNQ.js.map