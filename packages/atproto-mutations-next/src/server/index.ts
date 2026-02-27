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

/**
 * Build an AtprotoAgent Layer from the current user's OAuth session stored in
 * Next.js iron-session cookies.
 *
 * Fails with UnauthorizedError when no session exists, or SessionExpiredError
 * when the stored DID can no longer be restored from the OAuth client.
 */
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

/**
 * Build an AtprotoAgent Layer from a pre-constructed Agent instance.
 *
 * Use this for service-account / server-initiated mutations where you already
 * hold a fully authenticated Agent (e.g. a CredentialSession agent created
 * at startup, or an agent injected via DI in tests).
 *
 * @example
 * const agent = new Agent(credentialSession);
 * const layer = makeServiceAgentLayer(agent);
 * Effect.runPromise(myMutation().pipe(Effect.provide(layer)));
 */
export function makeServiceAgentLayer(agent: Agent): Layer.Layer<AtprotoAgent> {
  return Layer.succeed(AtprotoAgent, agent);
}
