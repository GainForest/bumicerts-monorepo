/**
 * @deprecated This sidebar has been replaced by the unified sidebar at
 * `components/layout/UnifiedSidebar/`. Kept for reference only.
 * See: Unified sidebar implementation (April 2026)
 *
 * The new unified sidebar combines both MARKETPLACE and MANAGE navigation
 * into a single component with EXPLORE and MANAGE sections.
 */

"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronDownIcon,
  GithubIcon,
  TwitterIcon,
  FileTextIcon,
  ExternalLinkIcon,
  ChevronRightIcon,
  XIcon,
} from "lucide-react";
import { AnimatePresence, motion, LayoutGroup } from "framer-motion";
import { useState, useEffect } from "react";
import useLocalStorage from "use-local-storage";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useAtprotoStore } from "@/components/stores/atproto";
import QuickTooltip from "@/components/ui/quick-tooltip";
import { useSidebarTransition } from "@/hooks/useSidebarTransition";
import { SidebarTransitionOverlay } from "@/components/ui/SidebarTransitionOverlay";
import { useMobileNav } from "@/hooks/useMobileNav";
import { PlatformSwitcher } from "@/components/ui/PlatformSwitcher";
import { buildMarketplaceNavItems, type NavItem } from "./data";
import { links } from "@/lib/links";

const FOOTER_LINKS = [
  { href: links.external.github, text: "GitHub", Icon: GithubIcon },
  { href: links.external.twitter, text: "Twitter", Icon: TwitterIcon },
  { href: links.external.gainforest, text: "GainForest", Icon: FileTextIcon },
  // { href: "/changelog", text: "Changelog", Icon: FileTextIcon },
];

function isLeafActive(
  pathCheck: { equals?: string; startsWith?: string },
  pathname: string,
): boolean {
  if (pathCheck.equals) return pathname === pathCheck.equals;
  if (pathCheck.startsWith) return pathname.startsWith(pathCheck.startsWith);
  return false;
}

// ── Welcome Card ──────────────────────────────────────────────────────────────

const WELCOME_DISMISSED_KEY = "bumicerts:marketplace-welcome-dismissed";

function MarketplaceWelcomeCard() {
  const [dismissed, setDismissed] = useLocalStorage(
    WELCOME_DISMISSED_KEY,
    false,
  );

  if (dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4, height: 0, marginBottom: 0 }}
        transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
        className="mx-0.5 mb-2 p-3 rounded-xl bg-background border border-border relative"
      >
        {/* Dismiss button */}
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
          className="absolute top-1.5 right-1.5 p-0.5 rounded-md text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/60 transition-colors"
        >
          <XIcon className="h-3 w-3" />
        </button>

        {/* Logo centred at the top */}
        <div className="flex justify-center mb-3 mt-1">
          <Image
            src="/assets/media/images/app-icon.png"
            alt="Bumicerts"
            width={32}
            height={32}
            className="drop-shadow-md -mb-2"
          />
        </div>
        <div className="flex flex-col w-full items-center gap-1">
          <span className="font-instrument text-2xl">Marketplace</span>
          <p className="text-xs text-muted-foreground text-pretty text-center">
            This is the Bumicerts Marketplace. Discover and support regenerative
            impact projects.
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// ── Nav item renderer ─────────────────────────────────────────────────────────

interface NavItemRendererProps {
  items: NavItem[];
  pathname: string;
  isAuthenticated: boolean;
  expandedGroups: string[];
  toggleGroup: (id: string) => void;
  closeMobileNav: (open: false) => void;
}

