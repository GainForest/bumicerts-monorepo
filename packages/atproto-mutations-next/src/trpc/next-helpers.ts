import { cache } from "react";
import type { AuthSetup } from "@gainforest/atproto-auth-next";
import { appRouter, type AppRouter } from "./router";
import { createContextFactory } from "./context";

type ServerCaller = ReturnType<AppRouter["createCaller"]>;

/**
 * Creates a cached server caller for use in React Server Components.
 *
 * The caller is cached per-request via React's `cache()`, so it's safe to
 * call `getServerCaller()` multiple times in the same render pass without
 * rebuilding the context or making extra PDS calls.
 *
 * @example
 * // lib/trpc/server.ts
 * import { createServerCaller } from "@gainforest/atproto-mutations-next/trpc";
 * import { auth } from "@/lib/auth";
 *
 * export const getServerCaller = createServerCaller(auth);
 *
 * // In a Server Component
 * const caller = await getServerCaller();
 * const data = await caller.claim.activity.create({ ... });
 */
export function createServerCaller(auth: AuthSetup): () => Promise<ServerCaller> {
  const createContext = createContextFactory(auth);

  return cache(async (): Promise<ServerCaller> => {
    const ctx = await createContext();
    return appRouter.createCaller(ctx);
  });
}
