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
import { useMemo, useState } from "react";
import { clientEnv } from "@/lib/env/client";

export function WagmiProvider({ children }: { children: React.ReactNode }) {
  const [wagmiQueryClient] = useState(() => new QueryClient());

  // Build wagmiConfig inside the component so it is only evaluated on the
  // client, after the env has been validated. Memoised so it is stable across
  // re-renders without being a module-level singleton.
  const wagmiConfig = useMemo(
    () =>
      getDefaultConfig({
        appName: "Bumicerts",
        projectId: clientEnv.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
        chains: [base],
        ssr: true,
      }),
    []
  );

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
