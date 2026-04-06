"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ExternalLinkIcon,
  GithubIcon,
  TwitterIcon,
  FileTextIcon,
} from "lucide-react";
import { motion, LayoutGroup, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { UPLOAD_NAV_ITEMS } from "./data";
import { useSidebarTransition } from "@/hooks/useSidebarTransition";
import { SidebarTransitionOverlay } from "@/components/ui/SidebarTransitionOverlay";
import { useMobileNav } from "@/hooks/useMobileNav";
import { PlatformSwitcher } from "@/components/ui/PlatformSwitcher";
import { links } from "@/lib/links";

const FOOTER_LINKS = [
  { href: links.external.github, text: "GitHub", Icon: GithubIcon },
  { href: links.external.twitter, text: "Twitter", Icon: TwitterIcon },
  { href: links.external.gainforest, text: "GainForest", Icon: FileTextIcon },
  // { href: "/changelog", text: "Changelog", Icon: FileTextIcon },
];

function isNavItemActive(
  pathCheck: { equals?: string; startsWith?: string },
  pathname: string
): boolean {
  if (pathCheck.equals) return pathname === pathCheck.equals;
  if (pathCheck.startsWith) return pathname.startsWith(pathCheck.startsWith);
  return false;
}

// ── Main Sidebar ──────────────────────────────────────────────────────────────

export function UploadDesktopSidebar() {
  const pathname = usePathname();
  const { switching, isExiting, targetPlatform } = useSidebarTransition();
  const closeMobileNav = useMobileNav((s) => s.setOpen);

  return (
    <nav className="w-[240px] h-full flex flex-col justify-between p-4 border-r border-border bg-foreground/3 relative">
      {/* Platform transition overlay */}
      <AnimatePresence>
        {switching && <SidebarTransitionOverlay targetPlatform={targetPlatform} isExiting={isExiting} />}
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
          <PlatformSwitcher currentPlatform="upload" />
        </motion.div>

        {/* Nav links */}
        <LayoutGroup id="upload-sidebar-nav">
          <ul className="flex flex-col gap-0.5">
            {UPLOAD_NAV_ITEMS.map((item, idx) => {
              const isActive = isNavItemActive(item.pathCheck, pathname);
              return (
                <motion.li
                  key={item.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.05 * idx + 0.22, ease: [0.25, 0.1, 0.25, 1] }}
                >
                  <Link href={item.href} onClick={() => closeMobileNav(false)} className="block relative">
                    <motion.div
                      whileHover={{ x: 2 }}
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      className={cn(
                        "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors duration-150 relative",
                        isActive
                          ? "bg-primary text-primary-foreground font-medium"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                      )}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="upload-active-nav-pill"
                          className="absolute left-0 top-2 bottom-2 w-0.5 bg-primary-foreground/50 rounded-full"
                        />
                      )}
                      <item.Icon className="h-4 w-4 shrink-0" />
                      <span>{item.text}</span>
                    </motion.div>
                  </Link>
                </motion.li>
              );
            })}
          </ul>
        </LayoutGroup>
      </div>

      {/* Footer section */}
      <div className="flex flex-col gap-2">
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
