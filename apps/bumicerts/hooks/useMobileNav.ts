"use client";

/**
 * useMobileNav
 *
 * Tiny Zustand store that controls the floating mobile nav drawer open state.
 * Shared between:
 *   - Header / UploadHeader  — hamburger button sets open=true
 *   - DesktopSidebar / UploadDesktopSidebar — nav link clicks set open=false
 */

import { create } from "zustand";

interface MobileNavStore {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export const useMobileNav = create<MobileNavStore>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}));
