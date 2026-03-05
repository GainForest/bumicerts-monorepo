"use client";

import { useState } from "react";
import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AtprotoProvider } from "@/components/providers/AtprotoProvider";
import { ModalProvider } from "@/components/ui/modal/context";

export function Providers({ children }: { children: React.ReactNode }) {
  // useState ensures each browser session gets its own QueryClient instance
  // (avoids sharing state across requests in SSR)
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <AtprotoProvider>
          <ModalProvider>
            {children}
          </ModalProvider>
        </AtprotoProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
