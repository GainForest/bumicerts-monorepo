"use client";

import { motion } from "framer-motion";
import { UsersIcon, TargetIcon } from "lucide-react";
import { format } from "date-fns";
import type { BumicertData } from "@/lib/types";
import { LeafletRenderer } from "@/components/ui/leaflet-renderer";

// ── Section label ──────────────────────────────────────────────────────────────

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

// ── Main ──────────────────────────────────────────────────────────────────────

export function DescriptionTab({ bumicert }: { bumicert: BumicertData }) {
  const hasDescription = bumicert.description.blocks.length > 0;

  return (
    <motion.div
      key="description"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
      className="py-1"
    >
      <SectionLabel icon={TargetIcon} label="Description" />
      {hasDescription ? (
        <LeafletRenderer
          document={bumicert.description}
          ownerDid={bumicert.organizationDid}
        />
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
                animate={{ opacity: 1, x: 0 }}
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
    </motion.div>
  );
}
