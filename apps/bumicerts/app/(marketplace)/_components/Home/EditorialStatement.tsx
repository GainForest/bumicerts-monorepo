"use client";

import { motion } from "framer-motion";

export function EditorialStatement() {
  return (
    <div className="max-w-5xl mx-auto px-6 mt-20 mb-12">
      <motion.h2
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
        className="text-5xl md:text-6xl lg:text-7xl font-light tracking-[-0.02em] leading-tight"
        style={{ fontFamily: "var(--font-garamond-var)" }}
      >
        Fund the future
        <br />
        <em
          className="text-primary/80"
          style={{ fontFamily: "var(--font-instrument-serif-var)" }}
        >
          of our planet.
        </em>
      </motion.h2>
      <motion.p
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
        className="mt-6 text-lg text-muted-foreground max-w-xl leading-relaxed"
      >
        Every Bumicert is a verified record of real environmental work — planted
        trees, protected reefs, restored grasslands. Fund the exact moment of
        regeneration.
      </motion.p>
    </div>
  );
}
