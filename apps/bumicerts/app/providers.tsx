"use client";

import { ThemeProvider } from "next-themes";
import { AtprotoProvider } from "@/components/providers/AtprotoProvider";
import { ModalProvider } from "@/components/ui/modal/context";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { TRPCProvider } from "@/lib/trpc/provider";
import { IndexerTRPCProvider } from "@/lib/trpc/indexer/provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NuqsAdapter>
      {/* TRPCProvider creates the QueryClient + QueryClientProvider for mutations */}
      <TRPCProvider>
        {/* IndexerTRPCProvider shares the same QueryClient, adds indexer read client */}
        <IndexerTRPCProvider>
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
            <AtprotoProvider>
              <ModalProvider>{children}</ModalProvider>
            </AtprotoProvider>
          </ThemeProvider>
        </IndexerTRPCProvider>
      </TRPCProvider>
    </NuqsAdapter>
  );
}
