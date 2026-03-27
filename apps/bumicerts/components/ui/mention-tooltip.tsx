"use client";

/**
 * MentionTooltip — hover card shown over @mention links in richtext.
 *
 * On hover:
 *   1. Fetches basic profile from Bluesky public API (avatar, displayName, handle)
 *   2. Asynchronously checks if the DID is indexed as a Gainforest organization
 *   3. If it is, shows a "View organization profile" link to /organization/{did}
 *
 * Both fetches are gated on hover (not on mount) so there's no cold-load cost.
 * Results are cached by React Query for 5 minutes.
 */

import { useState, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { BuildingIcon, ExternalLinkIcon, ArrowRightIcon } from "lucide-react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { links } from "@/lib/links";

// ── Data fetchers ─────────────────────────────────────────────────────────────

interface BskyProfile {
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
  description?: string;
}

async function fetchBskyProfile(did: string): Promise<BskyProfile | null> {
  try {
    const url = new URL(
      "https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile",
    );
    url.searchParams.set("actor", did);
    const res = await fetch(url.toString());
    if (!res.ok) return null;
    return (await res.json()) as BskyProfile;
  } catch {
    return null;
  }
}

async function fetchIsOrganization(did: string): Promise<boolean> {
  try {
    const url = new URL("/api/check-organization", window.location.origin);
    url.searchParams.set("did", did);
    const res = await fetch(url.toString());
    if (!res.ok) return false;
    const data = (await res.json()) as { isOrganization: boolean };
    return data.isOrganization;
  } catch {
    return false;
  }
}

// ── Tooltip card content ──────────────────────────────────────────────────────

interface MentionCardProps {
  did: string;
  handle: string;
}

function MentionCard({ did, handle }: MentionCardProps) {
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["bsky-profile", did],
    queryFn: () => fetchBskyProfile(did),
    retry: false,
  });

  const { data: isOrg } = useQuery({
    queryKey: ["is-gainforest-org", did],
    queryFn: () => fetchIsOrganization(did),
    retry: false,
  });

  const displayName = profile?.displayName ?? handle;
  const resolvedHandle = profile?.handle ?? handle;

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

      {/* View on Bluesky — always available */}
      <a
        href={`https://bsky.app/profile/${did}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ExternalLinkIcon className="h-3 w-3 shrink-0" />
        View on Bluesky
      </a>

      {/* View organization profile — only if indexed */}
      {isOrg && (
        <Link
          href={links.organization.home(did)}
          className="flex items-center justify-between w-full rounded-md px-3 py-2 bg-primary/10 hover:bg-primary/20 transition-colors text-xs font-medium text-primary"
        >
          View organization profile
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