function NavItemRenderer({
  items,
  pathname,
  isAuthenticated,
  expandedGroups,
  toggleGroup,
  closeMobileNav,
}: NavItemRendererProps) {
  return (
    <ul className="flex flex-col gap-0.5">
      {items.map((item, idx) => {
        // ── Separator ──────────────────────────────────────────────────────
        if (item.kind === "separator") {
          return (
            <motion.li
              key={item.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.05 * idx }}
            >
              <div className="h-px bg-border/60 mx-1 my-2" />
            </motion.li>
          );
        }

        // ── Group ──────────────────────────────────────────────────────────
        if (item.kind === "group") {
          const isExpanded = expandedGroups.includes(item.id);
          const hasActiveChild = item.children.some((child) =>
            isLeafActive(child.pathCheck, pathname),
          );

          return (
            <motion.li
              key={item.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                duration: 0.3,
                delay: 0.05 * idx,
                ease: [0.25, 0.1, 0.25, 1],
              }}
              className="flex flex-col gap-0.5"
            >
              <button
                onClick={() => toggleGroup(item.id)}
                className="w-full cursor-pointer"
              >
                <motion.div
                  whileHover={{ x: 2 }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors duration-150 relative",
                    hasActiveChild && !isExpanded
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
                  )}
                >
                  {hasActiveChild && !isExpanded && (
                    <motion.div
                      layoutId="active-nav-pill"
                      className="absolute left-0 top-2 bottom-2 w-0.5 bg-primary rounded-full"
                    />
                  )}
                  <item.Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1 text-left">{item.text}</span>
                  <motion.div
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDownIcon className="h-3.5 w-3.5" />
                  </motion.div>
                </motion.div>
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
                    className="overflow-hidden ml-4 flex flex-col gap-0.5"
                  >
                    {item.children.map((child) => {
                      const isActive = isLeafActive(child.pathCheck, pathname);
                      return (
                        <Link
                          key={child.id}
                          href={child.href}
                          onClick={() => closeMobileNav(false)}
                          className="block"
                        >
                          <motion.div
                            whileHover={{ x: 2 }}
                            transition={{
                              type: "spring",
                              stiffness: 400,
                              damping: 30,
                            }}
                            className={cn(
                              "flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm transition-colors duration-150 relative",
                              isActive
                                ? "bg-primary text-primary-foreground font-medium"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
                            )}
                          >
                            {isActive && (
                              <motion.div
                                layoutId="active-nav-pill"
                                className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-primary-foreground/50 rounded-full"
                              />
                            )}
                            <child.Icon className="h-3.5 w-3.5 shrink-0" />
                            <span>{child.text}</span>
                          </motion.div>
                        </Link>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.li>
          );
        }

        // ── Leaf ───────────────────────────────────────────────────────────
        // Skip auth-required items when unauthenticated.
        if (item.requiresAuth && !isAuthenticated) return null;

        const isActive = isLeafActive(item.pathCheck, pathname);
        const isDisabled = item.disabledWhenUnauthed && !isAuthenticated;

        const inner = (
          <motion.div
            whileHover={isDisabled ? undefined : { x: 2 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className={cn(
              "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors duration-150 relative",
              isActive
                ? "bg-primary text-primary-foreground font-medium"
                : isDisabled
                  ? "text-muted-foreground/50 cursor-not-allowed"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
            )}
          >
            {isActive && (
              <motion.div
                layoutId="active-nav-pill"
                className="absolute left-0 top-2 bottom-2 w-0.5 bg-primary-foreground/50 rounded-full"
              />
            )}
            <item.Icon className="h-4 w-4 shrink-0" />
            <span className="flex-1">{item.text}</span>
            {item.trailingArrow && (
              <ChevronRightIcon className="h-3 w-3 opacity-40 shrink-0" />
            )}
          </motion.div>
        );

        return (
          <motion.li
            key={item.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              duration: 0.3,
              delay: 0.05 * idx,
              ease: [0.25, 0.1, 0.25, 1],
            }}
          >
            {isDisabled ? (
              <QuickTooltip
                content={item.disabledTooltip ?? "Unavailable"}
                asChild={false}
              >
                <div>{inner}</div>
              </QuickTooltip>
            ) : (
              <Link
                href={item.href}
                onClick={() => closeMobileNav(false)}
                className="block relative"
              >
                {inner}
              </Link>
            )}
          </motion.li>
        );
      })}
    </ul>
  );
}

// ── Main Sidebar ──────────────────────────────────────────────────────────────

export function DesktopSidebar() {
  const pathname = usePathname();
  const auth = useAtprotoStore((s) => s.auth);
  const isAuthenticated = auth.status === "AUTHENTICATED";
  const did = isAuthenticated ? auth.user.did : undefined;
  const [expandedGroups, setExpandedGroups] = useState<string[]>(["explore"]);
  const { switching, isExiting, targetPlatform } = useSidebarTransition();
  const closeMobileNav = useMobileNav((s) => s.setOpen);

  const navItems = buildMarketplaceNavItems(did);

  useEffect(() => {
    navItems.forEach((item) => {
      if (item.kind === "group") {
        const hasActiveChild = item.children.some((child) =>
          isLeafActive(child.pathCheck, pathname),
        );
        if (hasActiveChild) {
          setExpandedGroups((prev) =>
            prev.includes(item.id) ? prev : [...prev, item.id],
          );
        }
      }
    });
    // navItems changes every render (built inline) — depend on pathname + did only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, did]);

  const toggleGroup = (id: string) => {
    setExpandedGroups((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id],
    );
  };

  return (
    <nav className="w-[240px] h-full flex flex-col justify-between p-4 border-r border-border bg-foreground/3 relative">
      {/* Platform transition overlay */}
      <AnimatePresence>
        {switching && (
          <SidebarTransitionOverlay
            targetPlatform={targetPlatform}
            isExiting={isExiting}
          />
        )}
      </AnimatePresence>

      {/* Top section */}
      <div className="flex flex-col gap-1">
        {/* Platform switcher (logo + dropdown) */}
        <motion.div
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
          className="mb-4"
        >
          <PlatformSwitcher currentPlatform="marketplace" />
        </motion.div>

        {/* Nav links — fully data-driven */}
        <LayoutGroup id="sidebar-nav">
          <NavItemRenderer
            items={navItems}
            pathname={pathname}
            isAuthenticated={isAuthenticated}
            expandedGroups={expandedGroups}
            toggleGroup={toggleGroup}
            closeMobileNav={closeMobileNav}
          />
        </LayoutGroup>
      </div>

      {/* Footer section */}
      <div className="flex flex-col gap-2">
        {/* Dismissible welcome card */}
        <MarketplaceWelcomeCard />

        <div className="h-px bg-border" />

        <ul className="flex flex-col gap-0.5">
          {FOOTER_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                target={link.href.startsWith("http") ? "_blank" : undefined}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors duration-150"
              >
                <link.Icon className="h-3.5 w-3.5 shrink-0" />
                <span>{link.text}</span>
                {link.href.startsWith("http") && (
                  <ExternalLinkIcon className="h-3 w-3 ml-auto opacity-50" />
                )}
              </Link>
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-between px-2">
          <span className="text-[10px] text-muted-foreground/50">v0.2.0</span>
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}
