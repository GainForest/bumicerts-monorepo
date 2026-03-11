"use client";

/**
 * WalletLinkSection — shown on the organization settings/profile page.
 *
 * Allows an org admin to link their EVM wallet address to their ATProto DID.
 * Once linked, the org can receive donations via the donation flow.
 *
 * Flow:
 * 1. Connect wallet via RainbowKit ConnectButton
 * 2. Switch to Base (if on wrong network)
 * 3. Sign EIP-712 message to prove wallet ownership
 * 4. POST /api/identity-link → writes org.impactindexer.link.attestation
 */

import { useAccount, useSwitchChain } from "wagmi";
import { base } from "wagmi/chains";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Button } from "@/components/ui/button";
import { useWalletAttestation } from "@/hooks/useWalletAttestation";
import { useRecipientVerify } from "@/components/global/modals/donate/hooks/useRecipientVerify";
import { useAtprotoStore } from "@/components/stores/atproto";

interface WalletLinkSectionProps {
  /** The organization's ATProto DID */
  orgDid: string;
}

export function WalletLinkSection({ orgDid }: WalletLinkSectionProps) {
  const { address, chainId, isConnected } = useAccount();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const auth = useAtprotoStore((state) => state.auth);

  const isCorrectNetwork = chainId === base.id;

  const {
    data: recipientStatus,
    isLoading: isVerifying,
    refetch,
  } = useRecipientVerify(orgDid);

  const { status, error, linkWallet, reset } = useWalletAttestation();

  const isAuthenticated = auth.status === "AUTHENTICATED";

  if (!isAuthenticated) {
    return (
      <div className="border border-border rounded-xl p-6">
        <h3 className="font-semibold mb-2">Set Up Donations</h3>
        <p className="text-sm text-muted-foreground">
          Sign in to link your wallet and receive donations.
        </p>
      </div>
    );
  }

  // Already linked
  if (!isVerifying && recipientStatus?.hasAttestation) {
    return (
      <div className="border border-border rounded-xl p-6 flex flex-col gap-3">
        <h3 className="font-semibold">Donations Enabled ✓</h3>
        <p className="text-sm text-muted-foreground">
          Wallet:{" "}
          <span className="font-mono">
            {recipientStatus.address.slice(0, 6)}...
            {recipientStatus.address.slice(-4)}
          </span>
        </p>
        <p className="text-xs text-muted-foreground">
          Donors can now send USDC to your organization via Bumicerts.
        </p>
      </div>
    );
  }

  // Not yet linked — show setup card
  return (
    <div className="border border-border rounded-xl p-6 flex flex-col gap-5">
      <div>
        <h3 className="font-semibold">Set Up Donations</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Link a wallet to receive USDC donations from supporters.
        </p>
      </div>

      {/* Step 1: Connect */}
      {!isConnected && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">Step 1: Connect your wallet</p>
          <ConnectButton label="Connect Wallet" showBalance={false} />
        </div>
      )}

      {/* Step 2: Switch network */}
      {isConnected && !isCorrectNetwork && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">Step 2: Switch to Base network</p>
          <Button
            onClick={() => switchChain({ chainId: base.id })}
            disabled={isSwitching}
          >
            {isSwitching ? "Switching..." : "Switch to Base"}
          </Button>
        </div>
      )}

      {/* Step 3: Sign + link */}
      {isConnected && isCorrectNetwork && (
        <div className="flex flex-col gap-2">
          {status === "success" ? (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-green-700 dark:text-green-400 font-medium">
                ✓ Wallet linked successfully!
              </p>
              <p className="text-xs text-muted-foreground">
                It may take a moment for the indexer to process your attestation.
              </p>
              <Button variant="outline" size="sm" onClick={() => { reset(); refetch(); }}>
                Refresh
              </Button>
            </div>
          ) : (
            <>
              <p className="text-sm font-medium">
                {status === "idle"
                  ? "Step 3: Link your wallet"
                  : status === "signing"
                    ? "Waiting for signature…"
                    : status === "writing"
                      ? "Writing attestation…"
                      : "Error linking wallet"}
              </p>
              {address && (
                <p className="text-xs text-muted-foreground font-mono">
                  {address.slice(0, 6)}...{address.slice(-4)}
                </p>
              )}
              {error && (
                <p className="text-xs text-destructive">{error}</p>
              )}
              <Button
                onClick={() => linkWallet()}
                disabled={status === "signing" || status === "writing"}
              >
                {status === "signing"
                  ? "Sign in wallet…"
                  : status === "writing"
                    ? "Writing to ATProto…"
                    : status === "error"
                      ? "Retry"
                      : "Sign & Link Wallet"}
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
