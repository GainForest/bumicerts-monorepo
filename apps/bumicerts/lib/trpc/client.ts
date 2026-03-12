"use client";

import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@gainforest/atproto-mutations-next/trpc";

export const trpc = createTRPCReact<AppRouter>();
