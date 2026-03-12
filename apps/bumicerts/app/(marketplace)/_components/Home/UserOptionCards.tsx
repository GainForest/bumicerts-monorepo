"use client";

import { motion } from "framer-motion";
import { ArrowUpRightIcon } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { links } from "@/lib/links";

export function UserOptionCards() {
  return (
    <section className="py-16 md:py-24 px-6 bg-muted/30">
      <div className="max-w-6xl mx-auto">
        {/* Section intro */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
          className="text-center mb-12 md:mb-16"
        >
          <h2 
            className="text-3xl md:text-4xl font-light tracking-[-0.01em] text-foreground"
            style={{ fontFamily: "var(--font-garamond-var)" }}
          >
            Choose Your Path
          </h2>
          <p className="mt-3 text-muted-foreground text-base max-w-md mx-auto">
            Whether you&apos;re here to fund impact or showcase your work, there&apos;s a place for you.
          </p>
        </motion.div>

        {/* Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Supporter Card */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <Link href={links.explore} className="block group">
              <div className="relative overflow-hidden rounded-2xl bg-card border border-border h-[320px] md:h-[360px] transition-all duration-500 hover:shadow-2xl hover:border-primary/20">
                {/* Background image */}
                <div className="absolute inset-0">
                  <Image
                    src="/assets/media/images/hero-bumicert-card/image0.png"
                    alt="Forest landscape"
                    fill
                    className="object-cover opacity-50 group-hover:opacity-60 group-hover:scale-105 transition-all duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-card via-card/80 to-transparent" />
                </div>
                
                {/* Content */}
                <div className="relative h-full flex flex-col justify-end p-6 md:p-8">
                  <span 
                    className="text-xs uppercase tracking-[0.2em] text-primary mb-2"
                    style={{ fontFamily: "var(--font-instrument-serif-var)" }}
                  >
                    For Funders
                  </span>
                  <h3 
                    className="text-2xl md:text-3xl font-light text-foreground mb-3"
                    style={{ fontFamily: "var(--font-garamond-var)" }}
                  >
                    I want to support
                    <br />
                    <span className="italic" style={{ fontFamily: "var(--font-instrument-serif-var)" }}>
                      a project
                    </span>
                  </h3>
                  <p className="text-sm text-muted-foreground mb-6 max-w-xs">
                    Browse verified certificates and fund the exact moment of restoration.
                  </p>
                  
                  <motion.div 
                    className="flex items-center gap-2 text-sm font-medium text-foreground group-hover:text-primary transition-colors"
                    whileHover={{ x: 4 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  >
                    Explore Bumicerts
                    <ArrowUpRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </motion.div>
                </div>
              </div>
            </Link>
          </motion.div>

          {/* Organization Card */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <Link href={links.bumicert.create} className="block group">
              <div className="relative overflow-hidden rounded-2xl bg-card border border-border h-[320px] md:h-[360px] transition-all duration-500 hover:shadow-2xl hover:border-primary/20">
                {/* Background image */}
                <div className="absolute inset-0">
                  <Image
                    src="/assets/media/images/hero-bumicert-card/image2.png"
                    alt="Community planting"
                    fill
                    className="object-cover opacity-50 group-hover:opacity-60 group-hover:scale-105 transition-all duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-card via-card/80 to-transparent" />
                </div>
                
                {/* Content */}
                <div className="relative h-full flex flex-col justify-end p-6 md:p-8">
                  <span 
                    className="text-xs uppercase tracking-[0.2em] text-primary mb-2"
                    style={{ fontFamily: "var(--font-instrument-serif-var)" }}
                  >
                    For Organizations
                  </span>
                  <h3 
                    className="text-2xl md:text-3xl font-light text-foreground mb-3"
                    style={{ fontFamily: "var(--font-garamond-var)" }}
                  >
                    I am a nature
                    <br />
                    <span className="italic" style={{ fontFamily: "var(--font-instrument-serif-var)" }}>
                      steward
                    </span>
                  </h3>
                  <p className="text-sm text-muted-foreground mb-6 max-w-xs">
                    Showcase your regenerative work and connect with funders who care.
                  </p>
                  
                  <motion.div 
                    className="flex items-center gap-2 text-sm font-medium text-foreground group-hover:text-primary transition-colors"
                    whileHover={{ x: 4 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  >
                    Create a Bumicert
                    <ArrowUpRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </motion.div>
                </div>
              </div>
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
