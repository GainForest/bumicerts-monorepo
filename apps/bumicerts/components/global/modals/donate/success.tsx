"use client";

import { useState } from "react";
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
import Link from "next/link";
import {
  CheckIcon,
  CopyIcon,
  ExternalLinkIcon,
  TrophyIcon,
} from "lucide-react";

// Platform icons as inline SVGs
function XIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function BlueskyIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 600 530"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="m135.72 44.03c66.496 49.921 138.02 151.14 164.28 205.46 26.262-54.316 97.782-155.54 164.28-205.46 47.98-36.021 125.72-63.892 125.72 24.795 0 17.712-10.155 148.79-16.111 170.07-20.703 73.984-96.144 92.854-163.25 81.433 117.3 19.964 147.14 86.092 82.697 152.22-122.39 125.59-175.91-31.511-189.63-71.766-2.514-7.3797-3.6904-10.832-3.7077-7.8964-0.0174-2.9357-1.1937 0.51669-3.7077 7.8964-13.714 40.255-67.233 197.36-189.63 71.766-64.444-66.128-34.605-132.26 82.697-152.22-67.108 11.421-142.55-7.4491-163.25-81.433-5.9562-21.282-16.111-152.36-16.111-170.07 0-88.687 77.742-60.816 125.72-24.795z" />
    </svg>
  );
}

interface SuccessModalProps {
  amount:           number;
  organizationName: string;
  transactionHash:  string;
  isAuthenticated:  boolean;
  anonymous:        boolean;
  bumicertId?:      string;
}

export function SuccessModal({
  amount,
  organizationName,
  transactionHash,
  isAuthenticated,
  anonymous,
  bumicertId,
}: SuccessModalProps) {
  const { hide, popModal, stack } = useModal();
  const [copied, setCopied] = useState(false);

  const baseScanUrl = `https://basescan.org/tx/${transactionHash}`;

  const handleDone = () => {
    if (stack.length === 1) {
      hide().then(() => popModal());
    } else {
      popModal();
    }
  };

  // Share functionality
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const shareUrl = bumicertId
    ? `${baseUrl}${links.bumicert.view(bumicertId)}`
    : `${baseUrl}${links.leaderboard}`;
  const shareText = `I just donated $${amount.toFixed(2)} USDC to support ${organizationName} on Bumicerts!`;

  const handleShareX = () => {
    const text = encodeURIComponent(shareText);
    const url = encodeURIComponent(shareUrl);
    window.open(
      `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const handleShareBluesky = () => {
    const text = encodeURIComponent(`${shareText} ${shareUrl}`);
    window.open(
      `https://bsky.app/intent/compose?text=${text}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      console.error("Failed to copy to clipboard");
    }
  };

  return (
    <ModalContent dismissible={false}>
      <ModalHeader>
        <ModalTitle>Donation Complete! 🎉</ModalTitle>
        <ModalDescription className="sr-only">
          Your donation was successful.
        </ModalDescription>
      </ModalHeader>

      <div className="flex flex-col gap-6">
        {/* Success message */}
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <div className="relative flex items-center justify-center">
            <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center animate-pulse">
              <span className="text-3xl">✓</span>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <p className="font-semibold text-lg">Thank you for your support!</p>
            <p className="text-sm text-muted-foreground">
              ${amount.toFixed(2)} USDC donated to {organizationName}
            </p>
          </div>

          {isAuthenticated && !anonymous && (
            <p className="text-xs text-muted-foreground">
              This donation is linked to your Bumicerts identity.
            </p>
          )}
        </div>

        {/* Share options */}
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium text-center">Share your impact</p>

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
              onClick={handleShareX}
            >
              <XIcon className="size-4" />
              Share on X
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
              onClick={handleShareBluesky}
            >
              <BlueskyIcon className="size-4" />
              Bluesky
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
              onClick={handleCopyLink}
            >
              {copied ? (
                <>
                  <CheckIcon className="size-4 text-green-600" />
                  Copied!
                </>
              ) : (
                <>
                  <CopyIcon className="size-4" />
                  Copy link
                </>
              )}
            </Button>

            <Button variant="outline" size="sm" asChild>
              <a
                href={baseScanUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2"
              >
                <ExternalLinkIcon className="size-4" />
                View tx
              </a>
            </Button>
          </div>
        </div>

        {/* Navigation links */}
        <div className="flex flex-col gap-1 pt-2 border-t border-border">
          {bumicertId && (
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="w-full justify-start"
              onClick={handleDone}
            >
              <Link href={links.bumicert.view(bumicertId)}>
                View bumicert →
              </Link>
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            asChild
            className="w-full justify-start"
            onClick={handleDone}
          >
            <Link href={links.leaderboard} className="flex items-center gap-2">
              <TrophyIcon className="size-4" />
              View leaderboard →
            </Link>
          </Button>
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
