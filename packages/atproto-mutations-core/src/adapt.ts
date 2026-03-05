import { MutationError } from "./error";
import type { MutationResult } from "./result";

/**
 * adapt() — wraps a raw server action (returns MutationResult) into a
 * function that throws MutationError on failure.
 *
 * This makes the adapted function suitable as a React Query mutationFn:
 * onSuccess receives TData directly (not a Result wrapper), and onError
 * fires with a typed MutationError instead of a generic Error.
 *
 * When the action returns a failure with `issues` (validation errors),
 * those issues are forwarded to the MutationError so consumers can
 * call `formatMutationError()` to produce user-friendly messages.
 *
 * Raw server actions are NOT replaced — they remain available via
 * @gainforest/atproto-mutations-next/actions for server-to-server calls.
 *
 * @example
 * // SDK internals — wiring up the client namespace
 * export const mutations = {
 *   createClaim: adapt(createClaimAction),
 * };
 *
 * // Consumer — client component
 * const { mutate } = useMutation({
 *   mutationFn: mutations.createClaim,
 *   onSuccess: (claim) => toast.success("Created"),   // claim is TData, not Result
 *   onError: (e) => {
 *     if (MutationError.is(e)) toast.error(e.code);
 *   },
 * });
 */
export const adapt = <TInput, TData, TCode extends string>(
  action: (input: TInput) => Promise<MutationResult<TData, TCode>>
) => {
  return async (input: TInput): Promise<TData> => {
    const result = await action(input);
    if (!result.success) {
      throw new MutationError(result.code, result.message, result.issues);
    }
    return result.data;
  };
};
