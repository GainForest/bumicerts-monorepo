"use client";

import { MapPinIcon, GlobeIcon, CalendarIcon, EyeIcon, ChevronRightIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { OrganizationData } from "@/lib/types";
import Link from "next/link";

// Country code to emoji + name (minimal set for mock data)
const COUNTRY_MAP: Record<string, { emoji: string; name: string }> = {
  ID: { emoji: "🇮🇩", name: "Indonesia" },
  KE: { emoji: "🇰🇪", name: "Kenya" },
  CO: { emoji: "🇨🇴", name: "Colombia" },
  BR: { emoji: "🇧🇷", name: "Brazil" },
  PH: { emoji: "🇵🇭", name: "Philippines" },
};

interface StatChipProps {
  Icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  emoji?: string;
  isEditing?: boolean;
  onClick?: () => void;
}

function StatChip({ Icon, label, value, emoji, isEditing, onClick }: StatChipProps) {
  return (
    <div
      className={cn(
        "flex-1 min-w-0 bg-muted/50 rounded-xl p-3 flex flex-col justify-between relative overflow-hidden",
        isEditing && "hover:bg-muted/70 cursor-pointer transition-colors"
      )}
      onClick={isEditing ? onClick : undefined}
    >
      <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
        <Icon className="h-3.5 w-3.5 shrink-0" />
        <span>{label}</span>
      </div>
      <div className="text-sm font-semibold mt-1 text-foreground truncate">
        {value}
      </div>

      {/* Emoji watermark */}
      {emoji && (
        <span className="absolute top-1 right-2 text-5xl opacity-[0.08] pointer-events-none select-none leading-none">
          {emoji}
        </span>
      )}

      {/* Edit chevron */}
      <AnimatePresence>
        {isEditing && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            className="absolute bottom-2 right-2 h-5 w-5 rounded-full bg-foreground/10 flex items-center justify-center"
          >
            <ChevronRightIcon className="h-3 w-3" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface OrgSubHeroProps {
  organization: OrganizationData;
  isEditing: boolean;
}

export function OrgSubHero({ organization, isEditing }: OrgSubHeroProps) {
  const countryData = COUNTRY_MAP[organization.country];

  return (
    <div className="flex flex-wrap items-stretch gap-2 px-4 md:px-5 -mt-5 relative z-10">
      <StatChip
        Icon={MapPinIcon}
        label="Country of origin"
        value={
          <span className="flex items-center gap-1">
            {countryData?.name ?? organization.country}
          </span>
        }
        emoji={countryData?.emoji}
        isEditing={isEditing}
      />
      <StatChip
        Icon={GlobeIcon}
        label="Website"
        value={
          organization.website ? (
            <Link
              href={organization.website}
              target="_blank"
              className="text-primary hover:underline"
              onClick={(e) => isEditing && e.preventDefault()}
            >
              {organization.website.replace(/^https?:\/\//, "").slice(0, 20)}
              {organization.website.length > 20 ? "…" : ""}
            </Link>
          ) : (
            <span className="text-muted-foreground text-xs italic">Not defined</span>
          )
        }
        isEditing={isEditing}
      />
      <StatChip
        Icon={CalendarIcon}
        label="Date started"
        value={
          organization.startDate ? (
            new Date(organization.startDate).toLocaleDateString("en-US", {
              month: "short",
              year: "numeric",
            })
          ) : (
            <span className="text-muted-foreground text-xs italic">Not defined</span>
          )
        }
        isEditing={isEditing}
      />
      <StatChip
        Icon={EyeIcon}
        label="Visibility"
        value="Public"
        isEditing={isEditing}
      />
    </div>
  );
}
