"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDownIcon, UsersIcon, MapPinIcon, TargetIcon } from "lucide-react";
import { format } from "date-fns";
import type { BumicertData } from "@/lib/types";

// ── Section label ─────────────────────────────────────────────────────────────

function SectionLabel({ icon: Icon, label }: { icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="h-4 w-4 text-primary" />
      <span className="text-xs uppercase tracking-[0.15em] text-muted-foreground font-medium">
        {label}
      </span>
    </div>
  );
}

// ── Collapsible description ───────────────────────────────────────────────────

function CollapsibleDescription({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const THRESHOLD = 600;
  const isLong = text.length > THRESHOLD;
  const displayText = isLong && !expanded ? text.slice(0, THRESHOLD) + "…" : text;
  const paragraphs = displayText.split(/\n\n+/).filter(Boolean);

  return (
    <div>
      <div className="space-y-4">
        {paragraphs.map((para, i) => (
          <p key={i} className="text-base leading-relaxed text-foreground/80">{para}</p>
        ))}
      </div>
      {isLong && (
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => setExpanded((v) => !v)}
          className="mt-4 flex items-center gap-1.5 text-primary text-sm font-medium hover:opacity-75 transition-opacity cursor-pointer"
        >
          <AnimatePresence mode="wait" initial={false}>
            {expanded ? (
              <motion.span key="less" initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -3 }} transition={{ duration: 0.15 }}>
                Show less
              </motion.span>
            ) : (
              <motion.span key="more" initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -3 }} transition={{ duration: 0.15 }}>
                Read more
              </motion.span>
            )}
          </AnimatePresence>
          <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDownIcon className="h-4 w-4" />
          </motion.div>
        </motion.button>
      )}
    </div>
  );
}

// ── Site boundaries placeholder ───────────────────────────────────────────────

function SiteBoundariesCard({ country }: { country: string }) {
  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="relative h-40 bg-muted/20 flex items-center justify-center">
        <div
          className="absolute inset-0"
          style={{ background: "radial-gradient(ellipse at 38% 62%, oklch(0.45 0.08 160 / 0.12) 0%, transparent 55%), radial-gradient(ellipse at 68% 30%, oklch(0.5 0.06 150 / 0.08) 0%, transparent 48%)" }}
        />
        <div className="relative flex flex-col items-center gap-2 text-muted-foreground/50">
          <MapPinIcon className="h-10 w-10" />
          {country && <span className="text-xs font-medium tracking-wide uppercase">{country}</span>}
        </div>
      </div>
      <div className="px-4 py-3 flex items-center justify-between bg-muted/10 border-t border-border">
        <span className="text-xs text-muted-foreground">Site boundaries</span>
        <button className="text-xs text-primary font-medium hover:opacity-75 transition-opacity cursor-pointer">
          View GeoJSON →
        </button>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function BumicertSections({ bumicert }: { bumicert: BumicertData }) {
  return (
    <div className="space-y-8 py-1">

      {/* ── Description ─────────────────────────────────────────────────── */}
      <motion.section
        id="description"
        className="scroll-mt-24"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <SectionLabel icon={TargetIcon} label="Description" />
        {bumicert.description ? (
          <CollapsibleDescription text={bumicert.description} />
        ) : (
          <p className="text-base text-muted-foreground leading-relaxed">No description provided.</p>
        )}

        {/* Contributors */}
        {bumicert.contributors.length > 0 && (
          <div className="mt-6">
            <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent mb-5" />
            <SectionLabel icon={UsersIcon} label="Contributors" />
            <div className="flex flex-col gap-1">
              {bumicert.contributors.map((c, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: i * 0.06, ease: [0.25, 0.1, 0.25, 1] }}
                  className="flex items-center gap-3 py-2 border-b border-border/60 last:border-0"
                >
                  <div className="h-7 w-7 rounded-full bg-muted border border-border flex items-center justify-center shrink-0">
                    <span className="text-xs font-medium text-muted-foreground" style={{ fontFamily: "var(--font-garamond-var)" }}>
                      {c.identity.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="text-sm text-foreground/80">{c.identity}</span>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Date posted */}
        {bumicert.createdAt && (
          <p className="mt-6 text-xs text-muted-foreground">
            Posted {format(new Date(bumicert.createdAt), "MMMM d, yyyy")}
          </p>
        )}
      </motion.section>

      {/* Separator */}
      <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      {/* ── Site Boundaries ──────────────────────────────────────────────── */}
      <motion.section
        id="site-boundaries"
        className="scroll-mt-24"
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <SectionLabel icon={MapPinIcon} label="Site Boundaries" />
        <SiteBoundariesCard country={bumicert.country} />
      </motion.section>

    </div>
  );
}
