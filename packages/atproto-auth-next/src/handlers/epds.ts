/**
 * ePDS OAuth route handlers.
 *
 * Two handlers are provided:
 *
 * 1. createEpdsLoginHandler — initiates the ePDS OAuth flow
 *    Mount at: /api/oauth/epds/login
 *    Called with: GET /api/oauth/epds/login?email=user@example.com
 *
 * 2. createEpdsCallbackHandler — handles the ePDS callback
 *    Mount at: /api/oauth/epds/callback
 *    Called by the ePDS server with: GET /api/oauth/epds/callback?code=...&state=...
 */

import { NextRequest, NextResponse } from "next/server";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  generateDpopKeyPair,
  generateCodeVerifier,
  generateCodeChallenge,
  generateState,
  fetchWithDpopRetry,
  restoreDpopKeyPair,
  createClientAssertion,
} from "../epds/helpers";
import {
  getEpdsEndpoints,
  getEpdsClientId,
  getEpdsRedirectUri,
} from "../epds/config";
import { isLoopback } from "../utils/url";
import { createEpdsStateStore } from "../epds/state-store";
import type { NodeSavedSessionStore } from "@atproto/oauth-client-node";
import { saveSession } from "../session/cookie";
import type { SessionConfig } from "../session/config";
import { debug } from "../utils/debug";

export type EpdsHandlerConfig = {
  /** ePDS base URL (e.g. https://climateai.org). */
  epdsUrl: string;
  /** Resolved public URL of this app. */
  publicUrl: string;
  /** The loopback dev client_id (used when publicUrl is loopback). */
  devClientId: string;
  /** OAuth scope. */
  scope: string;
  /**
   * The app's private key JWK (single key object, not a keyset wrapper).
   * Used to sign client_assertion JWTs for private_key_jwt authentication
   * on the PAR and token endpoints (production only; loopback uses "none").
   */
  privateKeyJwk: Record<string, unknown>;
  /** Supabase client for ephemeral state storage. */
  supabase: SupabaseClient;
  /** App ID used to namespace the ePDS state store (e.g. "myapp-epds"). */
  epdsStateAppId: string;
  /** The shared session store (same as the main OAuth flow). */
  sessionStore: NodeSavedSessionStore;
  /** iron-session config for saving the app cookie. */
  sessionConfig: SessionConfig;
  /** Path to redirect to after successful login. Defaults to "/". */
  successRedirectTo?: string;
  /** Path to redirect to on error. Defaults to "/?error=auth_failed". */
  errorRedirectTo?: string;
};

/**
 * Creates a GET handler that initiates the ePDS email-based OAuth flow.
 *
 * Steps:
 * 1. Read optional ?email query param for login_hint
 * 2. Generate PKCE + DPoP key pair
 * 3. Send PAR (Pushed Authorization Request) to ePDS
 * 4. Store PKCE verifier + DPoP private JWK in ephemeral state store
 * 5. Redirect user to ePDS authorization page with login_hint
 */
