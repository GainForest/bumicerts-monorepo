import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import type { TRPCContext } from "./context";

export const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        // Include the original Effect error tag if available for debugging
        effectTag:
          error.cause && typeof error.cause === "object" && "_tag" in error.cause
            ? (error.cause as { _tag: string })._tag
            : undefined,
      },
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const middleware = t.middleware;
