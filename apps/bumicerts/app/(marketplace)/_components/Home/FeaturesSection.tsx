"use client";

import { motion } from "framer-motion";
import { LeafIcon } from "lucide-react";

const FEATURES = [
  {
    number: "01",
    title: "Verified environmental impact",
    description: "Every certificate is backed by photos, geolocation data, and community verification.",
  },
  {
    number: "02", 
    title: "Direct community funding",
    description: "Your support goes straight to the stewards doing on-ground restoration work.",
  },
  {
    number: "03",
    title: "Decentralized & transparent",
    description: "Built on open, decentralized infrastructure. Every action is recorded, traceable, and permanent.",
  },
];

export function FeaturesSection() {
  return (
    <section className="py-20 md:py-28 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Section header - matching "The Certificate" style */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
          className="flex items-center gap-2 mb-16"
        >
          <LeafIcon className="h-4 w-4 text-primary" />
          <span className="text-xs uppercase tracking-[0.15em] text-muted-foreground font-medium">
            About Us
          </span>
        </motion.div>

        {/* Features grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8">
          {FEATURES.map((feature, index) => (
            <motion.div
              key={feature.number}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ 
                duration: 0.5, 
                delay: index * 0.1 + 0.1,
                ease: [0.25, 0.1, 0.25, 1] 
              }}
              className="group"
            >
              {/* Large faded number with subtle accent */}
              <span 
                className="block text-5xl md:text-6xl font-light text-primary/[0.15] mb-4 tracking-tight"
                style={{ fontFamily: "var(--font-garamond-var)" }}
              >
                {feature.number}.
              </span>
              
              {/* Title */}
              <h3 
                className="text-lg md:text-xl font-medium text-foreground mb-2 leading-snug"
                style={{ fontFamily: "var(--font-instrument-serif-var)" }}
              >
                {feature.title}
              </h3>
              
              {/* Description */}
              <p className="text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
