import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    actions: "src/actions/index.ts",
    server: "src/server/index.ts",
    client: "src/client/index.ts",
  },
  format: ["cjs", "esm"],
  dts: true,
  clean: true,
  sourcemap: true,
  // Server actions and server utilities must not be bundled for the client.
  // Consumers' Next.js config handles that boundary; we just ship the code.
  external: ["next", "react", "@atproto/api", "@gainforest/atproto-auth-next"],
});
