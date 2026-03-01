import { NextRequest } from "next/server";
import { redirect } from "next/navigation";
import { restoreDpopKeyPair, fetchWithDpopRetry } from "@/lib/epds/helpers";
import {
  getEpdsEndpoints,
  getEpdsClientId,
  getEpdsRedirectUri,
} from "@/lib/epds/config";
import { epdsStateStore, sessionStore } from "@/lib/atproto";
import { saveAppSession } from "gainforest-sdk/oauth";
// NodeSavedSession type — imported from the transitive dep.
// We use `unknown` casts when passing to sessionStore.set() because gainforest-sdk
// bundles its own version of @atproto/oauth-client-node (via @hypercerts-org/sdk-core)
// which may differ from the one directly installed. The runtime shape is identical.
import type { NodeSavedSession } from "@atproto/oauth-client-node";

/**
 * ePDS OAuth 2.0 Callback endpoint.
 *
 * This route handles the OAuth callback from the ePDS authorization server.
 * It exchanges the authorization code for tokens using DPoP, constructs a
 * NodeSavedSession, writes it to the shared Supabase session store, and
 * creates the app session cookie.
 *
 * Flow:
 * 1. ePDS auth server redirects here with ?code=...&state=...
 * 2. Ephemeral state (codeVerifier + dpopPrivateJwk) retrieved from Supabase (delete-on-read)
 * 3. DPoP key pair restored from stored private JWK
 * 4. Code exchanged for tokens via fetchWithDpopRetry
 * 5. NodeSavedSession constructed and written to shared session store
 * 6. Handle resolved from DID via describeRepo
 * 7. App session (DID, handle) saved to encrypted cookie
 * 8. User redirected to home page
 */
