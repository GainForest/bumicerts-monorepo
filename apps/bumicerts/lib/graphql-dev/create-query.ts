/**
 * createQuery — tRPC-inspired helper for building typed, key-bound query descriptors.
 *
 * Each descriptor exposes three things:
 *   .fetch(params)               — plain async function; safe to call from server components
 *   .useQuery(params, options?)  — React Query hook; auto-derives queryKey from the path + params
 *   .key(params?)                — returns the queryKey so callers can invalidate precisely
 *
 * Key convention:
 *   createQuery(["activities"], module)
 *   → .key({ did })  ≡  ["activities", { did }]
 *   → .key()         ≡  ["activities"]
 *
 * Usage:
 *   // Client component
 *   const { data } = queries.activities.useQuery({ did });
 *   const { data } = queries.activities.useQuery({ did }, { staleTime: 5_000 });
 *
 *   // Server component / route handler
 *   const items = await queries.activities.fetch({ did });
 *
 *   // Invalidation (after mutation)
 *   queryClient.invalidateQueries({ queryKey: queries.activities.key({ did }) });
 *   queryClient.invalidateQueries({ queryKey: queries.activities.key() });
 */

import { useQuery, type UseQueryOptions } from "@tanstack/react-query";

// ── Types ─────────────────────────────────────────────────────────────────────

type AnyParams = Record<string, unknown>;

/** What every query module file must export. */
export interface QueryModule<TParams, TResult> {
  /** Pure async fetcher — no React, safe for server components. */
  fetch: (params: TParams) => Promise<TResult>;
  /** Default React Query options baked into this query. Overridable at call site. */
  defaultOptions?: Partial<Omit<UseQueryOptions<TResult>, "queryKey" | "queryFn">>;
  /**
   * Controls whether the hook is enabled.
   * If omitted the hook is always enabled.
   * Receives the same params object passed to useQuery.
   */
  enabled?: (params: TParams) => boolean;
}

/** Shape returned by createQuery. */
export interface QueryDescriptor<TParams, TResult> {
  fetch: (params: TParams) => Promise<TResult>;
  useQuery: (
    params: TParams,
    options?: Partial<Omit<UseQueryOptions<TResult>, "queryKey" | "queryFn" | "enabled">>
  ) => ReturnType<typeof useQuery<TResult>>;
  key: (params?: TParams) => readonly unknown[];
}

/** Shape returned by createQueryNoParams (zero-variable queries). */
export interface QueryDescriptorNoParams<TResult> {
  fetch: () => Promise<TResult>;
  useQuery: (
    options?: Partial<Omit<UseQueryOptions<TResult>, "queryKey" | "queryFn">>
  ) => ReturnType<typeof useQuery<TResult>>;
  key: () => readonly unknown[];
}

// ── createQuery ───────────────────────────────────────────────────────────────

/**
 * Creates a query descriptor for queries that accept a params object.
 *
 * @param path   - Array of strings forming the key prefix, e.g. ["organization", "logo"]
 * @param module - Object with fetch, optional defaultOptions, optional enabled
 */
export function createQuery<TParams extends AnyParams, TResult>(
  path: readonly string[],
  module: QueryModule<TParams, TResult>
): QueryDescriptor<TParams, TResult> {
  function key(params?: TParams): readonly unknown[] {
    return params !== undefined ? [...path, params] : [...path];
  }

  function useQueryHook(
    params: TParams,
    options?: Partial<Omit<UseQueryOptions<TResult>, "queryKey" | "queryFn" | "enabled">>
  ) {
    const isEnabled = module.enabled ? module.enabled(params) : true;

    return useQuery<TResult>({
      queryKey: key(params),
      queryFn: () => module.fetch(params),
      enabled: isEnabled,
      ...module.defaultOptions,
      ...options,
    });
  }

  return {
    fetch: module.fetch,
    useQuery: useQueryHook,
    key,
  };
}

// ── createQueryNoParams ───────────────────────────────────────────────────────

/**
 * Creates a query descriptor for queries that need no variables (e.g. explore feed).
 *
 * @param path   - Array of strings forming the key, e.g. ["activities", "explore"]
 * @param module - Object with fetch and optional defaultOptions
 */
export function createQueryNoParams<TResult>(
  path: readonly string[],
  module: Omit<QueryModule<void, TResult>, "enabled">
): QueryDescriptorNoParams<TResult> {
  function key(): readonly unknown[] {
    return [...path];
  }

  function useQueryHook(
    options?: Partial<Omit<UseQueryOptions<TResult>, "queryKey" | "queryFn">>
  ) {
    return useQuery<TResult>({
      queryKey: key(),
      queryFn: () => module.fetch(),
      ...module.defaultOptions,
      ...options,
    });
  }

  return {
    fetch: module.fetch,
    useQuery: useQueryHook,
    key,
  };
}
