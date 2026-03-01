"use client";

import { useHeaderSlots } from "./context";
import { motion, AnimatePresence } from "framer-motion";
import { ProgressiveBlur } from "@/components/ui/progressive-blur";
import { AuthButton } from "@/components/auth/AuthButton";

export function Header() {
  const leftContent = useHeaderSlots((s) => s.leftContent);
  const rightContent = useHeaderSlots((s) => s.rightContent);
  const subHeaderContent = useHeaderSlots((s) => s.subHeaderContent);

  return (
    <div className="sticky top-0 z-30">

      {/* Progressive blur background - same approach as TopNavbar */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Subtle gradient overlay for readability */}
        <div
          className="absolute inset-0 z-[1]"
          style={{
            background: `linear-gradient(to bottom, var(--background) 0%,${subHeaderContent ? " var(--background) 80%," : ""} transparent 100%)`,
            opacity: 0.8,
          }}
        />
        {/* Progressive blur effect */}
        <ProgressiveBlur
          position="top"
          height="100%"
          // blurLevels={[0.5, 1, 2, 4, 8, 12]}
          className="z-[0]"
        />
      </div>

      <div className="relative z-10 flex flex-col">
        <div className="h-14 flex items-center justify-between px-4 gap-3">
          {/* Left slot */}
          <div className="flex-1 flex items-center gap-2 min-w-0">
            <AnimatePresence mode="wait">
              {leftContent ? (
                <motion.div
                  key="left-content"
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -4 }}
                  transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
                  className="flex-1 min-w-0"
                >
                  {leftContent}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>

          {/* Right slot */}
          <div className="flex items-center gap-3 shrink-0">
            <AnimatePresence mode="wait">
              {rightContent ? (
                <motion.div
                  key="right-content"
                  initial={{ opacity: 0, x: 4 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 4 }}
                  transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
                >
                  {rightContent}
                </motion.div>
              ) : null}
            </AnimatePresence>
            <AuthButton />
          </div>
        </div>

        {/* Sub-header slot (e.g. step progress bar) */}
        <AnimatePresence>
          {subHeaderContent ? (
            <motion.div
              key="sub-header"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
              className="px-4 pb-1 overflow-hidden"
            >
              {subHeaderContent}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
