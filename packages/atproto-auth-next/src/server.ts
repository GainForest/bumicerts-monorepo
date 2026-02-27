// @gainforest/atproto-auth-next/server
// Server-only — reads cookies via next/headers, exposes route handler factories.
// Never import this in client components.

export { getSession, saveSession, clearSession } from "./session/cookie";
export type { SessionData, EmptySession, AnySession } from "./session/types";
export type { SessionConfig } from "./session/config";

export {
  createClientMetadataHandler,
  createJwksHandler,
} from "./handlers/metadata";
export type { ClientMetadataOptions } from "./handlers/metadata";

export {
  createAuthorizeHandler,
  createCallbackHandler,
  createLogoutHandler,
} from "./handlers/routes";
export type { CallbackHandlerOptions, LogoutHandlerOptions } from "./handlers/routes";

export { createOAuthSetup } from "./setup";
export type { OAuthSetupConfig, OAuthSetup } from "./setup";
