import { NextRequest, NextResponse } from "next/server";
import {
  generateDpopKeyPair,
  generateCodeVerifier,
  generateCodeChallenge,
  generateState,
  fetchWithDpopRetry,
} from "@/lib/epds/helpers";
import {
  getEpdsEndpoints,
  getEpdsClientId,
  getEpdsRedirectUri,
} from "@/lib/epds/config";
import { epdsStateStore, resolvePublicUrl, OAUTH_SCOPE } from "@/lib/atproto";

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    // 1. Read optional email for login_hint (Flow 1)
    const email = req.nextUrl.searchParams.get("email");

    // 2. Generate PKCE + DPoP values
    const { privateKey, publicJwk, privateJwk } = generateDpopKeyPair();
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);
    const state = generateState();

    // 3. Get ePDS endpoints and client info
    const { parEndpoint, authEndpoint } = getEpdsEndpoints();
    const clientId = getEpdsClientId();
    const redirectUri = getEpdsRedirectUri();

    // 4. Build PAR body — login_hint does NOT go here
    const parBody = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: OAUTH_SCOPE,
      state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    });

    // 5. Send PAR request with DPoP retry
    const parResponse = await fetchWithDpopRetry(
      parEndpoint,
      parBody,
      privateKey,
      publicJwk
    );

    // 6. Handle PAR failure
    if (!parResponse.ok) {
      const errorBody = await parResponse.text().catch(() => "(unreadable)");
      console.error(
        "[oauth/epds/login] PAR failed",
        parResponse.status,
        errorBody
      );
      return NextResponse.redirect(
        new URL("/?error=auth_failed", resolvePublicUrl())
      );
    }

    // 7. Parse request_uri from PAR response
    const { request_uri } = (await parResponse.json()) as {
      request_uri: string;
    };

    // 8. Store ephemeral state in Supabase (delete-on-read store)
    await epdsStateStore.set(state, {
      codeVerifier,
      dpopPrivateJwk: privateJwk,
    });

    // 9. Build auth URL — login_hint goes HERE (on the redirect URL, not in PAR)
    const authUrl = new URL(authEndpoint);
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("request_uri", request_uri);
    if (email) {
      authUrl.searchParams.set("login_hint", email);
    }

    // 10. Redirect user to ePDS authorization page
    return NextResponse.redirect(authUrl.toString());
  } catch (error) {
    console.error("[oauth/epds/login] Unexpected error:", error);
    return NextResponse.redirect(
      new URL("/?error=auth_failed", resolvePublicUrl())
    );
  }
}
