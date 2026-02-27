import { Data, Effect, Layer } from "effect";
import { Agent } from "@atproto/api";
import { AtprotoAgent } from "@gainforest/atproto-mutations-core";
import { getSession } from "@gainforest/atproto-auth-next/server";
import type { NodeOAuthClient } from "@gainforest/atproto-auth-next";
import type { SessionConfig } from "@gainforest/atproto-auth-next/server";

export type UserAgentConfig = {
  oauthClient: NodeOAuthClient;
  sessionConfig: SessionConfig;
};

export class UnauthorizedError extends Data.TaggedError("UnauthorizedError")<{
  message?: string;
}> {}

export class SessionExpiredError extends Data.TaggedError("SessionExpiredError")<{
  message?: string;
}> {}

export function makeUserAgentLayer(
  config: UserAgentConfig
): Layer.Layer<AtprotoAgent, UnauthorizedError | SessionExpiredError> {
  return Layer.effect(
    AtprotoAgent,
    Effect.gen(function* () {
      const session = yield* Effect.promise(() => getSession(config.sessionConfig));

      if (!session.isLoggedIn) {
        return yield* Effect.fail(
          new UnauthorizedError({ message: "No active session — user is not logged in" })
        );
      }

      const oauthSession = yield* Effect.tryPromise({
        try: () => config.oauthClient.restore(session.did),
        catch: (cause) =>
          new SessionExpiredError({
            message: `Failed to restore OAuth session for ${session.did}: ${String(cause)}`,
          }),
      });

      if (!oauthSession) {
        return yield* Effect.fail(
          new SessionExpiredError({ message: "OAuth session not found — please log in again" })
        );
      }

      return new Agent(oauthSession);
    })
  );
}
