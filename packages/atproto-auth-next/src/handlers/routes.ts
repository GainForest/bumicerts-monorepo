import { NextRequest, NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { Agent } from "@atproto/api";
import type { NodeOAuthClient } from "@atproto/oauth-client-node";
import { getSession, saveSession, clearSession } from "../session/cookie";
import type { SessionConfig } from "../session/config";

export function createAuthorizeHandler(client: NodeOAuthClient) {
  return async function POST(req: NextRequest) {
    const { handle } = (await req.json()) as { handle: string };
    const authUrl = await client.authorize(handle, { scope: "atproto" });
    return NextResponse.json({ url: authUrl.toString() });
  };
}

export type CallbackHandlerOptions = {
  redirectTo: string;
};

export function createCallbackHandler(
  client: NodeOAuthClient,
  sessionConfig: SessionConfig,
  options: CallbackHandlerOptions
) {
  return async function GET(req: NextRequest) {
    const params = req.nextUrl.searchParams;
    const result = await client.callback(params);

    const agent = new Agent(result.session);
    const { data } = await agent.com.atproto.repo.describeRepo({
      repo: result.session.did,
    });

    await saveSession(
      { did: result.session.did, handle: data.handle, isLoggedIn: true },
      sessionConfig
    );

    redirect(options.redirectTo);
  };
}

export type LogoutHandlerOptions = {
  redirectTo?: string;
};

export function createLogoutHandler(
  client: NodeOAuthClient,
  sessionConfig: SessionConfig,
  options: LogoutHandlerOptions = {}
) {
  return async function POST() {
    const session = await getSession(sessionConfig);

    if (session.isLoggedIn) {
      await client.revoke(session.did);
    }

    await clearSession(sessionConfig);

    if (options.redirectTo) {
      return NextResponse.redirect(options.redirectTo);
    }

    return NextResponse.json({ ok: true });
  };
}
