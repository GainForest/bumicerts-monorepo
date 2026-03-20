"use client";

/**
 * PublicDonateArea — the visitor-facing donation slot in the sidebar.
 *
 * Decision tree:
 *   1. No funding config record  →  "Donations are not applicable…"
 *   2. Receiving wallet missing, sig invalid, or wrong facilitator  →  same
 *   3. Status !== "open"  →  "Donations for this bumicert are {status}."
 *   4. Status === "open"  →  <DonateButton> + Add/Remove from cart
 *
 * Validity is derived from the indexer's specialMetadata.valid field and
 * the platform attestation address, exactly like the owner-side does.
 */

import { useEvmLinks } from "@/hooks/useEvmLinks";
import { useCartStore } from "@/components/stores/cart";
import { clientEnv } from "@/lib/env/client";
import type { FundingConfigData } from "@/lib/types";
import type { EvmLink } from "@/lib/graphql/queries/linkEvm";
import { DonateButton } from "./DonateButton";
import type { BumicertData } from "@/lib/types";
import {
  BanIcon,
  ClockIcon,
  PauseIcon,
  ShoppingCartIcon,
  XCircleIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ── Validity helper ────────────────────────────────────────────────────────────

function isLinkValid(link: EvmLink, facilitatorAddress: string | undefined): boolean {
  if (link.specialMetadata?.valid !== true) return false;
  if (!facilitatorAddress) return true;
  const pa = link.record?.platformAttestation?.platformAddress;
  if (!pa) return false;
  return pa.toLowerCase() === facilitatorAddress.toLowerCase();
}

// ── Status label helper ────────────────────────────────────────────────────────

type KnownStatus = "coming-soon" | "paused" | "closed";

const STATUS_LABELS: Record<KnownStatus, { label: string; Icon: React.ElementType }> = {
  "coming-soon": { label: "coming soon", Icon: ClockIcon  },
  "paused":      { label: "paused",      Icon: PauseIcon  },
  "closed":      { label: "closed",      Icon: XCircleIcon },
};

// ── Sub-components ────────────────────────────────────────────────────────────

function NotApplicable() {
  return (
    <div className="flex items-center gap-2 justify-center text-sm text-muted-foreground py-1">
      <BanIcon className="size-3.5 shrink-0" />
      <span>Donations are not applicable for this bumicert.</span>
    </div>
  );
}

function StatusNotice({ status }: { status: KnownStatus }) {
  const { label, Icon } = STATUS_LABELS[status];
  return (
    <div className="flex items-center gap-2 justify-center text-sm text-muted-foreground py-1">
      <Icon className="size-3.5 shrink-0" />
      <span>
        Donations for this bumicert are{" "}
        <span className="font-medium text-foreground">{label}</span>.
      </span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface PublicDonateAreaProps {
  bumicert: BumicertData;
  fundingConfig: FundingConfigData | null;
}

export function PublicDonateArea({ bumicert, fundingConfig }: PublicDonateAreaProps) {
  const facilitatorAddress = clientEnv.NEXT_PUBLIC_FACILITATOR_WALLET_ADDRESS;

  // Fetch the owner's linked wallets so we can verify the receiving wallet.
  const { data: evmLinks = [], isLoading } = useEvmLinks(bumicert.organizationDid);

  const inCart = useCartStore((s) => s.isInCart(bumicert.id));
  const addItem = useCartStore((s) => s.addItem);
  const removeItem = useCartStore((s) => s.removeItem);

  // ── 1. No config at all ──────────────────────────────────────────────────────
  if (!fundingConfig) return <NotApplicable />;

  // ── 2. Receiving wallet validity ─────────────────────────────────────────────
  const walletUri = fundingConfig.receivingWallet?.uri;
  if (!walletUri) return <NotApplicable />;

  // Avoid a flash of "not applicable" while evm links are loading
  if (isLoading) return null;

  const receivingLink = evmLinks.find((l) => l.metadata?.uri === walletUri);
  if (!receivingLink || !isLinkValid(receivingLink, facilitatorAddress)) {
    return <NotApplicable />;
  }

  // ── 3. Non-open status ───────────────────────────────────────────────────────
  const status = fundingConfig.status ?? "open";
  if (status !== "open") {
    return <StatusNotice status={status as KnownStatus} />;
  }

  // ── 4. Open — donate button + cart button ────────────────────────────────────
  return (
    <div className="flex flex-col gap-1 w-full">
      <DonateButton bumicert={bumicert} fundingConfig={fundingConfig} />
      <Button
        variant="outline"
        className="w-full"
        onClick={() => inCart ? removeItem(bumicert.id) : addItem(bumicert.id)}
      >
        <ShoppingCartIcon className="size-4" />
        {inCart ? "Remove from cart" : "Add to cart"}
      </Button>
    </div>
  );
}
