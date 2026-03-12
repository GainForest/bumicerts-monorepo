import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    server: "src/server/index.ts",
    trpc: "src/trpc/index.ts",
  },
  format: ["cjs", "esm"],
  dts: true,
  clean: true,
  sourcemap: true,
  // tRPC and server utilities must not be bundled for the client.
  // Consumers' Next.js config handles that boundary; we just ship the code.
  external: [
    "next",
    "react",
    "@atproto/api",
    "@gainforest/atproto-auth-next",
    "@gainforest/atproto-mutations-core",
    "@gainforest/internal-utils",
    "@trpc/server",
    "@trpc/client",
    "@trpc/react-query",
    "superjson",
  ],
});
