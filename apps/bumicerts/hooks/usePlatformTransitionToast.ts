"use client";

/**
 * usePlatformTransitionToast
 *
 * Fires a sonner toast whenever the user crosses the boundary between the
 * Marketplace and the Upload platform.  Runs on every transition — intentionally
 * so the user always has a clear mental anchor about where they are.
 *
 * Platform detection is intentionally simple:
 *   - Any path under /upload   → "upload"
 *   - Everything else          → "marketplace"
 */

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import { UploadCloudIcon, StoreIcon } from "lucide-react";
import React from "react";

type Platform = "marketplace" | "upload";

function detectPlatform(pathname: string): Platform {
  return pathname.startsWith("/upload") ? "upload" : "marketplace";
}

export function usePlatformTransitionToast() {
  const pathname = usePathname();
  const prevPlatformRef = useRef<Platform | null>(null);

  useEffect(() => {
    const current = detectPlatform(pathname);
    const prev = prevPlatformRef.current;

    // First render — record but don't toast.
    if (prev === null) {
      prevPlatformRef.current = current;
      return;
    }

    // Same platform — nothing to announce.
    if (prev === current) return;

    if (current === "upload") {
      toast("You're now in Upload", {
        description: "Manage your organisation's content & recordings",
        icon: React.createElement(UploadCloudIcon, {
          className: "size-4 text-primary shrink-0",
        }),
        duration: 3000,
      });
    } else {
      toast("Back to Marketplace", {
        description: "Explore and discover bumicerts",
        icon: React.createElement(StoreIcon, {
          className: "size-4 text-primary shrink-0",
        }),
        duration: 3000,
      });
    }

    prevPlatformRef.current = current;
  }, [pathname]);
}