export function createEpdsLoginHandler(config: EpdsHandlerConfig) {
  const epdsStateStore = createEpdsStateStore(
    config.supabase,
    config.epdsStateAppId,
  );

  return async function GET(req: NextRequest): Promise<NextResponse> {
    try {
      const email = req.nextUrl.searchParams.get("email");

      const { privateKey, publicJwk, privateJwk } = generateDpopKeyPair();
      const codeVerifier = generateCodeVerifier();
      const codeChallenge = generateCodeChallenge(codeVerifier);
      const state = generateState();

      const { parEndpoint, authEndpoint, issuer } = getEpdsEndpoints({
        url: config.epdsUrl,
      });
      const clientId = getEpdsClientId(
        config.publicUrl,
        config.devClientId,
        config.scope,
      );
      const redirectUri = getEpdsRedirectUri(config.publicUrl);

      debug.log("[epds/login] Starting ePDS flow", {
        email: !!email,
        clientId,
        redirectUri,
        parEndpoint,
      });

      // Build PAR body — login_hint does NOT go in PAR, only in the auth URL.
      // Production clients use private_key_jwt auth: add client_assertion.
      const parBody = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: config.scope,
        state,
        code_challenge: codeChallenge,
        code_challenge_method: "S256",
      });

      if (!isLoopback(config.publicUrl)) {
        parBody.set("client_assertion_type", "urn:ietf:params:oauth:client-assertion-type:jwt-bearer");
        parBody.set("client_assertion", createClientAssertion(config.privateKeyJwk, clientId, issuer));
      }

      const parResponse = await fetchWithDpopRetry(
        parEndpoint,
        parBody,
        privateKey,
        publicJwk,
      );

      if (!parResponse.ok) {
        const errorBody = await parResponse.text().catch(() => "(unreadable)");
        debug.error("[epds/login] PAR failed", {
          status: parResponse.status,
          body: errorBody,
        });
        return NextResponse.redirect(
          new URL(
            config.errorRedirectTo ?? "/?error=auth_failed",
            config.publicUrl,
          ),
        );
      }

      const { request_uri } = (await parResponse.json()) as {
        request_uri: string;
      };

      // Store ephemeral state (delete-on-read in callback)
      await epdsStateStore.set(state, { codeVerifier, dpopPrivateJwk: privateJwk });

      // Build auth URL — login_hint goes HERE (not in PAR)
      const authUrl = new URL(authEndpoint);
      authUrl.searchParams.set("client_id", clientId);
      authUrl.searchParams.set("request_uri", request_uri);
      if (email) {
        authUrl.searchParams.set("login_hint", email);
      }

      debug.log("[epds/login] Redirecting to ePDS auth", {
        authUrl: authUrl.toString(),
      });

      return NextResponse.redirect(authUrl.toString());
    } catch (error) {
      debug.error("[epds/login] Unexpected error", error);
      return NextResponse.redirect(
        new URL(
          config.errorRedirectTo ?? "/?error=auth_failed",
          config.publicUrl,
        ),
      );
    }
  };
}

/**
 * Creates a GET handler that processes the ePDS OAuth callback.
 *
 * Steps:
 * 1. Read code + state from query params
 * 2. Retrieve ephemeral state from store (delete-on-read)
 * 3. Exchange code for DPoP-bound tokens
 * 4. Construct NodeSavedSession and write to the shared session store
 * 5. Resolve handle from DID via describeRepo
 * 6. Save app session cookie
 * 7. Redirect to success path
 */
