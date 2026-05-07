"use client";

/**
 * FundingStatus — shown in the sidebar when the logged-in user is the
 * bumicert owner (instead of the public Donate button).
 *
 * Renders in the exact same visual slot as the visitor's donate area:
 * a small status line above a full-width action button, no wrapping box.
 */

import { useCallback } from "react";
import { useModal } from "@/components/ui/modal/context";
import { Button } from "@/components/ui/button";
import { FundingConfigModal } from "@/components/global/modals/funding/config";
import { MODAL_IDS } from "@/components/global/modals/ids";
import { clientEnv } from "@/lib/env/client";
import type { FundingConfigData } from "@/lib/types";
import type { EvmLink } from "@/lib/graphql-dev/queries/linkEvm";
import {
  AlertTriangleIcon,
  CircleDotIcon,
  CircleMinusIcon,
  CircleOffIcon,
  ClockIcon,
  SettingsIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Status derivation ─────────────────────────────────────────────────────────

type DerivedStatus =
  | { kind: "no-config" }
  | { kind: "invalid"; reason: string }
  | { kind: "coming-soon" }
  | { kind: "paused" }
  | { kind: "closed" }
  | { kind: "open" };

function deriveStatus(
  config: FundingConfigData | null,
  receivingWalletValid: boolean,
  receivingWalletTrusted: boolean
): DerivedStatus {
  if (!config) return { kind: "no-config" };

  if (!config.receivingWallet?.uri) {
    return { kind: "invalid", reason: "No receiving wallet configured." };
  }

  if (!receivingWalletValid) {
    return {
      kind: "invalid",
      reason: "Wallet signature invalid — re-link your wallet.",
    };
  }

  if (!receivingWalletTrusted) {
    return {
      kind: "invalid",
      reason: "Wallet not verified by Bumicerts — re-link through the platform.",
    };
  }

  const s = config.status ?? "open";
  if (s === "coming-soon") return { kind: "coming-soon" };
  if (s === "paused") return { kind: "paused" };
  if (s === "closed") return { kind: "closed" };
  return { kind: "open" };
}

// ── Status UI config ──────────────────────────────────────────────────────────

type StatusUiConfig = {
  label: string;
  icon: React.ReactNode;
  labelClass: string;
  buttonLabel: string;
  buttonVariant: "default" | "outline";
};

function getStatusUi(derived: DerivedStatus): StatusUiConfig {
  const iconClass = "size-3.5 shrink-0";
  switch (derived.kind) {
    case "no-config":
      return {
        label: "Donations not set up",
        icon: <CircleOffIcon className={cn(iconClass, "text-muted-foreground")} />,
        labelClass: "text-muted-foreground",
        buttonLabel: "Enable Donations",
        buttonVariant: "default",
      };
    case "invalid":
      return {
        label: derived.reason,
        icon: <AlertTriangleIcon className={cn(iconClass, "text-destructive")} />,
        labelClass: "text-destructive",
        buttonLabel: "Update Settings",
        buttonVariant: "default",
      };
    case "coming-soon":
      return {
        label: "Coming Soon",
        icon: <ClockIcon className={cn(iconClass, "text-muted-foreground")} />,
        labelClass: "text-muted-foreground",
        buttonLabel: "Manage Donations",
        buttonVariant: "outline",
      };
    case "paused":
      return {
        label: "Donations paused",
        icon: <CircleMinusIcon className={cn(iconClass, "text-muted-foreground")} />,
        labelClass: "text-muted-foreground",
        buttonLabel: "Manage Donations",
        buttonVariant: "outline",
      };
    case "closed":
      return {
        label: "Donations closed",
        icon: <CircleOffIcon className={cn(iconClass, "text-muted-foreground")} />,
        labelClass: "text-muted-foreground",
        buttonLabel: "Manage Donations",
        buttonVariant: "outline",
      };
    case "open":
      return {
        label: "Accepting donations",
        icon: <CircleDotIcon className={cn(iconClass, "text-primary")} />,
        labelClass: "text-primary",
        buttonLabel: "Manage Donations",
        buttonVariant: "outline",
      };
  }
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface FundingStatusProps {
  ownerDid: string;
  bumicertRkey: string;
  fundingConfig: FundingConfigData | null;
  receivingWalletValid: boolean;
  receivingWalletTrusted: boolean;
  onConfigSaved: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function FundingStatus({
  ownerDid,
  bumicertRkey,
  fundingConfig,
  receivingWalletValid,
  receivingWalletTrusted,
  onConfigSaved,
}: FundingStatusProps) {
  const { pushModal, show } = useModal();

  const derived = deriveStatus(fundingConfig, receivingWalletValid, receivingWalletTrusted);
  const ui = getStatusUi(derived);

  const handleOpenModal = useCallback(() => {
    pushModal(
      {
        id: MODAL_IDS.FUNDING_CONFIG,
        content: (
          <FundingConfigModal
            ownerDid={ownerDid}
            bumicertRkey={bumicertRkey}
            existingConfig={fundingConfig}
            onSaved={onConfigSaved}
          />
        ),
      },
      true
    );
    show();
  }, [ownerDid, bumicertRkey, fundingConfig, onConfigSaved, pushModal, show]);

  // Mirrors the exact structure of the visitor's donate area in BumicertSidebar:
  //   flex flex-col gap-1 w-full
  //     small status line (like "Sign in to donate under your name")
  //     full-width Button
  return (
    <div className="flex flex-col gap-1 w-full">
      {/* Status line — same visual weight as the "Sign in to donate" link */}
      <div className={cn("flex items-center gap-1.5 justify-center text-sm", ui.labelClass)}>
        {ui.icon}
        <span>{ui.label}</span>
      </div>

      <Button
        onClick={handleOpenModal}
        variant={ui.buttonVariant}
        className="w-full"
      >
        <SettingsIcon className="size-3.5" />
        {ui.buttonLabel}
      </Button>
    </div>
  );
}

// ── Utility: compute wallet validity flags from config + env ──────────────────

export function computeWalletFlags(
  config: FundingConfigData | null,
  evmLinks: EvmLink[]
): { valid: boolean; trusted: boolean } {
  if (!config?.receivingWallet?.uri) return { valid: false, trusted: false };
  const uri = config.receivingWallet.uri;
  const facilitatorAddress = clientEnv.NEXT_PUBLIC_FACILITATOR_WALLET_ADDRESS;

  const match = evmLinks.find((l) => l.metadata?.uri === uri);
  if (!match) return { valid: false, trusted: false };

  const cryptoValid = match.specialMetadata?.valid === true;
  const platformAddress = match.record?.platformAttestation?.platformAddress as string | undefined;

  let trusted = true;
  if (facilitatorAddress && platformAddress) {
    trusted = platformAddress.toLowerCase() === facilitatorAddress.toLowerCase();
  }

  return { valid: cryptoValid, trusted };
}
