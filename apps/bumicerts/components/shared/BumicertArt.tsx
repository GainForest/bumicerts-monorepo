"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { ProgressiveBlur } from "@/components/ui/progressive-blur";
import { format } from "date-fns";
import { motion } from "framer-motion";

interface BumicertArtProps {
  logoUrl: string | null;
  coverImage: string;
  title: string;
  description?: string;
  objectives: string[];
  startDate?: Date;
  endDate?: Date;
  className?: string;
  performant?: boolean;
}

export function BumicertArt({
  logoUrl,
  coverImage,
  title,
  description,
  objectives,
  startDate,
  endDate,
  className,
  performant = true,
}: BumicertArtProps) {
  return (
    <div className="relative rounded-2xl overflow-hidden bg-background border border-border shadow-lg p-1">
      {/* Cover image section */}
      <div className="relative h-[200px] overflow-hidden rounded-xl">
        <Image
          src={coverImage}
          alt={title}
          fill
          className="object-cover scale-105 group-hover:scale-100 transition-transform duration-700 ease-out mask-b-to-40 mask-b-from-25"
        />


        {/* Soft overlay for muted, editorial look */}
        {/* <div className="absolute inset-0 top-[calc(100%-65px)] bg-linear-to-t from-background via-background to-transparent" /> */}


        {/* Subtle vignette
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.15) 100%)"
          }}
        /> */}

        {/* Logo pill - top left with subtle accent */}
        <div className="absolute top-3 left-3 flex items-center gap-2 bg-background/90 backdrop-blur-md rounded-full p-0.5 shadow-sm">
          {logoUrl && (
            <div className="h-6 w-6 rounded-full overflow-hidden bg-primary/10">
              <Image
                src={logoUrl}
                alt="Logo"
                width={20}
                height={20}
                className="object-cover h-full w-full"
              />
            </div>
          )}
        </div>
      </div>

      {/* Content section - clean white/dark background */}
      <div className="relative py-1 px-2 bg-background -mt-8">

        {/* Subtle bottom accent line with primary color */}
        <div className="w-full h-px mb-2 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

        {/* Title */}
        <h3
          className="text-lg font-light leading-snug text-foreground mb-1 line-clamp-2"
          style={{ fontFamily: "var(--font-garamond-var)" }}
        >
          {title}
        </h3>

        {/* Description */}
        {description && (
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mb-2">
            {description}
          </p>
        )}

        {/* Date range */}
        {(startDate || endDate) && (
          <div className="flex items-center gap-1.5 mb-2">
            <span
              className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground"
            >
              {startDate && format(startDate, "MMM yyyy")}
              {startDate && endDate && (
                <span className="mx-1.5 text-border">—</span>
              )}
              {endDate && format(endDate, "MMM yyyy")}
            </span>
          </div>
        )}


        {/* Objectives as elegant tags */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {objectives.slice(0, 2).map((objective) => (
            <span
              key={objective}
              className="text-[10px] uppercase tracking-[0.08em] text-foreground/60 bg-muted/60 border border-border/50 rounded-full px-2.5 py-1 font-medium"
            >
              {objective}
            </span>
          ))}
          {objectives.length > 2 && (
            <span className="text-[10px] text-muted-foreground">
              +{objectives.length - 2} more
            </span>
          )}
        </div>

      </div>
    </div>
  );
}
