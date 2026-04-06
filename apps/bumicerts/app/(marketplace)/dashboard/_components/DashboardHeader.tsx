"use client";

import { HeaderContent } from "@/app/(marketplace)/_components/Header/HeaderContent";

/**
 * DashboardHeader — injects content into the sticky header for this route.
 *
 * HeaderContent auto-clears slots on unmount.
 *
 * @see app/(marketplace)/_components/Header/context.tsx for slot docs
 */
export function DashboardHeader() {
  return (
    <HeaderContent
      // left={...}
      // right={...}
      // sub={...}
    />
  );
}
