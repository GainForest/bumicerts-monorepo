"use client";

import { cn } from "@/lib/utils";
import Image from "next/image";

/** Resolves a coverImage that is either a URL string or a File (create flow). */
function resolveImageSrc(coverImage: File | string): string {
  return typeof coverImage === "string"
    ? coverImage
    : URL.createObjectURL(coverImage);
}

// Item variants for stagger - using design system's smooth ease
export const cardVariants = {
  hidden: {
    opacity: 0,
    y: 20,
    filter: "blur(4px)",
  },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      duration: 0.6,
      ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
    },
  },
};

export interface BumicertCardVisualProps {
  coverImage: File | string | null;
  logoUrl: string | null;
  title: string;
  organizationName: string;
  objectives: string[];
  description?: string;
  className?: string;
}

export function BumicertCardVisual({
  coverImage,
  logoUrl,
  title,
  organizationName,
  objectives,
  description,
  className,
}: BumicertCardVisualProps) {
  const imageSrc = coverImage ? resolveImageSrc(coverImage) : null;

  const objectivesToDisplay = [
    objectives[0],
    objectives.length > 1 ? `+${objectives.length - 1}` : null,
  ].filter((o) => o !== null);

  return (
    <div
      className={cn(
        "relative rounded-2xl border border-border bg-card overflow-hidden w-full flex flex-col",
        className,
      )}
    >
      <div className="relative aspect-4/3 overflow-hidden z-0">
        {imageSrc ? (
          <Image src={imageSrc} alt={title} fill className="object-cover" />
        ) : (
          <div className="absolute inset-0 bg-muted" />
        )}
      </div>
      <div className="relative px-4 py-3 -mt-6 z-1 flex-1 flex flex-col justify-between">
        <div className="absolute -top-2 left-0 right-0 h-8 bg-linear-to-b from-transparent via-background/65 to-background z-0"></div>
        <div>
          <h3
            className="relative text-2xl font-semibold text-foreground leading-snug line-clamp-1 z-1"
            style={{ fontFamily: "var(--font-garamond-var)" }}
          >
            {title}
          </h3>
          {description && (
            <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed line-clamp-3">
              {description}
            </p>
          )}
        </div>
        {/* Objective chips */}
        <div className="w-full flex items-center gap-2 flex-wrap mt-4">
          {objectivesToDisplay.map((obj) => {
            return (
              <span
                key={obj}
                className={cn(
                  "text-sm text-muted-foreground bg-muted rounded-full px-2.5 py-1 font-medium",
                  obj.startsWith("+") && "text-foreground",
                )}
              >
                {obj}
              </span>
            );
          })}
        </div>
      </div>

      {/* Header overlay */}
      <div className="absolute top-2 left-2 bg-background/70 rounded-full p-1 pr-3 backdrop-blur-lg shadow-lg flex items-center gap-1 min-w-0">
        <div className="relative h-6 w-6 rounded-full bg-white border border-black/10 shadow-sm overflow-hidden shrink-0">
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt={organizationName}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center text-[8px] font-bold text-muted-foreground">
              {organizationName.charAt(0)}
            </div>
          )}
        </div>
        <span className="text-xs font-medium text-foreground text-shadow-md">
          {organizationName.length > 22
            ? organizationName.slice(0, 20) + "..."
            : organizationName}
        </span>
      </div>

      {/* Legacy Header overlay - kept for rolling back */}
      {/*<div className="absolute top-0 left-0 right-0 h-11 bg-linear-to-b from-background via-background/70 to-transparent" />
      <div className="absolute top-0 left-0 right-0 h-11 flex items-center px-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-6 w-6 rounded-full bg-white border border-black/10 shadow-sm overflow-hidden shrink-0">
            {logoUrl ? (
              <Image
                src={logoUrl}
                alt={organizationName}
                width={24}
                height={24}
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center text-[8px] font-bold text-muted-foreground">
                {organizationName.charAt(0)}
              </div>
            )}
          </div>
          <span className="text-xs font-medium text-foreground truncate drop-shadow-md">
            {organizationName}
          </span>
        </div>
      </div>*/}

      {/* Footer */}
    </div>
  );
}

export function BumicertCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      {/* Image area — matches aspect-4/3 of the real card */}
      <div className="relative aspect-4/3 overflow-hidden bg-muted animate-pulse">
        {/* Logo + org name pill — top-left, same position as real card */}
        <div className="absolute top-2 left-2 bg-background/70 rounded-full p-1 pr-3 flex items-center gap-1">
          <div className="h-6 w-6 rounded-full bg-muted animate-pulse" />
          <div className="h-3 w-20 rounded-full bg-muted animate-pulse" />
        </div>
      </div>

      {/* Content area — mirrors -mt-6 px-4 py-3 of the real card */}
      <div className="px-4 py-3 -mt-6 relative z-1 space-y-2">
        {/* Title */}
        <div className="h-7 w-3/4 rounded bg-muted animate-pulse" />
        {/* Description lines */}
        <div className="h-4 w-full rounded bg-muted animate-pulse" />
        <div className="h-4 w-2/3 rounded bg-muted animate-pulse" />
        {/* Chips */}
        <div className="flex gap-2 pt-1">
          <div className="h-6 w-16 rounded-full bg-muted animate-pulse" />
          <div className="h-6 w-10 rounded-full bg-muted animate-pulse" />
        </div>
      </div>
    </div>
  );
}
