"use client";

import { Copy, Check } from "lucide-react";
import Link from "next/link";
import { blo } from "blo";
import { cn } from "@/lib/utils";
import { useCopy } from "@/hooks/use-copy";
import { useAccountByDid } from "@/hooks/use-account";
import { useProfile, type AtprotoProfile } from "@/hooks/use-profile";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { links } from "@/lib/links";

/**
 * Truncate a DID to a short display format.
 * Example: did:plc:abc123...xyz789
 */
function truncateDid(did: string): string {
  if (did.startsWith("did:")) {
    const parts = did.split(":");
    const id = parts.slice(2).join(":");
    if (id.length > 12) {
      return `${parts[0]}:${parts[1]}:${id.slice(0, 6)}…${id.slice(-4)}`;
    }
  }
  return did;
}

/**
 * Convert a DID to an Ethereum-style address for blo avatar generation.
 * Uses a simple hash to create a consistent 0x address from the DID.
 */
function didToAddress(did: string): `0x${string}` {
  // Simple hash function: sum char codes and create a hex string
  let hash = 0;
  for (let i = 0; i < did.length; i++) {
    hash = ((hash << 5) - hash + did.charCodeAt(i)) | 0;
  }
  // Convert to unsigned 32-bit hex and pad to 40 chars (20 bytes)
  const hex = (hash >>> 0).toString(16).padStart(8, "0");
  // Repeat pattern to make 40 chars
  const address = (hex + hex + hex + hex + hex).slice(0, 40);
  return `0x${address}` as `0x${string}`;
}

export interface UserChipProps {
  /** The DID of the user */
  did: string;
  /** Pre-fetched profile to skip API call (optional) */
  profile?: Pick<AtprotoProfile, "handle" | "displayName" | "avatar">;
  /** Avatar size in pixels (default: 20) */
  avatarSize?: number;
  /** Show avatar (default: true) */
  showAvatar?: boolean;
  /** Show copy button: "always" | "hover" | "never" (default: "hover") */
  showCopyButton?: "always" | "hover" | "never";
  /** Where clicking the chip navigates (default: "bluesky") */
  linkMode?: "user-page" | "bluesky" | "none";
  /** Gap between avatar and label in pixels (default: 4) */
  avatarAndLabelGap?: number;
  /** Custom className */
  className?: string;
  /** Text classname (applies on text) */
  textClassName?: string;
}

/**
 * UserChip — displays an ATProto user's identity in a friendly format.
 *
 * Fetches the user's profile (avatar, displayName, handle) and displays it
 * in a compact, styled chip. Falls back to truncated DID if profile is unavailable.
 *
 * @example
 * ```tsx
 * <UserChip did="did:plc:abc123..." linkMode="bluesky" />
 * ```
 */
export function UserChip({
  did,
  profile: providedProfile,
  avatarSize = 20,
  showAvatar = true,
  showCopyButton = "hover",
  linkMode = "bluesky",
  avatarAndLabelGap = 4,
  className,
  textClassName,
}: UserChipProps) {
  const { copy, isCopied } = useCopy();
  const { data: account, isLoading: accountLoading } = useAccountByDid(did);

  // Fetch profile only if not provided
  const { data: fetchedProfile, isLoading } = useProfile(did, {
    enabled: !providedProfile,
  });

  const profile = providedProfile ?? fetchedProfile;
  const accountDisplayName =
    account?.kind === "user" || account?.kind === "organization"
      ? account.profile.displayName
      : null;
  const displayName =
    accountDisplayName ?? profile?.displayName ?? profile?.handle ?? truncateDid(did);
  const truncatedDid = truncateDid(did);

  // Determine link href
  let href: string | undefined;
  if (linkMode === "user-page") {
    href = links.account.byDid(did);
  } else if (linkMode === "bluesky") {
    href = `https://bsky.app/profile/${did}`;
  }

  const chipContent = (
    <li className="group/user-chip inline-flex items-center justify-between gap-1 rounded-full bg-transparent px-1 py-0.5 text-sm transition-colors">
      <div
        className="flex flex-1 items-center"
        style={{ gap: `${avatarAndLabelGap}px` }}
      >
        {showAvatar && (
          <Avatar
            style={{ height: `${avatarSize}px`, width: `${avatarSize}px` }}
          >
            <AvatarImage
              src={profile?.avatar ?? blo(didToAddress(did))}
              alt={displayName}
            />
            <AvatarFallback>
              <div className="h-full w-full animate-pulse bg-muted-foreground/20" />
            </AvatarFallback>
          </Avatar>
        )}

        <span
          className={cn(
            "min-w-0 flex-1 truncate text-xs relative",
            href &&
              "cursor-pointer group-hover/user-chip:text-primary group-hover/user-chip:underline",
            (isLoading || accountLoading) &&
              "animate-shimmer bg-gradient-to-r from-muted-foreground/60 via-foreground to-muted-foreground/60 bg-[length:200%_100%] bg-clip-text text-transparent",
            textClassName,
          )}
        >
          {isLoading || accountLoading ? truncatedDid : displayName}
        </span>
      </div>

      {showCopyButton !== "never" && (
        <button
          type="button"
          className={cn(
            "opacity-0",
            "flex shrink-0 items-center justify-center rounded-full p-0.5 focus:opacity-100 group-hover/user-chip:opacity-100 hover:text-primary transition-opacity",
          )}
          style={{
            height: `${avatarSize}px`,
            width: `${avatarSize}px`,
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            copy(did);
          }}
          aria-label="Copy DID"
        >
          {isCopied ? (
            <Check size={avatarSize / 2} />
          ) : (
            <Copy size={avatarSize / 2} />
          )}
        </button>
      )}
    </li>
  );

  // Wrap in tooltip to show full DID
  const withTooltip = (
    <TooltipProvider delayDuration={400}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              "inline-flex rounded-full hover:bg-muted/50 transition-colors",
              className,
            )}
          >
            {chipContent}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={8}>
          <span className="font-mono text-xs">{did}</span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  // Wrap in link if linkMode is set
  if (href) {
    return (
      <Link
        href={href}
        target={linkMode === "bluesky" ? "_blank" : undefined}
        rel={linkMode === "bluesky" ? "noopener noreferrer" : undefined}
        className="inline-flex"
      >
        {withTooltip}
      </Link>
    );
  }

  return withTooltip;
}
