"use client";

/**
 * WagmiProvider — configures wallet connection for Base mainnet.
 *
 * Uses RainbowKit's getDefaultConfig which bundles WalletConnect,
 * MetaMask, Coinbase Wallet, Rainbow, and other popular wallets.
 * WalletConnect is required for mobile wallet support (deep-links into
 * wallet apps), since injected connectors don't exist in mobile browsers.
 *
 * RainbowKitProvider is included so useConnectModal() is available
 * throughout the app. RainbowKit renders its connect modal as a top-level
 * portal — outside our app's modal DOM tree — so there is no z-index or
 * focus-trap conflict with our custom modal system.
 */

import { WagmiProvider as WagmiProviderBase } from "wagmi";
import { base } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  getDefaultConfig,
  RainbowKitProvider,
  lightTheme,
} from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";
import { useState } from "react";
import { clientEnv } from "@/lib/env/client";

export const wagmiConfig = getDefaultConfig({
  appName: "Bumicerts",
  projectId: clientEnv.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
  chains: [base],
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
