"use client";

import Image from "next/image";
import type { BumicertData, FundingConfigData } from "@/lib/types";
import { BumicertCreationMeta, BumicertMeta } from "./BumicertInfoBar";
import { PublicDonateArea } from "./donate/PublicDonateArea";
import { FundingStatus, computeWalletFlags } from "./FundingStatus";
import { useEvmLinks } from "@/hooks/useEvmLinks";
import { useQueryClient } from "@tanstack/react-query";

interface BumicertSidebarProps {
  bumicert: BumicertData;
  /** True when the authenticated user owns this bumicert */
  isOwner: boolean;
  /** The funding config for this bumicert (null if not yet created) */
  fundingConfig: FundingConfigData | null;
}

export function BumicertSidebar({ bumicert, isOwner, fundingConfig }: BumicertSidebarProps) {
  const queryClient = useQueryClient();

  // Owner only: fetch their linked wallets to derive wallet validity flags
  const { data: evmLinks = [] } = useEvmLinks(
    isOwner ? bumicert.organizationDid : undefined
  );

  const { valid: receivingWalletValid, trusted: receivingWalletTrusted } =
    isOwner ? computeWalletFlags(fundingConfig, evmLinks) : { valid: false, trusted: false };

  const handleConfigSaved = () => {
    // Invalidate the activity query so the funding config re-fetches
    queryClient.invalidateQueries({ queryKey: ["activities"] });
  };

  return (
    <div className="lg:sticky lg:top-28 flex flex-col gap-4">
      <BumicertCreationMeta bumicert={bumicert} />

      {bumicert.coverImageUrl && (
        <div className="rounded-2xl border border-border overflow-hidden aspect-[3/4] relative">
          <Image
            src={bumicert.coverImageUrl}
            alt={bumicert.title}
            fill
            className="object-cover"
          />
        </div>
      )}

      <BumicertMeta bumicert={bumicert} />

      {/* ── Owner view: Funding status + manage button ───────────────────── */}
      {isOwner ? (
        <FundingStatus
          ownerDid={bumicert.organizationDid}
          bumicertRkey={bumicert.rkey}
          fundingConfig={fundingConfig}
          receivingWalletValid={receivingWalletValid}
          receivingWalletTrusted={receivingWalletTrusted}
          onConfigSaved={handleConfigSaved}
        />
      ) : (
        /* ── Visitor view ─────────────────────────────────────────────────── */
        <PublicDonateArea bumicert={bumicert} fundingConfig={fundingConfig} />
      )}
    </div>
  );
}
