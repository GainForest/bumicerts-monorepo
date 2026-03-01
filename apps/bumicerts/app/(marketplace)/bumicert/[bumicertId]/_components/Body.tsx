"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { ChevronDownIcon, MapPinIcon } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import type { BumicertData } from "@/lib/types";

function CollapsibleDescription({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > 400;
  const displayText = isLong && !expanded ? text.slice(0, 400) + "…" : text;

  const paragraphs = displayText.split("\n\n").filter(Boolean);

  return (
    <div>
      <div className="prose prose-sm max-w-none text-foreground leading-relaxed">
        {paragraphs.map((para, i) => (
          <p key={i} className="mb-4 last:mb-0 text-base leading-relaxed">
            {para}
          </p>
        ))}
      </div>

      {isLong && (
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 flex items-center gap-1 text-primary text-sm font-medium hover:opacity-80 transition-opacity cursor-pointer"
        >
          <AnimatePresence mode="wait">
            {expanded ? (
              <motion.span
                key="less"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
              >
                Show less
              </motion.span>
            ) : (
              <motion.span
                key="more"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
              >
                Read more
              </motion.span>
            )}
          </AnimatePresence>
          <motion.div
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.25 }}
          >
            <ChevronDownIcon className="h-4 w-4" />
          </motion.div>
        </motion.button>
      )}
    </div>
  );
}

function SiteBoundariesPlaceholder({ country }: { country: string }) {
  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="h-48 bg-muted/30 relative flex items-center justify-center">
        {/* Simulated satellite-style gradient */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at 40% 60%, oklch(0.35 0.06 160 / 0.15) 0%, transparent 60%), radial-gradient(ellipse at 70% 30%, oklch(0.4 0.05 150 / 0.1) 0%, transparent 50%)",
          }}
        />
        <div className="relative flex flex-col items-center gap-2 text-muted-foreground/60">
          <MapPinIcon className="h-8 w-8" />
          <span className="text-xs font-medium">{country}</span>
        </div>
      </div>
      <div className="px-3 py-2 flex items-center justify-between bg-muted/20 border-t border-border">
        <span className="text-xs text-muted-foreground">Site boundaries</span>
        <button className="text-xs text-primary font-medium hover:opacity-80 transition-opacity cursor-pointer">
          View GeoJSON →
        </button>
      </div>
    </div>
  );
}

export function BumicertBody({ bumicert }: { bumicert: BumicertData }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
      className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8 p-5 md:p-6"
    >
      {/* Left: description */}
      <div>
        <h2 className="font-serif text-2xl font-bold mb-4">
          About this project
        </h2>
        <CollapsibleDescription text={bumicert.description} />
      </div>

      {/* Right: metadata + map */}
      <div className="flex flex-col gap-4">
        <SiteBoundariesPlaceholder country={bumicert.country} />

        {/* Metadata chip */}
        <div className="rounded-xl border border-border p-4 bg-muted/10 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Country</span>
            <span className="font-medium">{bumicert.country}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Organization</span>
            <span className="font-medium">{bumicert.organizationName}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Objectives</span>
            <span className="font-medium text-right max-w-[160px]">
              {bumicert.objectives.join(", ")}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
