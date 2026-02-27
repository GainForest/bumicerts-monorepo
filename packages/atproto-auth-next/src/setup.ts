import type { SupabaseClient } from "@supabase/supabase-js"; // type-only — no runtime dep on @supabase/supabase-js
import { createOAuthClient } from "./oauth-client";
import { createSupabaseSessionStore } from "./stores/session-store";
import { createSupabaseStateStore } from "./stores/state-store";
import type { SessionConfig } from "./session/config";
import type { NodeOAuthClient } from "@atproto/oauth-client-node";

export type OAuthSetupConfig = {
  publicUrl: string;
  privateKeyJwk: string;
  cookieSecret: string;
  cookieName?: string;
  secure?: boolean;
  supabase: SupabaseClient;
  appId: string;
};

export type OAuthSetup = {
  oauthClient: NodeOAuthClient;
  sessionConfig: SessionConfig;
};

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
