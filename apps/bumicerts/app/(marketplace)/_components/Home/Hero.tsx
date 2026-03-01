"use client";

import { motion } from "framer-motion";
import { ArrowDownIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export function Hero() {
  return (
    <section className="relative min-h-[100svh] flex flex-col">
      {/* Full-bleed background image with gradient fade */}
      <div className="absolute inset-0 overflow-hidden">
        {/* The atmospheric landscape image */}
        <motion.div
          initial={{ scale: 1.1, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.8, ease: [0.25, 0.1, 0.25, 1] }}
          className="absolute inset-0"
        >
          <Image
            src="/assets/hero/background.png"
            alt="Misty forest landscape"
            fill
            priority
            className="object-cover object-bottom"
          />
          {/* Soft color wash over the image for that misty/muted look */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#e8ebe6]/60 via-[#d4dcd0]/40 to-transparent mix-blend-overlay" />
        </motion.div>
        
        {/* Gradient fade to background at the bottom */}
        <div 
          className="absolute inset-x-0 bottom-0 h-[40%] pointer-events-none"
          style={{
            background: "linear-gradient(to top, var(--background) 0%, var(--background) 20%, transparent 100%)"
          }}
        />
      </div>

      {/* Content container */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 pt-20 pb-32">
        {/* Main headline with inline logo */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
          className="text-center max-w-4xl"
        >
          <h1 
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-light tracking-[-0.02em] leading-[1.1] text-foreground"
            style={{ fontFamily: "var(--font-garamond-var)" }}
          >
            Verified Impact{" "}
            <span className="inline-flex items-center align-middle mx-1">
              <motion.span
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ duration: 0.6, delay: 0.8, type: "spring", stiffness: 200, damping: 15 }}
                className="inline-block"
              >
                <Image
                  src="/assets/media/images/logo.svg"
                  alt="Bumicerts"
                  width={56}
                  height={56}
                  className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-xl bg-primary/10 p-1.5 border border-primary/20"
                />
              </motion.span>
            </span>{" "}
            Starts
            <br />
            <span 
              className="text-foreground/80"
              style={{ fontFamily: "var(--font-instrument-serif-var)", fontStyle: "italic" }}
            >
              With Real Communities
            </span>
          </h1>
        </motion.div>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
          className="mt-6 md:mt-8 text-center text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed"
        >
          Fund regenerative projects directly. Every Bumicert is a verified record 
          of real environmental work — backed by photos, locations, and community stewards.
        </motion.p>

        {/* CTA Button - with accent */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
          className="mt-8 md:mt-10"
        >
          <Link href="/explore">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="group inline-flex items-center gap-2 h-12 px-6 rounded-full bg-primary text-primary-foreground text-sm font-medium transition-all hover:bg-primary/90 cursor-pointer shadow-lg shadow-primary/20"
            >
              Explore Projects
              <motion.span
                className="inline-block"
                animate={{ x: [0, 3, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              >
                →
              </motion.span>
            </motion.button>
          </Link>
        </motion.div>
      </div>

      {/* Scroll indicator at the very bottom - subtle accent */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 1.2 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10"
      >
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="flex flex-col items-center gap-2 text-primary/60"
        >
          <span className="text-[10px] uppercase tracking-[0.2em]">Scroll</span>
          <ArrowDownIcon className="h-3.5 w-3.5" />
        </motion.div>
      </motion.div>
    </section>
  );
}
