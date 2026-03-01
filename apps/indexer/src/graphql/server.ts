/**
 * GraphQL Yoga server.
 *
 * Serves the GraphQL API on the port defined by GRAPHQL_PORT
 * (default 4000).  GraphQL Yoga runs on top of Bun's native HTTP
 * server for maximum performance.
 *
 * Endpoints:
 *   POST /graphql  — query / mutation execution
 *   GET  /graphql  — GraphiQL playground (non-production)
 */

import { createYoga } from "graphql-yoga";
import { schema } from "./schema.ts";

const PORT = parseInt(process.env.GRAPHQL_PORT ?? "4000", 10);

export function startGraphQLServer(): void {
  const yoga = createYoga({
    schema,
    // Disable GraphiQL in production
    graphiql: process.env.NODE_ENV !== "production",
    logging: {
      debug: (...args) => console.debug("[graphql]", ...args),
      info: (...args) => console.info("[graphql]", ...args),
      warn: (...args) => console.warn("[graphql]", ...args),
      error: (...args) => console.error("[graphql]", ...args),
    },
  });

  const server = Bun.serve({
    port: PORT,
    fetch: yoga,
  });

  console.log(`[graphql] Server listening on http://localhost:${server.port}/graphql`);
}
