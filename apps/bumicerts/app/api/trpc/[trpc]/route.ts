import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter, createContextFactory, logTRPCError } from "@gainforest/atproto-mutations-next/trpc";
import { auth } from "@/lib/auth";

const createContext = createContextFactory(auth);

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext,
    onError: logTRPCError,
  });

export { handler as GET, handler as POST };
