import { Data, Effect, Layer } from "effect";
import { CredentialSession, Agent } from "@atproto/api";
import { AtprotoAgent } from "../services/AtprotoAgent";

export type CredentialConfig = {
  service: string;    // PDS hostname — e.g. "bsky.social" or "gainforest.id"
  identifier: string; // handle or DID
  password: string;
};

export class CredentialLoginError extends Data.TaggedError("CredentialLoginError")<{
  message: string;
  cause?: unknown;
}> {}

export function makeCredentialAgentLayer(
  config: CredentialConfig
): Layer.Layer<AtprotoAgent, CredentialLoginError> {
  return Layer.effect(
    AtprotoAgent,
    Effect.gen(function* () {
      const session = new CredentialSession(new URL(`https://${config.service}`));

      yield* Effect.tryPromise({
        try: () =>
          session.login({
            identifier: config.identifier,
            password: config.password,
          }),
        catch: (cause) =>
          new CredentialLoginError({
            message: "ATProto credential login failed",
            cause,
          }),
      });

      return new Agent(session);
    })
  );
}
