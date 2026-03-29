"use client";

import { createContext } from "react";
import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@gainforest/atproto-mutations-next/trpc";

/**
 * Dedicated React context for the mutations tRPC client.
 *
 * tRPC v11 uses a singleton React context by default — all createTRPCReact
 * instances share the same one. When two Providers are nested the inner one
 * silently overwrites the outer. Giving each client its own context avoids
 * the collision entirely.
 */
const MutationsTRPCContext = createContext<any>(null);

export const trpc = createTRPCReact<AppRouter>({
  context: MutationsTRPCContext,
});
