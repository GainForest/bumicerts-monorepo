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
 *
 * Both handlers delegate all OAuth complexity (PKCE, DPoP, PAR, token exchange,
 * session construction) to the @atproto/oauth-client-node SDK via:
 *   - client.authorize(epdsUrl)  — login
 *   - client.callback(params)    — callback
 *
 * The SDK stores state and sessions in the shared stateStore / sessionStore,
 * so no separate ePDS-specific stores are needed.
 */

import { NextRequest, NextResponse } from "next/server";
import { Agent } from "@atproto/api";
import type { NodeOAuthClient } from "@atproto/oauth-client-node";
import { saveSessionToResponse } from "../session/cookie";
import type { SessionConfig } from "../session/config";
import { debug } from "../utils/debug";

export type EpdsLoginHandlerConfig = {
  /** The shared NodeOAuthClient (same instance used for handle login). */
  oauthClient: NodeOAuthClient;
  /** ePDS base URL (e.g. https://climateai.org). Passed to client.authorize(). */
  epdsUrl: string;
  /** OAuth scope. */
  scope: string;
  /** Path to redirect to on error. Defaults to "/?error=auth_failed". */
  errorRedirectTo?: string;
};

export type EpdsCallbackHandlerConfig = {
  /** The shared NodeOAuthClient (same instance used for handle login). */
  oauthClient: NodeOAuthClient;
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
 * Delegates entirely to client.authorize(epdsUrl) — the SDK handles
 * well-known discovery, PKCE, DPoP key generation, and the PAR request.
 * State is stored in the shared stateStore (same as handle login).
 */
export function createEpdsLoginHandler(config: EpdsLoginHandlerConfig) {
  return async function GET(req: NextRequest): Promise<NextResponse> {
    try {
      const email = req.nextUrl.searchParams.get("email") ?? undefined;

      debug.log("[epds/login] Starting ePDS flow", { email: !!email, epdsUrl: config.epdsUrl });

      // client.authorize() accepts a PDS URL directly. The SDK fetches
      // /.well-known/oauth-authorization-server, generates PKCE + DPoP,
      // sends a PAR request, and returns the authorization URL.
      // This is identical to handle login — the SDK is agnostic to input type.
      const authUrl = await config.oauthClient.authorize(config.epdsUrl, {
        scope: config.scope,
      });

      // Append login_hint so the ePDS can pre-fill the email field.
      // This goes in the auth URL (not PAR) per the ePDS spec.
      const url = new URL(authUrl.toString());
      if (email) {
        url.searchParams.set("login_hint", email);
      }

      debug.log("[epds/login] Redirecting to ePDS auth", { url: url.toString() });

      return NextResponse.redirect(url.toString());
    } catch (error) {
      debug.error("[epds/login] Unexpected error", error);
      const base = new URL(req.url).origin;
      return NextResponse.redirect(
        new URL(config.errorRedirectTo ?? "/?error=auth_failed", base),
      );
    }
  };
}

/**
 * Creates a GET handler that processes the ePDS OAuth callback.
 *
 * Delegates entirely to client.callback(params) — the SDK matches the state
 * param to the stored context from client.authorize(), exchanges the code for
 * tokens (with DPoP proofs), and writes the NodeSavedSession to the shared
 * sessionStore. No manual token exchange or session construction needed.
 */
export function createEpdsCallbackHandler(config: EpdsCallbackHandlerConfig) {
  return async function GET(req: NextRequest): Promise<NextResponse> {
    const base = new URL(req.url).origin;
    const errorRedirect = () =>
      NextResponse.redirect(
        new URL(config.errorRedirectTo ?? "/?error=auth_failed", base),
      );

    try {
      debug.log("[epds/callback] Processing ePDS callback");

      // client.callback() matches the state param to the context stored by
      // client.authorize(), exchanges the authorization code for tokens using
      // the correct DPoP key and PKCE verifier, and writes a properly-formed
      // NodeSavedSession to the shared sessionStore. Works identically for
      // both handle login and ePDS login callbacks.
      const { session } = await config.oauthClient.callback(req.nextUrl.searchParams);

      debug.log("[epds/callback] OAuth callback succeeded", { did: session.did });

      // Resolve handle from DID (optional — falls back to DID if unavailable).
      // ePDS users may not have a bsky profile, so handle resolution can fail.
      let resolvedHandle: string = session.did;
      try {
        const agent = new Agent(session);
        const { data } = await agent.com.atproto.repo.describeRepo({
          repo: session.did,
        });
        resolvedHandle = data.handle;
        debug.log("[epds/callback] Handle resolved", { handle: resolvedHandle });
      } catch (handleError) {
        debug.warn("[epds/callback] Handle resolution failed, using DID as fallback", handleError);
      }

      // Check for auth_redirect cookie (set by LoginModal to return user to their previous page)
      const authRedirectCookie = req.cookies.get("auth_redirect")?.value;
      const redirectTarget = authRedirectCookie
        ? decodeURIComponent(authRedirectCookie)
        : (config.successRedirectTo ?? "/");

      // Build the success redirect response first, then attach the cookie.
      // We MUST NOT use next/navigation redirect() here — it throws a
      // control-flow exception before the Set-Cookie header can be written.
      const successUrl = new URL(redirectTarget, base);
      const response = NextResponse.redirect(successUrl);

      await saveSessionToResponse(
        { did: session.did, handle: resolvedHandle, isLoggedIn: true },
        config.sessionConfig,
        req,
        response,
      );

      // Clear the auth_redirect cookie
      if (authRedirectCookie) {
        response.cookies.delete("auth_redirect");
      }

      debug.log("[epds/callback] Session cookie saved, redirecting", { successUrl: successUrl.toString() });

      return response;
    } catch (error) {
      debug.error("[epds/callback] Unexpected error", error);
      return errorRedirect();
    }
  };
}
