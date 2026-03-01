import { SupportedPDSDomain } from "gainforest-sdk";
import { createTRPCClient } from "gainforest-sdk/client";

export const allowedPDSDomains = (process.env.NEXT_PUBLIC_VERCEL_ENV === "production" ? ["gainforest.id"] : [
  "climateai.org",
]) satisfies SupportedPDSDomain[];
export type AllowedPDSDomain = (typeof allowedPDSDomains)[number];

// The first entry in allowedPDSDomains is the default PDS domain for the current environment.
export const defaultPdsDomain = allowedPDSDomains[0] as AllowedPDSDomain;

export const trpcClient = createTRPCClient<AllowedPDSDomain>("/api/trpc");
