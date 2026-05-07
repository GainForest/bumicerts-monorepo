import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { localQueryRouter } from "@/lib/trpc/query-router/router";

/**
 * tRPC endpoint for indexer read queries.
 *
 * Served at /api/indexer/trpc — separate from the mutation endpoint at /api/trpc.
 * No auth required: all procedures are public reads from the indexer.
 */
const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/indexer/trpc",
    req,
    router: localQueryRouter,
    createContext: () => ({}),
    onError: ({ path, error }) => {
      console.error(`Indexer tRPC error on ${path ?? "<no-path>"}:`, {
        code: error.code,
        message: error.message,
        ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
      });
    },
  });

export { handler as GET, handler as POST };
