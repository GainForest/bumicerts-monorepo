import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter, createContextFactory } from "@gainforest/atproto-mutations-next/trpc";
import { auth } from "@/lib/auth";

const createContext = createContextFactory(auth);

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext,
    onError: ({ path, error }) => {
      // Always log errors for server-side visibility (Vercel logs in production)
      console.error(`tRPC error on ${path ?? "<no-path>"}:`, {
        code: error.code,
        message: error.message,
        // Include stack only in development for debugging
        ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
      });
    },
  });

export { handler as GET, handler as POST };
