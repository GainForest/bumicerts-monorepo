import { Effect } from "effect";
import { router } from "./init";
import { effectMutation } from "./effect-adapter";
import type { AtprotoAgent } from "@gainforest/atproto-mutations-core";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyMutationFn = (input: any) => Effect.Effect<any, any, AtprotoAgent>;

/**
 * Extracts the success value type O from Effect.Effect<O, E, R>.
 */
type EffectSuccess<T> = T extends Effect.Effect<infer O, infer _E, infer _R> ? O : never;

/**
 * Creates a tRPC router from an entity with standard CRUD operations.
 * Generates procedures for whichever of create / update / upsert / delete are present.
 *
 * Overloads preserve the concrete output type of each procedure so the tRPC
 * React client sees the correct return type (e.g. ClaimActivityMutationResult).
 *
 * @example
 * // In router.ts:
 * certified: router({
 *   location: entityRouter(mutations.certified.location),
 * }),
 */
export function entityRouter<
  Create extends AnyMutationFn,
  Update extends AnyMutationFn,
  Upsert extends AnyMutationFn,
  Del extends AnyMutationFn,
>(entity: {
  create: Create;
  update: Update;
  upsert: Upsert;
  delete: Del;
}): ReturnType<typeof router<{
  create: ReturnType<typeof effectMutation<EffectSuccess<ReturnType<Create>>>>;
  update: ReturnType<typeof effectMutation<EffectSuccess<ReturnType<Update>>>>;
  upsert: ReturnType<typeof effectMutation<EffectSuccess<ReturnType<Upsert>>>>;
  delete: ReturnType<typeof effectMutation<EffectSuccess<ReturnType<Del>>>>;
}>>;

export function entityRouter<
  Create extends AnyMutationFn,
  Update extends AnyMutationFn,
  Upsert extends AnyMutationFn,
>(entity: {
  create: Create;
  update: Update;
  upsert: Upsert;
  delete?: undefined;
}): ReturnType<typeof router<{
  create: ReturnType<typeof effectMutation<EffectSuccess<ReturnType<Create>>>>;
  update: ReturnType<typeof effectMutation<EffectSuccess<ReturnType<Update>>>>;
  upsert: ReturnType<typeof effectMutation<EffectSuccess<ReturnType<Upsert>>>>;
}>>;

// Implementation — the union type is handled by the overloads above
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function entityRouter(entity: {
  create?: AnyMutationFn;
  update?: AnyMutationFn;
  upsert?: AnyMutationFn;
  delete?: AnyMutationFn;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
}): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const procedures: Record<string, any> = {};
  if (entity.create) procedures.create = effectMutation(entity.create);
  if (entity.update) procedures.update = effectMutation(entity.update);
  if (entity.upsert) procedures.upsert = effectMutation(entity.upsert);
  if (entity.delete) procedures.delete = effectMutation(entity.delete);
  return router(procedures);
}
