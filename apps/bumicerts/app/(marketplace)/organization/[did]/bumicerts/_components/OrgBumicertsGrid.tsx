"use client";

import { motion } from "framer-motion";
import { BadgeIcon } from "lucide-react";
import Link from "next/link";
import { BumicertCardVisual, cardVariants } from "@/app/(marketplace)/explore/_components/BumicertCard";
import type { BumicertData } from "@/lib/types";
import { links } from "@/lib/links";

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
};

interface OrgBumicertsGridProps {
  bumicerts: BumicertData[];
}

export function OrgBumicertsGrid({ bumicerts }: OrgBumicertsGridProps) {
  if (bumicerts.length === 0) {
    return (
      <div className="py-16 flex flex-col items-center justify-center text-center">
        <span
          className="text-7xl font-light text-primary/[0.12] tracking-tight mb-4 block"
          style={{ fontFamily: "var(--font-garamond-var)" }}
        >
          0
        </span>
        <div className="flex items-center gap-2 mb-3">
          <BadgeIcon className="h-4 w-4 text-primary" />
          <span className="text-xs uppercase tracking-[0.15em] text-muted-foreground font-medium">
            No Bumicerts
          </span>
        </div>
        <p
          className="text-lg text-foreground/60 max-w-sm"
          style={{ fontFamily: "var(--font-instrument-serif-var)", fontStyle: "italic" }}
        >
          This organization hasn&apos;t published any Bumicerts yet.
        </p>
      </div>
    );
  }

  return (
    <section className="py-6">
      {/* Count */}
      <div className="flex items-baseline gap-2 mb-6">
        <span
          className="text-4xl font-light text-primary/[0.2]"
          style={{ fontFamily: "var(--font-garamond-var)" }}
        >
          {bumicerts.length}
        </span>
        <span className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
          {bumicerts.length === 1 ? "bumicert" : "bumicerts"}
        </span>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-5"
      >
        {bumicerts.map((b) => (
          <motion.div key={b.id} variants={cardVariants}>
            <Link href={links.bumicert.view(b.id)} className="block">
              <BumicertCardVisual
                coverImage={b.coverImageUrl}
                logoUrl={b.logoUrl}
                title={b.title}
                organizationName={b.organizationName}
                objectives={b.objectives}
                description={b.shortDescription}
              />
            </Link>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
