"use client";

/**
 * MobileNavDrawer
 *
 * A Vaul drawer that slides in from the left on mobile, rendering the same
 * sidebar component used on desktop. This means nav logic lives in exactly
 * one place — the sidebar — and the mobile experience is always in sync.
 *
 * Open state is controlled by useMobileNav so the hamburger button in the
 * Header can open it without prop-drilling.
 */

import { Drawer } from "vaul";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { useMobileNav } from "@/hooks/useMobileNav";

interface MobileNavDrawerProps {
  children: React.ReactNode;
}

export function MobileNavDrawer({ children }: MobileNavDrawerProps) {
  const open = useMobileNav((s) => s.open);
  const setOpen = useMobileNav((s) => s.setOpen);

  return (
    <Drawer.Root
      open={open}
      onOpenChange={setOpen}
      direction="left"
    >
      <Drawer.Portal>
        <Drawer.Overlay
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setOpen(false)}
        />
        <Drawer.Content
          className="fixed top-0 left-0 bottom-0 z-50 md:hidden focus:outline-none bg-background"
          aria-label="Navigation"
        >
          <VisuallyHidden.Root>
            <Drawer.Title>Navigation</Drawer.Title>
          </VisuallyHidden.Root>
          {/* Render the full sidebar — identical to desktop */}
          {children}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
