"use client";

import type { BumicertData, FundingConfigData } from "@/lib/types";
import { useTabParam } from "../_hooks/useTabParam";
import { HeaderContent } from "@/app/(marketplace)/_components/Header/HeaderContent";
import { BumicertTabs } from "./BumicertMobileTabs";
import { BumicertSidebar } from "./BumicertSidebar";
import { TabContent } from "./TabContent";
import { BumicertCreationMeta, BumicertMeta } from "./BumicertInfoBar";
import { PublicDonateArea } from "./donate/PublicDonateArea";
import { FundingStatus, computeWalletFlags } from "./FundingStatus";
import { useEvmLinks } from "@/hooks/useEvmLinks";
import { useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import { Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useModal } from "@/components/ui/modal/context";
import DeleteBumicertModal, { DeleteBumicertModalId } from "./DeleteBumicertModal";

interface BumicertDetailProps {
  bumicert: BumicertData;
  /** True when the authenticated user owns this bumicert */
  isOwner: boolean;
  /** Funding config for this bumicert (null if not yet created) */
  fundingConfig: FundingConfigData | null;
}

// ── Mobile donate slot ────────────────────────────────────────────────────────
// Mirrors the sidebar's donate area but rendered inline in the mobile stack.

function MobileDonateSlot({ bumicert, isOwner, fundingConfig }: BumicertDetailProps) {
  const queryClient = useQueryClient();
  const { data: evmLinks = [] } = useEvmLinks(
    isOwner ? bumicert.organizationDid : undefined
  );
  const { valid: receivingWalletValid, trusted: receivingWalletTrusted } =
    isOwner ? computeWalletFlags(fundingConfig, evmLinks) : { valid: false, trusted: false };

  const handleConfigSaved = () => {
    queryClient.invalidateQueries({ queryKey: ["activities"] });
  };

  if (isOwner) {
    return (
      <FundingStatus
        ownerDid={bumicert.organizationDid}
        bumicertRkey={bumicert.rkey}
        fundingConfig={fundingConfig}
        receivingWalletValid={receivingWalletValid}
        receivingWalletTrusted={receivingWalletTrusted}
        onConfigSaved={handleConfigSaved}
      />
    );
  }

  return <PublicDonateArea bumicert={bumicert} fundingConfig={fundingConfig} />;
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function BumicertDetail({ bumicert, isOwner, fundingConfig }: BumicertDetailProps) {
  const [tab] = useTabParam();
  const showSidebar = tab !== "timeline";
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

  return (
    <>
      <HeaderContent sub={<BumicertTabs />} />

      <div className={`grid grid-cols-1 gap-6 lg:gap-10 lg:px-2 ${showSidebar ? "lg:grid-cols-[280px_1fr]" : ""}`}>
        {/* Sidebar — hidden on Timeline tab */}
        {showSidebar && (
          <div className="hidden lg:block">
            <BumicertSidebar
              bumicert={bumicert}
              isOwner={isOwner}
              fundingConfig={fundingConfig}
            />
          </div>
        )}

        {/* Right column: mobile meta stack + tab content */}
        <div className="flex flex-col gap-4">
          {/* Mobile-only stack — hidden at lg+ */}
          <div className="flex flex-col gap-4 lg:hidden">
            {/* Sticky creation meta */}
            <div className="sticky top-14 z-10 border border-border rounded-xl shadow-md bg-background px-4 py-3">
              <BumicertCreationMeta bumicert={bumicert} />
            </div>

            {/* At sm+: image left, meta right. Below sm: stack vertically. */}
            <div className="flex flex-col sm:flex-row gap-4">
              {bumicert.coverImageUrl && (
                <div className="rounded-2xl border border-border overflow-hidden relative w-full sm:w-1/2 aspect-3/4 max-h-[50vh]">
                  <Image src={bumicert.coverImageUrl} alt={bumicert.title} fill className="object-cover" />
                </div>
              )}
              <div className="sm:w-1/2 sm:flex-1 flex flex-col gap-4">
                {/* Title — visible on mobile in the meta area */}
                <h1
                  className="text-xl font-semibold text-foreground leading-snug"
                  style={{ fontFamily: "var(--font-garamond-var)" }}
                >
                  {bumicert.title}
                </h1>
                <BumicertMeta bumicert={bumicert} />
                {/* Donate / funding status — right below meta */}
                <MobileDonateSlot
                  bumicert={bumicert}
                  isOwner={isOwner}
                  fundingConfig={fundingConfig}
                />
                {/* Owner: delete bumicert */}
                {isOwner && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={handleDeleteClick}
                  >
                    <Trash2Icon />
                    Delete Bumicert
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Tab content */}
          <TabContent bumicert={bumicert} isOwner={isOwner} />
        </div>
      </div>
    </>
  );
}
