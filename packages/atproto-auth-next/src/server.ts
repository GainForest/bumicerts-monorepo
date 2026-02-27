// @gainforest/atproto-auth-next/server
// Server-only — reads cookies via next/headers, builds agents.
// Never import this in client components.

export { getSession, saveSession, clearSession } from "./session/cookie";
export { getReadAgent, getWriteAgent, Agent } from "./agent";
export type { SessionData, EmptySession, AnySession } from "./session/types";
export type { AgentError } from "./agent";
export type { SessionConfig } from "./session/config";
