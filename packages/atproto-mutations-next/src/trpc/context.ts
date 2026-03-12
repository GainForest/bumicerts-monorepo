import type { Layer } from "effect";
import type { AtprotoAgent } from "@gainforest/atproto-mutations-core";
import type { AuthSetup } from "@gainforest/atproto-auth-next";
import { makeUserAgentLayer, UnauthorizedError, SessionExpiredError } from "../server";

export interface TRPCContext {
  agentLayer: Layer.Layer<AtprotoAgent, UnauthorizedError | SessionExpiredError>;
}

/**
 * Creates a context factory for tRPC.
 * Pass your auth setup from createAuthSetup().
 */
export function createContextFactory(auth: AuthSetup) {
  return async (): Promise<TRPCContext> => {
    return {
      agentLayer: makeUserAgentLayer(auth),
    };
  };
}
