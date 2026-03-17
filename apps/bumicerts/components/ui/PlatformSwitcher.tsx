"use client";

/**
 * PlatformSwitcher — dropdown to switch between Marketplace and Upload platforms.
 *
 * Displays the current platform name with a chevron icon. Clicking opens a popover
 * with both platform options. Selecting one navigates to that platform.
 *
 * The Upload option requires authentication — shows a tooltip when unauthenticated.
 */

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ChevronDownIcon, CheckIcon, LockIcon } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import QuickTooltip from "@/components/ui/quick-tooltip";
import { useAtprotoStore } from "@/components/stores/atproto";
import { useMobileNav } from "@/hooks/useMobileNav";
import { links } from "@/lib/links";
import { cn } from "@/lib/utils";

export type Platform = "marketplace" | "upload";

interface PlatformOption {
  id: Platform;
  label: string;
  href: string;
  requiresAuth?: boolean;
}

const PLATFORMS: PlatformOption[] = [
  { id: "marketplace", label: "Marketplace", href: links.home },
  { id: "upload", label: "Upload", href: links.upload.home, requiresAuth: true },
];

interface PlatformSwitcherProps {
  currentPlatform: Platform;
}

export function PlatformSwitcher({ currentPlatform }: PlatformSwitcherProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const closeMobileNav = useMobileNav((s) => s.setOpen);
  const auth = useAtprotoStore((s) => s.auth);
  const isAuthenticated = auth.status === "AUTHENTICATED";

  const currentOption = PLATFORMS.find((p) => p.id === currentPlatform);

  const handleSelect = (platform: PlatformOption) => {
    if (platform.id === currentPlatform) {
      setOpen(false);
      return;
    }

    if (platform.requiresAuth && !isAuthenticated) {
      // Don't navigate — tooltip will show
      return;
    }

    setOpen(false);
    closeMobileNav(false);
    router.push(platform.href);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="group flex items-center gap-2.5 py-1 w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-lg"
        >
          {/* Logo */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1, type: "spring", stiffness: 300, damping: 20 }}
            className="h-8 w-8 rounded-xl border border-border shadow-sm bg-background flex items-center justify-center shrink-0"
          >
            <Image
              src="/assets/media/images/logo.svg"
              alt="Bumicerts"
              width={24}
              height={24}
              className="dark:invert dark:brightness-200"
              style={{ filter: "sepia(100%) saturate(0%) brightness(0.2)" }}
            />
          </motion.div>

          {/* Platform name */}
          <motion.span
            layoutId="sidebar-platform-name"
            className={cn(
              "font-serif text-xl font-bold tracking-tight inline-block transition-colors duration-200",
              currentPlatform === "marketplace"
                ? "text-foreground group-hover:text-primary"
                : "text-foreground/80"
            )}
          >
            {currentOption?.label ?? "Bumicerts"}
          </motion.span>

          {/* Chevron */}
          <ChevronDownIcon
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform duration-200",
              open && "rotate-180"
            )}
          />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={8}
        className="w-48 p-1"
      >
        <div className="flex flex-col">
          {PLATFORMS.map((platform) => {
            const isSelected = platform.id === currentPlatform;
            const isDisabled = platform.requiresAuth && !isAuthenticated;

            const item = (
              <button
                key={platform.id}
                type="button"
                onClick={() => handleSelect(platform)}
                disabled={isDisabled}
                className={cn(
                  "flex items-center justify-between w-full px-3 py-2 text-sm rounded-md transition-colors",
                  isSelected
                    ? "bg-primary/10 text-primary font-medium"
                    : isDisabled
                      ? "text-muted-foreground/50 cursor-not-allowed"
                      : "text-foreground hover:bg-muted/60"
                )}
              >
                <span>{platform.label}</span>
                {isSelected && <CheckIcon className="h-4 w-4" />}
                {isDisabled && <LockIcon className="h-3.5 w-3.5" />}
              </button>
            );

            if (isDisabled) {
              return (
                <QuickTooltip key={platform.id} content="Sign in to access Upload" asChild={false}>
                  {item}
                </QuickTooltip>
              );
            }

            return item;
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
