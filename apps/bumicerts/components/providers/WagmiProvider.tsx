"use client";

/**
 * WagmiProvider — configures wallet connection for Base mainnet.
 *
 * Uses wagmi's createConfig with injected + Coinbase Wallet connectors
 * (no WalletConnect, no fake project ID required).
 *
 * RainbowKitProvider is included so useConnectModal() is available
 * throughout the app. RainbowKit renders its connect modal as a top-level
 * portal — outside our app's modal DOM tree — so there is no z-index or
 * focus-trap conflict with our custom modal system.
 */

import { WagmiProvider as WagmiProviderBase, createConfig, http } from "wagmi";
import { base } from "wagmi/chains";
import { injected, coinbaseWallet } from "wagmi/connectors";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, lightTheme } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";
import { useState } from "react";

export const wagmiConfig = createConfig({
  chains: [base],
  transports: {
    [base.id]: http(),
  },
  connectors: [
    injected(),
    coinbaseWallet({ appName: "Bumicerts" }),
  ],
  ssr: true,
});

export function WagmiProvider({ children }: { children: React.ReactNode }) {
  const [wagmiQueryClient] = useState(() => new QueryClient());

  return (
    <WagmiProviderBase config={wagmiConfig}>
      <QueryClientProvider client={wagmiQueryClient}>
        <RainbowKitProvider
          theme={lightTheme({
            accentColor:           "var(--primary)",
            accentColorForeground: "var(--primary-foreground)",
            borderRadius:          "medium",
          })}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProviderBase>
  );
}