export function createEpdsCallbackHandler(config: EpdsHandlerConfig) {
  const epdsStateStore = createEpdsStateStore(
    config.supabase,
    config.epdsStateAppId,
  );

  return async function GET(request: NextRequest): Promise<void> {
    let success = false;

    try {
      const code = request.nextUrl.searchParams.get("code");
      const state = request.nextUrl.searchParams.get("state");

      if (!code || !state) {
        debug.error("[epds/callback] Missing code or state params");
        redirect(config.errorRedirectTo ?? "/?error=auth_failed");
      }

      // Retrieve + consume ephemeral state (atomic delete-on-read)
      const oauthState = await epdsStateStore.get(state!);
      if (!oauthState) {
        debug.error("[epds/callback] No OAuth state found", { state });
        redirect(config.errorRedirectTo ?? "/?error=auth_failed");
      }

      const { codeVerifier, dpopPrivateJwk } = oauthState!;
      // Cast: EpdsOAuthState.dpopPrivateJwk is JsonWebKey (from node:crypto),
      // which is structurally identical but branded differently. Safe to cast.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { privateKey, publicJwk } = restoreDpopKeyPair(dpopPrivateJwk as any);

      const { tokenEndpoint, issuer: epdsIssuer } = getEpdsEndpoints({ url: config.epdsUrl });
      const clientId = getEpdsClientId(
        config.publicUrl,
        config.devClientId,
        config.scope,
      );
      const redirectUri = getEpdsRedirectUri(config.publicUrl);

      // Exchange authorization code for tokens.
      // Production clients use private_key_jwt auth: add client_assertion.
      const tokenBody = new URLSearchParams({
        grant_type: "authorization_code",
        code: code!,
        redirect_uri: redirectUri,
        client_id: clientId,
        code_verifier: codeVerifier,
      });

      if (!isLoopback(config.publicUrl)) {
        tokenBody.set("client_assertion_type", "urn:ietf:params:oauth:client-assertion-type:jwt-bearer");
        tokenBody.set("client_assertion", createClientAssertion(config.privateKeyJwk, clientId, epdsIssuer));
      }

      const tokenResponse = await fetchWithDpopRetry(
        tokenEndpoint,
        tokenBody,
        privateKey,
        publicJwk,
      );

      if (!tokenResponse.ok) {
        const errorBody = await tokenResponse
          .text()
          .catch(() => tokenResponse.statusText);
        debug.error("[epds/callback] Token exchange failed", {
          status: tokenResponse.status,
          body: errorBody,
        });
        redirect(config.errorRedirectTo ?? "/?error=auth_failed");
      }

      const tokenData = (await tokenResponse.json()) as {
        access_token: string;
        token_type: string;
        scope?: string;
        expires_in?: number;
        sub: string;
        refresh_token?: string;
      };

      // Validate token_type is DPoP
      if (tokenData.token_type?.toLowerCase() !== "dpop") {
        debug.error("[epds/callback] Expected DPoP token, got", tokenData.token_type);
        redirect(config.errorRedirectTo ?? "/?error=auth_failed");
      }

      // Validate sub is a DID
      if (
        !tokenData.sub ||
        !(
          tokenData.sub.startsWith("did:plc:") ||
          tokenData.sub.startsWith("did:web:")
        )
      ) {
        debug.error("[epds/callback] Invalid sub in token response", tokenData.sub);
        redirect(config.errorRedirectTo ?? "/?error=auth_failed");
      }

      // Construct NodeSavedSession compatible with the OAuth client's session store.
      //
      // NodeSavedSession = Omit<Session, 'dpopKey'> & { dpopJwk: Jwk }
      //   where Session = { dpopKey: Key; authMethod: ClientAuthMethod; tokenSet: TokenSet }
      //
      // We cast the whole object via `unknown as any` because:
      // - dpopJwk: node:crypto JsonWebKey vs @atproto/jwk Jwk (structurally identical)
      // - sub: string vs branded AtprotoDid
      // - scope: string vs branded OAuthScope
      // - authMethod: we set it to match the configured token_endpoint_auth_method
      const issuer = new URL(tokenEndpoint).origin;
      const isLoopbackClient = isLoopback(config.publicUrl);
      const authMethod = isLoopbackClient
        ? { method: "none" as const }
        : { method: "private_key_jwt" as const, kid: "default" };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const nodeSavedSession: any = {
        dpopJwk: dpopPrivateJwk,
        authMethod,
        tokenSet: {
          iss: issuer,
          sub: tokenData.sub,
          aud: issuer,
          scope: tokenData.scope ?? config.scope,
          access_token: tokenData.access_token,
          token_type: "DPoP" as const,
          refresh_token: tokenData.refresh_token,
          expires_at: tokenData.expires_in
            ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
            : undefined,
        },
      };

      // Write to the shared session store (same as the standard OAuth flow)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await config.sessionStore.set(tokenData.sub, nodeSavedSession as unknown as any);

      debug.log("[epds/callback] Session saved", { sub: tokenData.sub });

      // Resolve handle from DID via describeRepo (public, unauthenticated)
      let resolvedHandle = tokenData.sub;
      try {
        const describeRes = await fetch(
          `${config.epdsUrl}/xrpc/com.atproto.repo.describeRepo?repo=${encodeURIComponent(tokenData.sub)}`,
          { signal: AbortSignal.timeout(10_000) },
        );
        if (describeRes.ok) {
          const repo = (await describeRes.json()) as { handle: string };
          resolvedHandle = repo.handle;
          debug.log("[epds/callback] Handle resolved", { handle: resolvedHandle });
        }
      } catch (handleError) {
        debug.warn("[epds/callback] Handle resolution failed, falling back to DID", handleError);
        // resolvedHandle stays as tokenData.sub (the DID)
      }

      // Save app session cookie
      await saveSession(
        { did: tokenData.sub, handle: resolvedHandle, isLoggedIn: true },
        config.sessionConfig,
      );

      success = true;
    } catch (error) {
      // Don't catch Next.js redirect() — it throws a control-flow exception
      if (
        error instanceof Error &&
        error.message === "NEXT_REDIRECT"
      ) {
        throw error;
      }
      debug.error("[epds/callback] Unexpected error", error);
    }

    // All redirects outside try/catch — Next.js redirect() throws internally
    if (success) {
      redirect(config.successRedirectTo ?? "/");
    } else {
      redirect(config.errorRedirectTo ?? "/?error=auth_failed");
    }
  };
}
