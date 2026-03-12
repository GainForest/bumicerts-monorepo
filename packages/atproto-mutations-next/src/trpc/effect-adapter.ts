import { Effect, Layer } from "effect";
import { t } from "./init";
import { mapEffectErrorToTRPC } from "./error-mapper";
import type { AtprotoAgent } from "@gainforest/atproto-mutations-core";
import type { UnauthorizedError, SessionExpiredError } from "../server";

/**
 * Wraps an Effect mutation as a tRPC procedure.
 *
 * - Runs Effect.runPromise with the agent layer from context
 * - Maps Effect errors to TRPCError
 * - Input passes through as-is (Effect validates internally via $parse)
 *
 * The `O` type parameter preserves the output type so tRPC clients get
 * proper return type inference. Input is typed as `any` at the boundary
 * because Effect validates it internally.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function effectMutation<O>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mutation: (input: any) => Effect.Effect<O, any, AtprotoAgent>
) {
  return t.procedure
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .input((input: unknown): any => input)
    .mutation(async ({ input, ctx }): Promise<O> => {
      const agentLayer = ctx.agentLayer as Layer.Layer<
        AtprotoAgent,
        UnauthorizedError | SessionExpiredError
      >;
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return await Effect.runPromise(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (mutation(input) as Effect.Effect<O, any, AtprotoAgent>).pipe(
            Effect.provide(agentLayer)
          )
        );
      } catch (error) {
        throw mapEffectErrorToTRPC(error);
      }
    });
}
