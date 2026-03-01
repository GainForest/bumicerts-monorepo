"use client";

import { motion, AnimatePresence } from "framer-motion";
import { BumicertCard, BumicertCardSkeleton, cardVariants } from "./BumicertCard";
import type { BumicertData } from "@/lib/types";
import { LeafIcon, SearchIcon } from "lucide-react";

// Container variants with design system stagger timing
const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1, // Design guideline: index * 0.1 stagger
    },
  },
};

export function BumicertGrid({
  bumicerts,
  loading = false,
}: {
  bumicerts: BumicertData[];
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-8 lg:gap-10 mt-4 items-stretch">
        {Array.from({ length: 6 }).map((_, i) => (
          <BumicertCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (bumicerts.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
        className="flex flex-col items-center justify-center py-28 px-6 text-center"
      >
        {/* Large decorative number - editorial flair */}
        <span 
          className="text-7xl md:text-8xl font-light text-primary/[0.15] tracking-tight mb-4"
          style={{ fontFamily: "var(--font-garamond-var)" }}
        >
          0
        </span>
        
        <div className="flex items-center gap-2 mb-3">
          <SearchIcon className="h-4 w-4 text-primary" />
          <span className="text-xs uppercase tracking-[0.15em] text-muted-foreground font-medium">
            No Results
          </span>
        </div>
        
        <h3 
          className="text-2xl md:text-3xl font-light text-foreground mb-3"
          style={{ fontFamily: "var(--font-garamond-var)" }}
        >
          No projects found
        </h3>
        
        <p 
          className="text-base text-foreground/80 max-w-md leading-relaxed"
          style={{ fontFamily: "var(--font-instrument-serif-var)", fontStyle: "italic" }}
        >
          Try adjusting your search or filters to discover more regenerative impact projects.
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      key="bumicert-grid"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-8 lg:gap-10 mt-4 items-stretch"
    >
      <AnimatePresence mode="popLayout">
        {bumicerts.map((bumicert) => (
          <BumicertCard key={bumicert.id} bumicert={bumicert} />
        ))}
      </AnimatePresence>
    </motion.div>
  );
}
