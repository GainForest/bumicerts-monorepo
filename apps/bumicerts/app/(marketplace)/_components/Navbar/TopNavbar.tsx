"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { useState } from "react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Drawer } from "vaul";
import { ProgressiveBlur } from "@/components/ui/progressive-blur";
import { links } from "@/lib/links";

const NAV_LINKS = [
  { href: links.root, label: "Home" },
  { href: links.explore, label: "Explore" },
  { href: links.allOrganizations, label: "Organizations" },
  { href: links.bumicert.create, label: "Create" },
];

export function TopNavbar() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <motion.header
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="fixed top-0 left-0 right-0 z-50"
    >
      {/* Progressive blur background */}
      <div className="absolute inset-0 h-24 pointer-events-none">
        <div
          className="absolute inset-0 z-1"
          style={{
            background: "linear-gradient(to bottom, var(--background) 0%, transparent 100%)",
            opacity: 0.85,
          }}
        />
        <ProgressiveBlur
          position="top"
          height="100%"
          blurLevels={[0.5, 1, 2, 4, 8, 12]}
          className="z-0"
        />
      </div>

      <div className="relative z-10 h-16 flex items-center w-full max-w-7xl mx-auto px-6 justify-between">
        {/* Logo + Wordmark */}
        <Link href={links.root} className="flex items-center gap-2 group">
          <motion.div
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          >
            <Image
              src="/assets/media/images/logo.svg"
              alt="Bumicerts"
              width={28}
              height={28}
              className="rounded-lg dark:invert dark:brightness-200"
              style={{ filter: "sepia(100%) saturate(0%) brightness(0.2)" }}
            />
          </motion.div>
          <span
            className="text-base font-medium tracking-tight text-foreground/80 group-hover:text-foreground transition-colors duration-200"
            style={{ fontFamily: "var(--font-garamond-var)" }}
          >
            Bumicerts
          </span>
        </Link>

        {/* Right: Launch App + Menu trigger */}
        <div className="flex items-center gap-3">
          {/* Launch App button */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          >
            <Link
              href={links.explore}
              className="text-sm font-medium bg-primary text-primary-foreground rounded-full px-4 py-1.5 hover:bg-primary/90 transition-colors"
            >
              Launch App
            </Link>
          </motion.div>

          {/* Menu drawer */}
          <Drawer.Root open={drawerOpen} onOpenChange={setDrawerOpen}>
            <Drawer.Trigger className="flex items-center gap-2 text-sm font-medium text-foreground/70 hover:text-foreground transition-colors cursor-pointer">
              Menu
              <span className="text-foreground/30">=</span>
            </Drawer.Trigger>

            <Drawer.Portal>
              <Drawer.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
              <Drawer.Content className="fixed top-0 right-0 bottom-0 w-full max-w-md z-50 bg-background border-l border-border flex flex-col">
                {/* Close button */}
                <div className="flex items-center justify-between p-6 border-b border-border">
                  <span className="text-sm font-medium tracking-wide uppercase text-muted-foreground">
                    Navigation
                  </span>
                  <button
                    onClick={() => setDrawerOpen(false)}
                    className="text-sm font-medium text-foreground/70 hover:text-foreground transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                </div>

                {/* Navigation links */}
                <nav className="flex-1 flex flex-col p-6 gap-1">
                  {NAV_LINKS.map((link, index) => (
                    <motion.div
                      key={link.href}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 + 0.1 }}
                    >
                      <Link
                        href={link.href}
                        onClick={() => setDrawerOpen(false)}
                        className="group flex items-center justify-between py-4 border-b border-border/50 hover:border-primary/30 transition-colors"
                      >
                        <span
                          className="text-2xl font-light text-foreground group-hover:text-primary transition-colors"
                          style={{ fontFamily: "var(--font-garamond-var)" }}
                        >
                          {link.label}
                        </span>
                        <motion.span
                          className="text-muted-foreground/30 text-lg"
                          whileHover={{ x: 4 }}
                        >
                          →
                        </motion.span>
                      </Link>
                    </motion.div>
                  ))}
                </nav>

                {/* Footer: theme toggle */}
                <div className="p-6 border-t border-border flex items-center justify-between">
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">
                    Theme
                  </span>
                  <ThemeToggle />
                </div>
              </Drawer.Content>
            </Drawer.Portal>
          </Drawer.Root>
        </div>
      </div>
    </motion.header>
  );
}
