"use client";

import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { BadgeCheckIcon, PencilIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OrganizationData } from "@/lib/types";

interface OrgHeroProps {
  organization: OrganizationData;
  isEditing: boolean;
  onEditName?: (name: string) => void;
  editingName?: string;
}

export function OrgHero({
  organization,
  isEditing,
  onEditName,
  editingName,
}: OrgHeroProps) {
  const displayName = isEditing && editingName !== undefined ? editingName : organization.displayName;

  return (
    <div className="w-full h-64 md:h-72 rounded-t-2xl overflow-hidden relative">
      {/* Cover image */}
      {organization.coverImageUrl ? (
        <Image
          src={organization.coverImageUrl}
          alt={organization.displayName}
          fill
          className="object-cover"
          priority
        />
      ) : (
        <div className="absolute inset-0 bg-muted" />
      )}

      {/* Gradient overlay blending into background */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-background/95" />

      {/* Logo — frosted glass pill */}
      <div className="absolute top-3 left-3">
        <motion.div
          whileHover={isEditing ? { scale: 1.05 } : {}}
          className={cn(
            "relative flex items-center gap-2 px-1.5 py-1 rounded-full bg-background/60 backdrop-blur-xl border border-white/20 shadow-lg",
            isEditing && "cursor-pointer"
          )}
        >
          <div className="h-8 w-8 rounded-full overflow-hidden bg-muted relative">
            {organization.logoUrl ? (
              <Image
                src={organization.logoUrl}
                alt={organization.displayName}
                fill
                className={cn("object-cover", isEditing && "blur-[1px]")}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs font-bold">
                {organization.displayName.charAt(0)}
              </div>
            )}
            <AnimatePresence>
              {isEditing && (
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0 }}
                  className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center"
                >
                  <PencilIcon className="h-3.5 w-3.5 text-white" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <AnimatePresence>
            {isEditing && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                className="text-xs font-medium pr-1 overflow-hidden whitespace-nowrap"
              >
                Logo
              </motion.span>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Edit cover button */}
      <AnimatePresence>
        {isEditing && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, filter: "blur(4px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 0.8, filter: "blur(4px)" }}
            className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background/60 backdrop-blur-xl border border-white/20 shadow-lg text-xs font-medium cursor-pointer hover:bg-background/80 transition-colors"
          >
            <PencilIcon className="h-3 w-3" />
            Cover Image
          </motion.button>
        )}
      </AnimatePresence>

      {/* Bottom: Name + description */}
      <div className="absolute bottom-0 left-0 right-0 p-4 md:p-5">
        <div className="flex items-start gap-2">
          <BadgeCheckIcon className="h-7 w-7 shrink-0 mt-0.5 text-foreground/80" />
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <input
                type="text"
                value={editingName ?? organization.displayName}
                onChange={(e) => onEditName?.(e.target.value)}
                className="font-garamond text-2xl md:text-3xl font-bold bg-transparent border-b-2 border-primary focus:outline-none w-full text-foreground"
                style={{ fontFamily: "var(--font-garamond-var)" }}
              />
            ) : (
              <h1
                className="text-2xl md:text-3xl font-bold text-foreground leading-tight"
                style={{ fontFamily: "var(--font-garamond-var)" }}
              >
                {displayName}
              </h1>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
