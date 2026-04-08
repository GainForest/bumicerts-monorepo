"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ChevronDownIcon, SparklesIcon } from "lucide-react";
import { useState } from "react";
import { BumicertCardVisual } from "@/app/(marketplace)/explore/_components/BumicertCard";

const FAQ_ITEMS = [
  {
    id: "1",
    question: "A digital certificate of impact",
    answer:
      "A Bumicert records a specific environmental action — giving it a permanent, verifiable identity on an open, decentralized network (the same technology that powers Bluesky).",
  },
  {
    id: "2",
    question: "Backed by real evidence",
    answer:
      "Photos, geolocation, timestamps, monitoring data. Every claim is verifiable. This isn't a promise of future impact — it's proof of work already done.",
  },
  {
    id: "3",
    question: "A direct line to communities",
    answer:
      "When you fund a Bumicert, your money reaches the exact people doing the restoration. No intermediaries skimming fees. No vague overhead.",
  },
  {
    id: "4",
    question: "Your claim to the story",
    answer:
      "Owning a Bumicert means you're part of that moment. A tree planted. A reef restored. An ecosystem revived. It's yours to share, hold, or gift.",
  },
];

function AccordionItem({
  item,
  isOpen,
  onToggle,
  index,
}: {
  item: (typeof FAQ_ITEMS)[0];
  isOpen: boolean;
  onToggle: () => void;
  index: number;
}) {
  return (
    <div className="border-b border-border/50 last:border-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between py-5 text-left gap-4 group cursor-pointer"
      >
        <div className="flex items-center gap-4">
          <span 
            className="text-2xl font-light text-primary/[0.25]"
            style={{ fontFamily: "var(--font-garamond-var)" }}
          >
            0{index + 1}
          </span>
          <span 
            className="text-base md:text-lg text-foreground group-hover:text-primary transition-colors duration-200"
            style={{ fontFamily: "var(--font-instrument-serif-var)" }}
          >
            {item.question}
          </span>
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
          className="shrink-0 text-muted-foreground/70 group-hover:text-foreground transition-colors"
        >
          <ChevronDownIcon className="h-4 w-4" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
            className="overflow-hidden"
          >
            <p className="pb-5 pl-12 text-muted-foreground leading-relaxed text-sm max-w-md">
              {item.answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function WhatIsBumicert() {
  const [openItem, setOpenItem] = useState<string>("1");

  return (
    <section className="py-20 md:py-28 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Content */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
          >
            {/* Section label */}
            <div className="flex items-center gap-2 mb-6">
              <SparklesIcon className="h-4 w-4 text-primary" />
              <span className="text-xs uppercase tracking-[0.15em] text-muted-foreground font-medium">
                The Certificate
              </span>
            </div>

            {/* Heading */}
            <h2 
              className="text-3xl md:text-4xl font-light tracking-[-0.01em] text-foreground mb-8"
              style={{ fontFamily: "var(--font-garamond-var)" }}
            >
              What exactly is
              <br />
            <span 
              className="italic text-foreground/80"
              style={{ fontFamily: "var(--font-instrument-serif-var)" }}
            >
                a Bumicert?
              </span>
            </h2>

            {/* Accordion */}
            <div>
              {FAQ_ITEMS.map((item, index) => (
                <AccordionItem
                  key={item.id}
                  item={item}
                  isOpen={openItem === item.id}
                  onToggle={() =>
                    setOpenItem(prev => prev === item.id ? "" : item.id)
                  }
                  index={index}
                />
              ))}
            </div>
          </motion.div>

          {/* Right: BumicertArt preview */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
            className="flex items-center justify-center lg:justify-end"
          >
            <div className="relative">
              {/* Subtle glow behind the card */}
              <div 
                className="absolute inset-0 blur-3xl opacity-20 scale-90"
                style={{ background: "radial-gradient(circle, var(--primary) 0%, transparent 70%)" }}
              />
              
              {/* Decorative number */}
              <div 
                className="absolute -top-6 -left-4 text-7xl font-light text-primary/[0.1] pointer-events-none select-none z-0"
                style={{ fontFamily: "var(--font-garamond-var)" }}
              >
                01
              </div>
              
              <BumicertCardVisual
                logoUrl="/assets/media/images/gainforest-logo.svg"
                coverImage="/assets/media/images/hero-bumicert-card/image0.png"
                title="Reforestation of Mount Halimun"
                description="Community-led restoration of native forest in West Java, Indonesia. 5,000 trees planted across 12 hectares."
                organizationName="Bumicerts"
                objectives={["Reforestation", "Biodiversity"]}
              />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
