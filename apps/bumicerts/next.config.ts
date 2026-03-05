import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  skipProxyUrlNormalize: true,

  // Compile workspace packages from TypeScript source directly.
  // transpilePackages tells Turbopack to process these through its compiler
  // instead of loading their pre-built dist/ output (which is gitignored).
  // multiformats is ESM-only and needs transpiling too.
  transpilePackages: [
    "@gainforest/atproto-auth-next",
    "@gainforest/atproto-mutations-core",
    "@gainforest/atproto-mutations-next",
    "@gainforest/internal-utils",
    "@gainforest/generated",
    "multiformats",
  ],

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  experimental: {
    viewTransition: true,
    serverActions: {
      bodySizeLimit: "15mb",
    },
    // resolveAlias maps each @gainforest package specifier directly to its
    // TypeScript source entry, bypassing the exports map which points to
    // non-existent dist/ files on Vercel (dist/ is gitignored).
    // turbo is not yet in Next.js public types, hence the cast below.
  } as any,
  turbopack: {
    resolveAlias: {
      "@gainforest/atproto-auth-next": "../../packages/atproto-auth-next/src/index.ts",
      "@gainforest/atproto-auth-next/server": "../../packages/atproto-auth-next/src/server.ts",
      "@gainforest/atproto-auth-next/client": "../../packages/atproto-auth-next/src/client.ts",
      "@gainforest/atproto-auth-next/stores": "../../packages/atproto-auth-next/src/stores.ts",
      "@gainforest/atproto-mutations-core": "../../packages/atproto-mutations-core/src/index.ts",
      "@gainforest/atproto-mutations-next": "../../packages/atproto-mutations-next/src/index.ts",
      "@gainforest/atproto-mutations-next/client": "../../packages/atproto-mutations-next/src/client/index.ts",
      "@gainforest/atproto-mutations-next/server": "../../packages/atproto-mutations-next/src/server/index.ts",
      "@gainforest/atproto-mutations-next/actions": "../../packages/atproto-mutations-next/src/actions/index.ts",
      "@gainforest/internal-utils": "../../packages/internal-utils/src/index.ts",
      // multiformats is ESM-only; @atproto/lexicon's CJS dist tries to
      // require() it which Turbopack can't handle. Alias to the dist ESM file
      // so Turbopack processes it as a proper ES module.
      "multiformats/cid": "../../node_modules/multiformats/dist/src/cid.js",
      "multiformats/bases/base58": "../../node_modules/multiformats/dist/src/bases/base58.js",
      "multiformats/hashes/digest": "../../node_modules/multiformats/dist/src/hashes/digest.js",
      "multiformats/hashes/hasher": "../../node_modules/multiformats/dist/src/hashes/hasher.js",
    },
  },
};

export default nextConfig;
