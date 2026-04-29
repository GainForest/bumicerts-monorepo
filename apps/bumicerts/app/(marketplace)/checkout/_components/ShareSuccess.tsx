"use client";

import { Button } from "@/components/ui/button";
import {
  ArrowUpRightIcon,
  BadgeCheckIcon,
  CheckIcon,
  CompassIcon,
  CopyIcon,
  Share2,
  TrophyIcon,
} from "lucide-react";
import { links } from "@/lib/links";
import { getPublicUrlClient } from "@/lib/url";
import Link from "next/link";
import BlueskyIcon from "@/icons/BlueskyIcon";
import XIcon from "@/icons/XIcon";
import TelegramIcon from "@/icons/TelegramIcon";
import { useCopy } from "@/hooks/use-copy";
import type { CheckoutResult } from "./hooks/useCheckoutFlow";
import { UserChip } from "@/components/ui/user-chip";
import { cn } from "@/lib/utils";

const CopyButton = ({ copyText }: { copyText: string }) => {
  const { copy, isCopied } = useCopy();
  return (
    <Button
      onClick={() => {
        copy(copyText);
      }}
      variant={"ghost"}
      size={"icon-sm"}
    >
      {isCopied ? <CheckIcon /> : <CopyIcon />}
    </Button>
  );
};

export function ShareSuccess({
  checkoutResults,
}: {
  checkoutResults: CheckoutResult;
}) {
  const successfulResults = checkoutResults.results.filter(
    (result) => result.success,
  );
  const successfulTotalAmount = successfulResults.reduce((sum, result) => {
    const parsedAmount = Number.parseFloat(result.amount);
    return Number.isFinite(parsedAmount) ? sum + parsedAmount : sum;
  }, 0);
  const totalAmountFormatted = successfulTotalAmount.toFixed(2);
  const successfulItemCount =
    checkoutResults.successCount > 0
      ? checkoutResults.successCount
      : successfulResults.length;
  const bumicertLabel = successfulItemCount === 1 ? "Bumicert" : "Bumicerts";

  // Share functionality
  const baseUrl = getPublicUrlClient();
  const shareUrl = `${baseUrl}${links.explore}`;

  const shareText = `I just donated $${totalAmountFormatted} to ${successfulItemCount} ${bumicertLabel}. Explore bumicerts on ${shareUrl}`;

  const shareXUrl = links.external.share.x(shareText);
  const shareBlueskyUrl = links.external.share.bluesky(shareText);
  const shareTelegramUrl = links.external.share.telegram(shareText);

  const { copy, isCopied } = useCopy();

  return (
    <div className="flex flex-col gap-1">
      {/* Success message */}
      <div className="flex flex-col items-center gap-4 py-2 text-center">
        <div className="relative flex items-center justify-center">
          <div className="absolute inset-0 rounded-full blur-xl bg-primary animate-pulse"></div>
          <BadgeCheckIcon className="size-12 text-primary" />
        </div>

        <div className="flex flex-col gap-1">
          <p className="font-instrument italic font-medium text-4xl text-primary">
            Thank you!
          </p>
          <p className="font-medium text-muted-foreground mt-2 text-pretty">
            Your donation worth&nbsp;
            <span className="text-foreground text-nowrap">
              {totalAmountFormatted} USDC
            </span>
            &nbsp;was successful.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {checkoutResults.donorRecordedAs === "did"
              ? "Recorded with your Bumicerts profile."
              : "Recorded as anonymous."}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto my-6">
        <table className="w-full min-w-[720px] border border-border rounded-xl overflow-hidden">
          <thead className="bg-muted">
            <tr>
              <th scope="col" className="font-medium py-2 text-sm">
                Creator
              </th>
              <th scope="col" className="font-medium py-2 text-sm">
                Bumicert
              </th>
              <th scope="col" className="font-medium py-2 text-sm">
                Transaction Hash
              </th>
              <th scope="col" className="font-medium py-2 text-sm">
                Amount (USDC)
              </th>
            </tr>
          </thead>
          <tbody>
            {successfulResults.map((r, idx) => {
              const isOddItem = idx % 2;
              return (
                <tr
                  key={`${r.orgDid}-${r.activityUri}-${r.transactionHash}`}
                  className={cn(isOddItem && "bg-muted/60")}
                >
                  <td>
                    {<UserChip did={r.orgDid} textClassName="text-base" />}
                  </td>
                  <td className="py-1 text-center">
                    <Button variant={"secondary"} asChild>
                      <Link
                        href={links.bumicert.view(
                          `${r.orgDid}-${r.activityUri.split("/").at(-1)}`,
                        )}
                      >
                        View
                      </Link>
                    </Button>
                  </td>
                  <td className="text-center align-middle">
                    <span className="mr-2 font-mono">
                      {r.transactionHash.slice(0, 6)}...
                      {r.transactionHash.slice(-6)}
                    </span>
                    <CopyButton copyText={r.transactionHash} />
                    <Button variant={"link"} size={"icon-sm"} asChild>
                      <Link href={r.receiptUri ?? "#"} target="_blank">
                        <ArrowUpRightIcon />
                      </Link>
                    </Button>
                  </td>
                  <td className="text-right font-medium px-3">
                    {parseFloat(r.amount).toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-muted">
            <tr>
              <td
                colSpan={2}
                className="text-sm text-muted-foreground px-2 font-semibold"
              >
                Total Amount Donated (USDC)
              </td>
              <td></td>
              <td className="text-right px-3">{totalAmountFormatted}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="w-full flex flex-col items-center justify-center ">
        <div className="flex items-center px-3 gap-1.5 text-muted-foreground">
          <Share2 className="size-3.5" />
          <span className="text-sm">Share this with others</span>
        </div>
        <div className="flex items-center justify-center gap-1 flex-wrap mt-2">
          <Button variant={"secondary"} asChild>
            <Link href={shareXUrl} target="_blank">
              <XIcon className="text-black dark:text-white" /> X (Twitter)
            </Link>
          </Button>
          <Button variant={"secondary"} asChild>
            <Link href={shareBlueskyUrl} target="_blank">
              <BlueskyIcon className="text-blue-600" /> Bluesky
            </Link>
          </Button>
          <Button variant={"secondary"} asChild>
            <Link href={shareTelegramUrl} target="_blank">
              <TelegramIcon className="text-blue-500" /> Telegram
            </Link>
          </Button>
          <Button variant={"secondary"} onClick={() => copy(shareText)}>
            {isCopied ? <CheckIcon /> : <CopyIcon />} Copy
          </Button>
        </div>
      </div>

      <div className="rounded-2xl w-full flex flex-col items-center gap-2 mt-4">
        <div className="flex items-center px-3 gap-1.5 text-muted-foreground text-center">
          <CompassIcon className="size-3.5" />
          <span className="text-sm">What next?</span>
        </div>
        <div className="flex items-center justify-center flex-wrap">
          <div className="flex items-center gap-1">
            <Button
              variant={"secondary"}
              className="flex flex-col items-start rounded-2xl h-16"
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
  );
}