export async function GET(request: NextRequest) {
  let success = false;

  try {
    // 1. Read code and state from query params
    const code = request.nextUrl.searchParams.get("code");
    const state = request.nextUrl.searchParams.get("state");

    if (!code || !state) {
      console.error(
        "[epds/callback] Missing required query parameters: code and/or state"
      );
      return;
    }

    // 2. Retrieve ephemeral state from Supabase (delete-on-read)
    const oauthState = await epdsStateStore.get(state);
    if (!oauthState) {
      console.error(
        "[epds/callback] No OAuth state found in Supabase for state:",
        state
      );
      return;
    }

    // 3. Destructure code verifier and DPoP private JWK
    const { codeVerifier, dpopPrivateJwk } = oauthState;

    // 4. Restore DPoP key pair from stored private JWK (do NOT generate a new one)
    const { privateKey, publicJwk } = restoreDpopKeyPair(
      dpopPrivateJwk as import("node:crypto").JsonWebKey
    );

    // 5. Get ePDS endpoints and client info
    const { tokenEndpoint } = getEpdsEndpoints();
    const clientId = getEpdsClientId();
    const redirectUri = getEpdsRedirectUri();

    // 6. Build token exchange body
    const tokenBody = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      code_verifier: codeVerifier,
    });

    // 7. Exchange code for tokens with DPoP retry
    const tokenResponse = await fetchWithDpopRetry(
      tokenEndpoint,
      tokenBody,
      privateKey,
      publicJwk
    );

    if (!tokenResponse.ok) {
      const errorBody = await tokenResponse
        .text()
        .catch(() => tokenResponse.statusText);
      console.error(
        "[epds/callback] Token exchange failed:",
        tokenResponse.status,
        errorBody
      );
      return;
    }

    // 8. Parse token response
    const tokenData = (await tokenResponse.json()) as {
      access_token: string;
      token_type: string;
      scope?: string;
      expires_in?: number;
      sub: string;
      refresh_token?: string;
    };

    // 9a. Validate token_type is DPoP (case-insensitive)
    if (tokenData.token_type?.toLowerCase() !== "dpop") {
      console.error(
        "[epds/callback] Expected DPoP token, got:",
        tokenData.token_type
      );
      return;
    }

    // 9b. Validate sub is a DID
    if (
      !tokenData.sub ||
      !(
        tokenData.sub.startsWith("did:plc:") ||
        tokenData.sub.startsWith("did:web:")
      )
    ) {
      console.error(
        "[epds/callback] Invalid sub in token response (must be a DID):",
        tokenData.sub
      );
      return;
    }

    // 10. Construct NodeSavedSession compatible with the gainforest-sdk's session store
    // The issuer is the PDS origin (token endpoint without the /oauth/token path)
    const issuer = new URL(tokenEndpoint).origin;

    // NodeSavedSession = Omit<Session, 'dpopKey'> & { dpopJwk: Jwk }
    // dpopJwk must be the private JWK (includes 'd' parameter) — SDK uses this for DPoP proofs
    // sub must be AtprotoDid (`did:plc:${string}` | `did:web:${string}`) — cast from token response
    // token_type must be 'DPoP' (capital D, capital P)
    // We cast via unknown to bridge node:crypto JsonWebKey → @atproto/jwk Jwk branded types
    const nodeSavedSession: NodeSavedSession = {
      dpopJwk: dpopPrivateJwk as unknown as NodeSavedSession["dpopJwk"],
      tokenSet: {
        iss: issuer,
        sub: tokenData.sub as unknown as NodeSavedSession["tokenSet"]["sub"],
        aud: issuer,
        scope: (tokenData.scope ??
          "atproto transition:generic") as NodeSavedSession["tokenSet"]["scope"],
        access_token: tokenData.access_token,
        token_type: "DPoP" as const,
        refresh_token: tokenData.refresh_token,
        expires_at: tokenData.expires_in
          ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
          : undefined,
      },
    };

    // 11. Write session to Supabase (shared with normal flow, app_id='bumicerts')
    // Cast via unknown to bridge the version mismatch between the directly-installed
    // @atproto/oauth-client-node and the one bundled inside @hypercerts-org/sdk-core.
    // The runtime shape is identical — only the branded type differs.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await sessionStore.set(tokenData.sub, nodeSavedSession as unknown as any);

    // 12. Resolve handle from DID via describeRepo
    // Resolve handle from DID via describeRepo (public, unauthenticated endpoint).
    // We can't use atprotoSDK.restoreSession() here because the manually-constructed
    // NodeSavedSession doesn't have the internal dpopFetch method the SDK expects.
    let resolvedHandle = tokenData.sub;
    const epdsUrl = process.env.NEXT_PUBLIC_EPDS_URL;
    if (!epdsUrl) {
      console.warn("[epds/callback] NEXT_PUBLIC_EPDS_URL not set, skipping handle resolution");
      // skip handle resolution, resolvedHandle stays as DID
    }
    try {
      if (epdsUrl) {
        const describeRes = await fetch(
          `${epdsUrl}/xrpc/com.atproto.repo.describeRepo?repo=${encodeURIComponent(tokenData.sub)}`,
          { signal: AbortSignal.timeout(10_000) }
        );
        if (describeRes.ok) {
          const repo = await describeRes.json() as { handle: string };
          resolvedHandle = repo.handle;
        }
      }
    } catch (handleError) {
      console.warn(
        "[epds/callback] Handle resolution failed, falling back to DID:",
        handleError
      );
      // resolvedHandle remains as tokenData.sub (the DID)
    }

    // 13. Save app session cookie
    await saveAppSession({
      did: tokenData.sub,
      handle: resolvedHandle,
      isLoggedIn: true,
    });

    success = true;
  } catch (error) {
    console.error("[epds/callback] Unexpected error:", error);
  }

  // All redirects are outside try/catch — Next.js redirect() throws a
  // control-flow exception that must not be caught by the error handler.
  if (success) {
    redirect("/");
  } else {
    redirect("/?error=auth_failed");
  }
}
