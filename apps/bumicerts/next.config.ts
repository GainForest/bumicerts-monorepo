import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  skipProxyUrlNormalize: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  experimental: {
    viewTransition: true,
    serverActions: {
      bodySizeLimit: "15mb",
    },
  },
};

export default nextConfig;
