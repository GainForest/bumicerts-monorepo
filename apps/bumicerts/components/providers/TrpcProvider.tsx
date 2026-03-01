// components/providers/trpc-provider.tsx
"use client";

import { ReactNode, useMemo } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, loggerLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import { AppRouter } from "gainforest-sdk";
import { customTransformer } from "gainforest-sdk/utilities/transform";
import { AllowedPDSDomain } from "@/lib/config/gainforest-sdk";

export const trpcApi = createTRPCReact<AppRouter<AllowedPDSDomain>>();

function getBaseUrl() {
  if (typeof window !== "undefined") return "";
  return process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000";
}

export function TrpcProvider({ children }: { children: ReactNode }) {
  const queryClient = useMemo(() => new QueryClient(), []);

  const trpcClient = useMemo(
    () =>
      trpcApi.createClient({
        links: [
          loggerLink({ enabled: () => process.env.NODE_ENV === "development" }),
          httpBatchLink({
            url: `${getBaseUrl()}/api/trpc`,
            transformer: customTransformer,
          }),
        ],
      }),
    []
  );

  return (
    <trpcApi.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpcApi.Provider>
  );
}
