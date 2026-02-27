// @gainforest/atproto-auth-next
// Root export — types and the OAuth client factory. Safe to import from anywhere.
//
// Context-specific imports:
//   @gainforest/atproto-auth-next/server   — session reads, route handler factories (server-only)
//   @gainforest/atproto-auth-next/stores   — Supabase session + state store factories
//   @gainforest/atproto-auth-next/client   — session data types for client components

export type { SessionData, EmptySession, AnySession } from "./session/types";
export type { OAuthClientConfig } from "./oauth-client";
export { createOAuthClient, NodeOAuthClient } from "./oauth-client";
