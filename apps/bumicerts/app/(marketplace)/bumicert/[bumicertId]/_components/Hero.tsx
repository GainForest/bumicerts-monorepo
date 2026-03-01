"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { format } from "date-fns";
import {
  BadgeCheckIcon,
  ShieldCheckIcon,
  CalendarIcon,
  ArrowRightIcon,
} from "lucide-react";
import { useAdaptiveColors } from "@/hooks/use-adaptive-colors";
import { getStripedBackground } from "@/lib/getStripedBackground";
import type { BumicertData } from "@/lib/types";
import Link from "next/link";

export function BumicertHero({ bumicert }: { bumicert: BumicertData }) {
  const { background, foreground, backgroundMuted } = useAdaptiveColors(
    bumicert.coverImageUrl
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="w-full flex flex-col overflow-hidden"
    >
      {/* Verification stamp row */}
      <div className="w-full flex items-center justify-between py-1.5 px-3 bg-green-500/5 border-b border-green-500/10">
        <div className="flex items-center gap-1.5">
          <span className="flex items-center gap-1 bg-green-500/10 text-green-700 dark:text-green-400 rounded-full px-2 py-0.5 text-xs font-medium">
            <BadgeCheckIcon className="h-3 w-3" />
            Listed on the homepage
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="flex items-center gap-1 bg-green-500/10 text-green-700 dark:text-green-400 rounded-full px-2 py-0.5 text-xs font-medium">
            <ShieldCheckIcon className="h-3 w-3" />
            Backed by 3 proofs of impact
          </span>
        </div>
      </div>

      {/* Main hero: adaptive-color striped background */}
      <div
        className="w-full grid grid-cols-1 md:grid-cols-[1fr_280px]"
        style={{
          background: getStripedBackground(
            `${background}ff`,
            `${background}f8`,
            10,
            -15
          ),
          color: foreground,
        }}
      >
        {/* Left: metadata */}
        <div className="flex flex-col items-start justify-between gap-5 p-5 md:p-6">
          <div className="flex flex-col items-start gap-3">
            {/* Creator */}
            <div
              className="flex items-center gap-2"
              style={{ color: `${foreground}90` }}
            >
              <span className="bg-black/10 dark:bg-white/10 rounded-full text-xs px-2.5 h-6 flex items-center backdrop-blur-sm">
                Created{" "}
                {format(new Date(bumicert.createdAt), "MMM d, y")}
              </span>
              <span className="text-xs">by</span>
              <Link
                href={`/organization/${encodeURIComponent(bumicert.organizationDid)}`}
                className="flex items-center gap-1.5 bg-black/10 dark:bg-white/10 hover:bg-black/15 rounded-full text-xs px-2.5 h-6 backdrop-blur-sm transition-colors"
                style={{ color: `${foreground}95` }}
              >
                <div className="h-4 w-4 rounded-full overflow-hidden bg-muted">
                  {bumicert.logoUrl && (
                    <Image
                      src={bumicert.logoUrl}
                      alt={bumicert.organizationName}
                      width={16}
                      height={16}
                      className="object-cover"
                    />
                  )}
                </div>
                {bumicert.organizationName}
              </Link>
            </div>

            {/* Title in Baskervville */}
            <h1
              className="font-serif text-2xl md:text-3xl font-bold leading-tight"
              style={{ color: foreground }}
            >
              {bumicert.title}
            </h1>
          </div>

          <div className="w-full">
            {/* Date range */}
            <div
              className="flex items-center gap-1.5 text-sm"
              style={{ color: `${foreground}80` }}
            >
              <CalendarIcon className="h-3.5 w-3.5" />
              {bumicert.startDate && <span>{format(new Date(bumicert.startDate), "MMM d, y")}</span>}
              {bumicert.startDate && bumicert.endDate && <ArrowRightIcon className="h-3 w-3" />}
              {bumicert.endDate && <span>{format(new Date(bumicert.endDate), "MMM d, y")}</span>}
            </div>

            {/* Work scope tags */}
            <div className="flex items-center gap-2 flex-wrap mt-3">
              {bumicert.objectives.map((obj) => (
                <span
                  key={obj}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium"
                  style={{
                    background: backgroundMuted,
                    color: `${foreground}90`,
                  }}
                >
                  {obj}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Right: cover image */}
        <div className="min-h-60 md:min-h-72 relative p-2">
          <div className="absolute inset-2 overflow-hidden rounded-3xl">
            {bumicert.coverImageUrl ? (
              <Image
                src={bumicert.coverImageUrl}
                alt={bumicert.title}
                fill
                className="object-cover"
                style={{
                  viewTransitionName: `bumicert-img-${bumicert.id.replace(/[^a-z0-9]/gi, "-")}`,
                }}
              />
            ) : (
              <div className="absolute inset-0 bg-muted rounded-3xl" />
            )}
            {/* Inner shadow vignette using extracted background color */}
            <div
              className="absolute inset-0 rounded-3xl"
              style={{
                boxShadow: `inset 0px 0px 2rem 1.5rem ${background}`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Progress / Not listed */}
      <div className="flex items-center justify-center gap-2 p-3 text-xs text-muted-foreground border-t border-border bg-muted/20">
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30" />
        <span>This bumicert is not yet listed for sale.</span>
      </div>
    </motion.div>
  );
}
