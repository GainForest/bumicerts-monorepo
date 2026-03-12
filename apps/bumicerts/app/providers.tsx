"use client";

import { ThemeProvider } from "next-themes";
import { AtprotoProvider } from "@/components/providers/AtprotoProvider";
import { WagmiProvider } from "@/components/providers/WagmiProvider";
import { ModalProvider } from "@/components/ui/modal/context";
import { Toaster } from "@/components/ui/sonner";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { TRPCProvider } from "@/lib/trpc/provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NuqsAdapter>
      {/* TRPCProvider creates its own QueryClient and QueryClientProvider internally */}
      <TRPCProvider>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <AtprotoProvider>
            <WagmiProvider>
              <ModalProvider>{children}</ModalProvider>
            </WagmiProvider>
          </AtprotoProvider>
          <Toaster position="bottom-right" richColors={false} />
        </ThemeProvider>
      </TRPCProvider>
    </NuqsAdapter>
  );
}
