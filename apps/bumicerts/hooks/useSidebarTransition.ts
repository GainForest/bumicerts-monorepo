"use client";

/**
 * useSidebarTransition
 *
 * Returns `switching`, `isExiting`, and `targetPlatform` for 3 seconds whenever
 * the user crosses the marketplace ↔ manage boundary. Sidebars use this to
 * temporarily replace their content with a centred transition overlay.
 *
 * Timeline per transition:
 *   0ms              → switching=true,  isExiting=false  (overlay + circle animate IN)
 *   OVERLAY_DURATION - EXIT_LEAD_MS → isExiting=true   (circle animates OUT)
 *   OVERLAY_DURATION               → switching=false   (overlay unmounts)
 *
 * Writes the current platform to sessionStorage on every pathname change so
 * the stored value is always up to date across layout remounts.
 *
 * Triggers in exactly two scenarios:
 *   1. Entering any /manage route (from anywhere).
 *   2. Entering any marketplace route coming FROM an /manage route.
 */

import { useState, useEffect, useRef, startTransition } from "react";
import { usePathname } from "next/navigation";

export type SidebarPlatform = "marketplace" | "upload";

const SESSION_KEY = "bumicerts:platform";
const OVERLAY_DURATION_MS = 1000;
// How long before unmount to start the circle's exit animation.
// Should match the circle's transition duration in the overlay.
const EXIT_LEAD_MS = 500;

function detectPlatform(pathname: string): SidebarPlatform {
  return pathname.startsWith("/upload") ? "upload" : "marketplace";
}

function readStoredPlatform(): SidebarPlatform | null {
  if (typeof window === "undefined") return null;
  const stored = sessionStorage.getItem(SESSION_KEY);
  if (stored === "marketplace" || stored === "upload") return stored;
  return null;
}

function storePlatform(platform: SidebarPlatform): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(SESSION_KEY, platform);
}

interface SidebarTransitionState {
  /** Whether the transition overlay should be shown right now. */
  switching: boolean;
  /** True during the final EXIT_LEAD_MS window — used to reverse the circle animation. */
  isExiting: boolean;
  /** The platform we are transitioning TO (used for label / icon). */
  targetPlatform: SidebarPlatform;
}

export function useSidebarTransition(): SidebarTransitionState {
  const pathname = usePathname();
  const [switching, setSwitching] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [targetPlatform, setTargetPlatform] =
    useState<SidebarPlatform>("marketplace");
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmountTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const current = detectPlatform(pathname);
    const prev = readStoredPlatform();

    // Always persist current so the next mount can compare correctly.
    storePlatform(current);

    // Scenario 1: entering upload from anywhere (including first visit).
    const toUpload = current === "upload" && prev !== "upload";
    // Scenario 2: returning to marketplace specifically from upload.
    const toMarketplace = current === "marketplace" && prev === "upload";

    if (!toUpload && !toMarketplace) return;

    // Reset and start fresh.
    if (exitTimerRef.current !== null) clearTimeout(exitTimerRef.current);
    if (unmountTimerRef.current !== null) clearTimeout(unmountTimerRef.current);

    startTransition(() => {
      setTargetPlatform(current);
      setIsExiting(false);
      setSwitching(true);
    });

    // After (OVERLAY_DURATION - EXIT_LEAD_MS): flip isExiting so circle reverses.
    exitTimerRef.current = setTimeout(() => {
      startTransition(() => setIsExiting(true));
      exitTimerRef.current = null;
    }, OVERLAY_DURATION_MS - EXIT_LEAD_MS);

    // After OVERLAY_DURATION: unmount the overlay entirely.
    unmountTimerRef.current = setTimeout(() => {
      startTransition(() => {
        setSwitching(false);
        setIsExiting(false);
      });
      unmountTimerRef.current = null;
    }, OVERLAY_DURATION_MS);
  }, [pathname]);

  // Clean up on unmount.
  useEffect(() => {
    return () => {
      if (exitTimerRef.current !== null) clearTimeout(exitTimerRef.current);
      if (unmountTimerRef.current !== null)
        clearTimeout(unmountTimerRef.current);
    };
  }, []);

  return { switching, isExiting, targetPlatform };
}
