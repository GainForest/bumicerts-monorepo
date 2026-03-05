"use client";

import { motion } from "framer-motion";
import Image from "next/image";

/** Resolves a coverImage that is either a URL string or a File (create flow). */
function resolveImageSrc(coverImage: File | string): string {
  return typeof coverImage === "string" ? coverImage : URL.createObjectURL(coverImage);
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

  return (
    <div className={`rounded-2xl border border-border bg-card overflow-hidden w-full${className ? ` ${className}` : ""}`}>
      <div className="relative aspect-[3/4] overflow-hidden">
        {imageSrc ? (
          <Image src={imageSrc} alt={title} fill className="object-cover" />
        ) : (
          <div className="absolute inset-0 bg-muted" />
        )}

        {/* Header overlay */}
        <div className="absolute top-0 left-0 right-0 h-11 bg-linear-to-b from-background via-background/70 to-transparent" />
        <div className="absolute top-0 left-0 right-0 h-11 flex items-center px-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-6 w-6 rounded-full bg-white border border-black/10 shadow-sm overflow-hidden shrink-0">
              {logoUrl ? (
                <Image src={logoUrl} alt={organizationName} width={24} height={24} className="object-cover" />
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
        </div>

        {/* Objective chips */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2 flex-wrap">
          {objectives.slice(0, 2).map((obj) => (
            <span key={obj} className="text-[10px] uppercase tracking-[0.08em] text-foreground bg-background/40 backdrop-blur-md rounded-full px-2.5 py-1 font-medium">
              {obj}
            </span>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-border">
        <h3 className="text-base font-semibold text-foreground leading-snug line-clamp-1" style={{ fontFamily: "var(--font-garamond-var)" }}>
          {title}
        </h3>
        {description && (
          <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed line-clamp-2">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}

export function BumicertCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="relative aspect-[3/4]">
        {/* Image skeleton */}
        <div className="absolute inset-0 bg-gradient-to-r from-muted via-muted/50 to-muted bg-[length:200%_100%] animate-shimmer" />

        {/* Dotted header skeleton */}
        <div
          className="absolute top-0 left-0 right-0 h-11 flex items-center justify-between px-3"
          style={{
            background: "linear-gradient(to bottom, oklch(var(--background) / 0.85) 0%, oklch(var(--background) / 0.7) 100%)",
            backgroundImage: `radial-gradient(circle, oklch(var(--foreground) / 0.06) 1px, transparent 1px)`,
            backgroundSize: "6px 6px",
          }}
        >
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-full bg-muted animate-pulse" />
            <div className="h-3 w-20 rounded bg-muted animate-pulse" />
          </div>
          <div className="h-2.5 w-14 rounded bg-muted animate-pulse" />
        </div>

        {/* Tags skeleton */}
        <div className="absolute bottom-3 left-3 flex gap-2">
          <div className="h-5 w-16 rounded-full bg-muted/60 animate-pulse" />
          <div className="h-5 w-20 rounded-full bg-muted/60 animate-pulse" />
        </div>
      </div>

      {/* Footer skeleton */}
      <div className="px-4 py-4 border-t border-border space-y-2">
        <div className="h-5 w-3/4 rounded bg-muted animate-pulse" />
        <div className="h-4 w-full rounded bg-muted animate-pulse" />
        <div className="h-4 w-2/3 rounded bg-muted animate-pulse" />
      </div>
    </div>
  );
}
