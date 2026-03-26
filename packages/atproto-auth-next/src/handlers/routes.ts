import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Agent } from "@atproto/api";
import type { NodeOAuthClient } from "@atproto/oauth-client-node";
import { getSession, saveSession, clearSession } from "../session/cookie";
import type { SessionConfig } from "../session/config";
import { DEFAULT_OAUTH_SCOPE } from "../oauth-client";
import { debug } from "../utils/debug";

export type AuthorizeHandlerOptions = {
  /**
   * Default PDS domain to append when the handle has no dot.
   * e.g. "climateai.org" → "alice" becomes "alice.climateai.org"
   */
  defaultPdsDomain?: string;
  /** OAuth scope. Defaults to "atproto transition:generic". */
  scope?: string;
};

/**
 * Creates a POST handler that initiates the standard ATProto OAuth flow.
 *
 * Expects JSON body: { handle: string }
 * Returns JSON: { url: string }
 *
 * Mount at: /api/oauth/authorize
 */
export function createAuthorizeHandler(
  client: NodeOAuthClient,
  options: AuthorizeHandlerOptions = {},
) {
  return async function POST(req: NextRequest) {
    const { handle } = (await req.json()) as { handle: string };

    // Normalize handle — add default domain if no dot present
    const normalizedHandle =
      handle.includes(".") || !options.defaultPdsDomain
        ? handle
        : `${handle}.${options.defaultPdsDomain}`;

    debug.log("[authorize] Starting OAuth flow", {
      handle: normalizedHandle,
    });

    const authUrl = await client.authorize(normalizedHandle, {
      scope: options.scope ?? DEFAULT_OAUTH_SCOPE,
    });

    return NextResponse.json({ url: authUrl.toString() });
  };
}

export type CallbackHandlerOptions = {
  /** Path to redirect to after successful login. Defaults to "/". */
  redirectTo?: string;
};

/**
 * Creates a GET handler that processes the standard ATProto OAuth callback.
 *
 * Exchanges the auth code for tokens, resolves the handle, saves the
 * session cookie, and redirects to the success path.
 *
 * Mount at: /api/oauth/callback
 */
export function createCallbackHandler(
  client: NodeOAuthClient,
  sessionConfig: SessionConfig,
  options: CallbackHandlerOptions = {},
) {
  return async function GET(req: NextRequest) {
    let success = false;

    try {
      const params = req.nextUrl.searchParams;
      const result = await client.callback(params);

      const agent = new Agent(result.session);
      const { data } = await agent.com.atproto.repo.describeRepo({
        repo: result.session.did,
      });

      await saveSession(
        { did: result.session.did, handle: data.handle, isLoggedIn: true },
        sessionConfig,
      );

      debug.log("[callback] Session saved", {
        did: result.session.did,
        handle: data.handle,
      });

      success = true;
    } catch (error) {
      // Don't catch Next.js redirect() — it throws a control-flow exception
      if (
        error instanceof Error &&
        error.message === "NEXT_REDIRECT"
      ) {
        throw error;
      }
      debug.error("[callback] OAuth callback failed", error);
    }

    // Redirects outside try/catch — Next.js redirect() throws internally
    if (success) {
      // Check for auth_redirect cookie (set by LoginModal to return user to their previous page)
      const cookieStore = await cookies();
      const authRedirect = cookieStore.get("auth_redirect")?.value;
      if (authRedirect) {
        cookieStore.delete("auth_redirect");
      }
      const redirectTo = authRedirect ? decodeURIComponent(authRedirect) : (options.redirectTo ?? "/");
      redirect(redirectTo);
    } else {
      redirect("/?error=auth_failed");
    }
  };
}

export type LogoutHandlerOptions = {
  /** Path to redirect to after logout. If not set, returns JSON { ok: true }. */
  redirectTo?: string;
};

/**
 * Creates a POST handler that logs out the current user.
 *
 * Revokes the OAuth session (best-effort) and clears the session cookie.
 *
 * Mount at: /api/oauth/logout
 */
export function createLogoutHandler(
  client: NodeOAuthClient,
  sessionConfig: SessionConfig,
  options: LogoutHandlerOptions = {},
) {
  return async function POST() {
    const session = await getSession(sessionConfig);

    if (session.isLoggedIn) {
      try {
        await client.revoke(session.did);
        debug.log("[logout] Session revoked", { did: session.did });
      } catch (error) {
        // Revocation is best-effort — continue with cookie clear
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
