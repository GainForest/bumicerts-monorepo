"use client";

/**
 * MentionTooltip — hover card shown over @mention links in richtext.
 *
 * On hover:
 *   1. Fetches basic profile from Bluesky public API (avatar, displayName, handle)
 *   2. Asynchronously checks the Bumicerts account state via typed indexer tRPC
 *   3. If it is an onboarded user or organization, shows a link to the internal account route
 *
 * Both fetches are gated on hover (not on mount) so there's no cold-load cost.
 * Results are cached by React Query for 5 minutes.
 */

import { useState, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { BuildingIcon, ExternalLinkIcon, ArrowRightIcon } from "lucide-react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { useAccountByDid } from "@/hooks/use-account";
import { useProfile } from "@/hooks/use-profile";
import { links } from "@/lib/links";

// ── Tooltip card content ──────────────────────────────────────────────────────

interface MentionCardProps {
  did: string;
  handle: string;
}

function MentionCard({ did, handle }: MentionCardProps) {
  const { data: profile, isLoading: profileLoading } = useProfile(did);
  const { data: account } = useAccountByDid(did);

  const accountDisplayName =
    account?.kind === "user" || account?.kind === "organization"
      ? account.profile.displayName
      : null;
  const displayName = accountDisplayName ?? profile?.displayName ?? handle;
  const resolvedHandle = profile?.handle ?? handle;
  const hasInternalAccountLink =
    account?.kind === "user" || account?.kind === "organization";

  return (
    <div className="w-64 space-y-3">
      {/* Avatar + identity */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 shrink-0 rounded-full overflow-hidden bg-muted flex items-center justify-center border border-border">
          {profile?.avatar ? (
            <Image
              src={profile.avatar}
              alt={displayName}
              width={40}
              height={40}
              className="object-cover"
            />
          ) : (
            <BuildingIcon className="h-5 w-5 text-muted-foreground" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          {profileLoading ? (
            <div className="space-y-1.5">
              <div className="h-3.5 w-28 rounded bg-muted animate-pulse" />
              <div className="h-3 w-20 rounded bg-muted animate-pulse" />
            </div>
          ) : (
            <>
              <p className="font-medium text-sm text-foreground truncate leading-tight">
                {displayName}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                @{resolvedHandle}
              </p>
            </>
          )}
        </div>
      </div>

      {/* View on Certified — always available */}
      <a
        href={links.external.certifiedApp.profileUrl(did)}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ExternalLinkIcon className="h-3 w-3 shrink-0" />
        View on Certified
      </a>

      {/* View account profile for onboarded user and organization accounts */}
      {hasInternalAccountLink && (
        <Link
          href={links.account.byDid(did)}
          className="flex items-center justify-between w-full rounded-md px-3 py-2 bg-primary/10 hover:bg-primary/20 transition-colors text-xs font-medium text-primary"
        >
          View account profile
          <ArrowRightIcon className="h-3.5 w-3.5 shrink-0" />
        </Link>
      )}
    </div>
  );
}

// ── Public component ──────────────────────────────────────────────────────────

export interface MentionTooltipProps {
  did: string;
  handle: string;
  children: ReactNode;
}

export function MentionTooltip({ did, handle, children }: MentionTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <TooltipProvider delayDuration={400}>
      <Tooltip open={isOpen} onOpenChange={setIsOpen}>
        <TooltipTrigger asChild>
          {/*
           * TooltipTrigger expects a single focusable child.
           * We wrap in a <span> so the <a> inside children is the real link.
           */}
          <span
            className="inline cursor-pointer"
            onMouseEnter={() => setIsOpen(true)}
            onMouseLeave={() => setIsOpen(false)}
            onFocus={() => setIsOpen(true)}
            onBlur={() => setIsOpen(false)}
          >
            {children}
          </span>
        </TooltipTrigger>

        <TooltipContent
          side="top"
          sideOffset={8}
          className="bg-card text-foreground border border-border shadow-lg rounded-xl px-4 py-3 w-auto max-w-none"
          onMouseEnter={() => setIsOpen(true)}
          onMouseLeave={() => setIsOpen(false)}
        >
          <MentionCard did={did} handle={handle} />
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
