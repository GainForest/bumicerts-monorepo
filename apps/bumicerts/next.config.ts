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
  },
};

export default nextConfig;
