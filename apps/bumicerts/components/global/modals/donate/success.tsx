"use client";

import { useModal } from "@/components/ui/modal/context";
import {
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
} from "@/components/ui/modal/modal";
import { Button } from "@/components/ui/button";
import { links } from "@/lib/links";
import { getPublicUrlClient } from "@/lib/url";
import Link from "next/link";
import {
  ArrowUpRightIcon,
  BadgeCheck,
  CheckIcon,
  CompassIcon,
  CopyIcon,
  Share2,
  TrophyIcon,
} from "lucide-react";
import XIcon from "@/icons/XIcon";
import BlueskyIcon from "@/icons/BlueskyIcon";
import TelegramIcon from "@/icons/TelegramIcon";
import { useCopy } from "@/hooks/use-copy";
import { Separator } from "@/components/ui/separator";

interface SuccessModalProps {
  amount: number;
  organizationName: string;
  transactionHash: string;
  bumicertId: string;
}

export function SuccessModal({
  amount,
  organizationName,
  transactionHash,
  bumicertId,
}: SuccessModalProps) {
  const { hide, clear } = useModal();

  const baseScanUrl = `https://basescan.org/tx/${transactionHash}`;

  const handleDone = async () => {
    await hide();
    clear();
  };

  // Share functionality
  const baseUrl = getPublicUrlClient();
  const shareUrl = `${baseUrl}${links.bumicert.view(bumicertId)}`;

  const shareText = `I just donated $${amount.toFixed(2)} to this bumicert: ${shareUrl}`;

  const shareXUrl = links.external.share.x(shareText);
  const shareBlueskyUrl = links.external.share.bluesky(shareText);
  const shareTelegramUrl = links.external.share.telegram(shareText);

  const { copy, isCopied } = useCopy();

  return (
    <ModalContent dismissible={false}>
      <ModalHeader>
        <ModalTitle className="sr-only">Donation Successful</ModalTitle>
        <ModalDescription className="sr-only">
          Your donation was successful.
        </ModalDescription>
      </ModalHeader>

      <div className="flex flex-col gap-1">
        {/* Success message */}
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 rounded-full blur-xl bg-primary animate-pulse"></div>
            <BadgeCheck className="size-12 text-primary" />
          </div>

          <div className="flex flex-col gap-1">
            <p className="font-instrument italic font-medium text-4xl text-primary">
              Thank you!
            </p>
            <p className="font-medium text-muted-foreground mt-2 text-pretty">
              Your donation of&nbsp;
              <span className="text-foreground text-nowrap">
                {amount.toFixed(2)} USDC
              </span>
              &nbsp;to&nbsp;
              <span className="text-foreground">{organizationName}</span>
              &nbsp;was successful.
            </p>
          </div>
          <Button variant={"secondary"} asChild>
            <Link href={baseScanUrl} target="_blank">
              View Transaction Receipt <ArrowUpRightIcon />
            </Link>
          </Button>
        </div>

        <div className="rounded-3xl p-3 pt-2 w-full bg-muted flex flex-col gap-2">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Share2 className="size-3.5" />
            <span className="text-sm">Share this with others</span>
          </div>
          <div className="grid grid-cols-4 gap-1">
            <Button variant={"outline"} className="shadow-none" asChild>
              <Link href={shareXUrl} target="_blank">
                <XIcon className="text-black dark:text-white" />
              </Link>
            </Button>
            <Button variant={"outline"} className="shadow-none" asChild>
              <Link href={shareBlueskyUrl} target="_blank">
                <BlueskyIcon className="text-blue-600" />
              </Link>
            </Button>
            <Button variant={"outline"} className="shadow-none" asChild>
              <Link href={shareTelegramUrl} target="_blank">
                <TelegramIcon className="text-blue-500" />
              </Link>
            </Button>
            <Button
              variant={"outline"}
              className="shadow-none"
              onClick={() => copy(shareText)}
            >
              {isCopied ? <CheckIcon /> : <CopyIcon />}
            </Button>
          </div>
        </div>

        <Separator className="my-2 opacity-0" />

        <div className="rounded-2xl w-full flex flex-col gap-2">
          <div className="flex items-center px-3 gap-1.5 text-muted-foreground">
            <CompassIcon className="size-3.5" />
            <span className="text-sm">What next?</span>
          </div>
          <div className="min-w-full w-0 overflow-x-auto">
            <div className="flex items-center gap-1">
              <Button
                variant={"secondary"}
                className="flex flex-col items-start rounded-2xl h-16 flex-1"
                onClick={handleDone}
                asChild
              >
                <Link href={links.leaderboard}>
                  <TrophyIcon className="opacity-40" />
                  <span>See Leaderboard</span>
                </Link>
              </Button>
              <Button
                variant={"secondary"}
                className="flex flex-col items-start rounded-2xl h-16"
                onClick={handleDone}
                asChild
              >
                <Link href={links.explore}>
                  <CompassIcon className="opacity-40" />
                  <span>Explore more Bumicerts</span>
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <ModalFooter>
        <Button className="w-full" onClick={handleDone}>
          Done
        </Button>
      </ModalFooter>
    </ModalContent>
  );
}
