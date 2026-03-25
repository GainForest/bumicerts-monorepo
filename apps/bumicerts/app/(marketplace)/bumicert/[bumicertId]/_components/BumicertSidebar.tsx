"use client";

import Image from "next/image";
import type { BumicertData, FundingConfigData } from "@/lib/types";
import { BumicertCreationMeta, BumicertMeta } from "./BumicertInfoBar";
import { PublicDonateArea } from "./donate/PublicDonateArea";
import { FundingStatus, computeWalletFlags } from "./FundingStatus";
import { useEvmLinks } from "@/hooks/useEvmLinks";
import { useQueryClient } from "@tanstack/react-query";
import { Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useModal } from "@/components/ui/modal/context";
import DeleteBumicertModal, { DeleteBumicertModalId } from "./DeleteBumicertModal";

interface BumicertSidebarProps {
  bumicert: BumicertData;
  /** True when the authenticated user owns this bumicert */
  isOwner: boolean;
  /** The funding config for this bumicert (null if not yet created) */
  fundingConfig: FundingConfigData | null;
}

export function BumicertSidebar({ bumicert, isOwner, fundingConfig }: BumicertSidebarProps) {
  const queryClient = useQueryClient();
  const { pushModal, show } = useModal();

  const handleDeleteClick = () => {
    pushModal(
      {
        id: DeleteBumicertModalId,
        content: (
          <DeleteBumicertModal rkey={bumicert.rkey} title={bumicert.title} />
        ),
      },
      true
    );
    show();
  };

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
        <div className="rounded-2xl border border-border overflow-hidden aspect-3/4 relative">
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

      {/* ── Owner: Delete bumicert ──────────────────────────────────────── */}
      {isOwner && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          onClick={handleDeleteClick}
        >
          <Trash2Icon className="h-4 w-4" />
          Delete Bumicert
        </Button>
      )}
    </div>
  );
}
