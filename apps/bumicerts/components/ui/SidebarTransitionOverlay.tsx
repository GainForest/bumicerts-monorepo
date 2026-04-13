"use client";

/**
 * @deprecated Platform transition overlay no longer needed with unified sidebar.
 * Kept for reference only.
 * See: Unified sidebar implementation (April 2026)
 *
 * The unified sidebar no longer has platform switching animations.
 *
 * ---
 *
 * SidebarTransitionOverlay
 *
 * Shown inside a sidebar for ~1 second when the user crosses the
 * marketplace ↔ upload boundary. Renders a centred column of:
 *   - blurred radial circle that expands in, then contracts out
 *   - platform icon (animate-pulse)
 *   - "Switching to <Platform>" label
 *
 * `isExiting` is flipped by the hook ~0.5s before unmount so the circle
 * has time to reverse its scale animation before the overlay disappears.
 */

import { motion } from "framer-motion";
import { UploadCloudIcon, StoreIcon } from "lucide-react";
import type { SidebarPlatform } from "@/hooks/useSidebarTransition";

interface SidebarTransitionOverlayProps {
  targetPlatform: SidebarPlatform;
  isExiting: boolean;
}

const PLATFORM_META: Record<
  SidebarPlatform,
  { Icon: React.ComponentType<{ className?: string }>; label: string }
> = {
  upload: {
    Icon: UploadCloudIcon,
    label: "Upload",
  },
  marketplace: {
    Icon: StoreIcon,
    label: "Marketplace",
  },
};

export function SidebarTransitionOverlay({
  targetPlatform,
  isExiting,
}: SidebarTransitionOverlayProps) {
  const { Icon, label } = PLATFORM_META[targetPlatform];

  return (
    <motion.div
      key="sidebar-transition-overlay"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
      className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/80 backdrop-blur-sm z-10"
    >
      <div className="absolute inset-0 overflow-hidden">

        <motion.div
          className="absolute h-80 w-80 rounded-full bg-primary blur-3xl z-10 opacity-75"
          style={{ left: "50%", top: "50%", x: "-50%", y: "-50%" }}
          initial={{ scale: 0 }}
          animate={{ scale: isExiting ? 0 : 5 }}
          transition={{ duration: 0.5, ease: "easeIn" }}
        />
      </div>
      <Icon className="h-8 w-8 text-primary-foreground animate-pulse relative z-12" />
      <p className="text-sm font-medium text-primary-foreground text-center tracking-wide relative z-20">
        Switching to{" "}
        <br />
        <motion.span
          layoutId="sidebar-platform-name"
          className="font-instrument text-lg inline-block"
        >
          {label}
        </motion.span>
      </p>
    </motion.div>
  );
}
