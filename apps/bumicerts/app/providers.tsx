"use client";

import { ThemeProvider } from "next-themes";
import { AtprotoProvider } from "@/components/providers/AtprotoProvider";
import { ModalProvider } from "@/components/ui/modal/context";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { TRPCProvider } from "@/lib/trpc/provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NuqsAdapter>
      {/* TRPCProvider creates its own QueryClient and QueryClientProvider internally */}
      <TRPCProvider>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <AtprotoProvider>
            <ModalProvider>{children}</ModalProvider>
          </AtprotoProvider>
        </ThemeProvider>
      </TRPCProvider>
    </NuqsAdapter>
  );
}
