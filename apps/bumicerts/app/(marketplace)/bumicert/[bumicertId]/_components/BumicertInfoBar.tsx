"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Share2Icon, CheckIcon, BuildingIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { BumicertData } from "@/lib/types";
import { links } from "@/lib/links";

function ShareButton() {
  const [copied, setCopied] = useState(false);
  function handleShare() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <motion.button
      onClick={handleShare}
      whileTap={{ scale: 0.94 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border/60 bg-background/80 backdrop-blur-sm cursor-pointer hover:bg-muted/60 transition-colors shrink-0"
      aria-label="Copy link"
    >
      <AnimatePresence mode="wait" initial={false}>
        {copied ? (
          <motion.span key="check" initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.7 }} transition={{ duration: 0.15 }} className="flex items-center gap-1.5">
            <CheckIcon className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="text-xs font-medium text-primary">Copied!</span>
          </motion.span>
        ) : (
          <motion.span key="share" initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.7 }} transition={{ duration: 0.15 }} className="flex items-center gap-1.5">
            <Share2Icon className="h-3.5 w-3.5 text-foreground/60 shrink-0" />
            <span className="text-xs font-medium text-foreground/60">Share</span>
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

/** Avatar + org name + time ago + share button */
export function BumicertCreationMeta({ bumicert }: { bumicert: BumicertData }) {
  const createdAgo = bumicert.createdAt
    ? formatDistanceToNow(new Date(bumicert.createdAt), { addSuffix: true })
    : null;

  return (
    <div className="flex items-center gap-3">
      {/* Avatar */}
      <Link href={links.account.byDid(bumicert.organizationDid)} className="shrink-0">
        <div className="h-9 w-9 rounded-full overflow-hidden bg-muted border border-border">
          {bumicert.logoUrl ? (
            <Image src={bumicert.logoUrl} alt={bumicert.organizationName} width={36} height={36} className="object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <BuildingIcon className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
        </div>
      </Link>

      {/* Name + time */}
      <Link href={links.account.byDid(bumicert.organizationDid)} className="flex flex-col min-w-0 group">
        <span className="text-sm font-medium text-foreground leading-tight group-hover:text-primary transition-colors truncate">
          {bumicert.organizationName}
        </span>
        {createdAgo && (
          <span className="text-xs text-muted-foreground leading-tight">{createdAgo}</span>
        )}
      </Link>

      {/* Share — pushed to end */}
      <div className="ml-auto">
        <ShareButton />
      </div>
    </div>
  );
}

/** Objective chips only — title lives in the main content (DescriptionTab) above the description */
export function BumicertMeta({ bumicert }: { bumicert: BumicertData }) {
  if (bumicert.objectives.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {bumicert.objectives.map((obj) => (
        <span key={obj} className="text-[10px] uppercase tracking-[0.08em] text-foreground/60 bg-muted/60 border border-border/50 rounded-full px-2.5 py-0.5 font-medium">
          {obj}
        </span>
      ))}
    </div>
  );
}
