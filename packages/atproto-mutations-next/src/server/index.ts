import { Data, Effect, Layer } from "effect";
import { Agent } from "@atproto/api";
import { AtprotoAgent } from "@gainforest/atproto-mutations-core";
import { getSession } from "@gainforest/atproto-auth-next/server";
import type { NodeOAuthClient } from "@gainforest/atproto-auth-next";
import type { SessionConfig } from "@gainforest/atproto-auth-next/server";
import type { AuthSetup } from "@gainforest/atproto-auth-next";
import type { AtprotoDid } from "@atproto/did";

// ─── Error types ──────────────────────────────────────────────────────────────

export class UnauthorizedError extends Data.TaggedError("UnauthorizedError")<{
  message?: string;
}> {}

export class SessionExpiredError extends Data.TaggedError("SessionExpiredError")<{
  message?: string;
}> {}

// ─── makeUserAgentLayer ───────────────────────────────────────────────────────

/**
 * Low-level config accepted by makeUserAgentLayer.
 * Use this when you are constructing the OAuth client manually.
 */
export type UserAgentConfig = {
  oauthClient: NodeOAuthClient;
  sessionConfig: SessionConfig;
};

/**
 * Build an AtprotoAgent Layer from the current user's OAuth session stored in
 * Next.js iron-session cookies.
 *
 * Accepts either:
 *   - An `AuthSetup` object from `createAuthSetup()` — the recommended pattern
 *   - A `{ oauthClient, sessionConfig }` object — for manual / advanced setups
 *
 * Fails with:
 *   - `UnauthorizedError` — no session cookie / user is not logged in
 *   - `SessionExpiredError` — session exists but OAuth tokens could not be restored
 *
 * @example
 * // Recommended — pass auth directly from createAuthSetup()
 * import { auth } from "@/lib/auth";
 * import { makeUserAgentLayer } from "@gainforest/atproto-mutations-next/server";
 *
 * export function getUserAgentLayer() {
 *   return makeUserAgentLayer(auth);
 * }
 *
 * @example
 * // Advanced — pass individual primitives
 * makeUserAgentLayer({ oauthClient: auth.oauthClient, sessionConfig: auth.sessionConfig })
 */
export function makeUserAgentLayer(
  config: AuthSetup | UserAgentConfig
): Layer.Layer<AtprotoAgent, UnauthorizedError | SessionExpiredError> {
  // Both AuthSetup and UserAgentConfig expose oauthClient and sessionConfig directly.
  const { oauthClient, sessionConfig } = config;

  return Layer.effect(
    AtprotoAgent,
    Effect.gen(function* () {
      const session = yield* Effect.promise(() => getSession(sessionConfig));

      if (!session.isLoggedIn) {
        return yield* Effect.fail(
          new UnauthorizedError({ message: "No active session — user is not logged in" })
        );
      }

      // session.did is a plain string; oauthClient.restore() expects AtprotoDid
      // (a branded string). The value is always a valid DID at runtime.
      const oauthSession = yield* Effect.tryPromise({
        try: () => oauthClient.restore(session.did as AtprotoDid),
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

// ─── makeServiceAgentLayer ────────────────────────────────────────────────────

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
