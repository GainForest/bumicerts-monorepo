"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeftIcon,
  ExternalLinkIcon,
  GithubIcon,
  TwitterIcon,
  FileTextIcon,
  UserIcon,
  ChevronLeftIcon,
} from "lucide-react";
import { motion, LayoutGroup, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { links } from "@/lib/links";
import { useAtprotoStore } from "@/components/stores/atproto";
import { UPLOAD_NAV_ITEMS } from "./data";
import { useSidebarTransition } from "@/hooks/useSidebarTransition";
import { SidebarTransitionOverlay } from "@/components/ui/SidebarTransitionOverlay";
import { useMobileNav } from "@/hooks/useMobileNav";

const FOOTER_LINKS = [
  { href: "https://github.com/gainforest-earth", text: "GitHub", Icon: GithubIcon },
  { href: "https://twitter.com/gainforest", text: "Twitter", Icon: TwitterIcon },
  { href: "/changelog", text: "Changelog", Icon: FileTextIcon },
];

function isNavItemActive(
  pathCheck: { equals?: string; startsWith?: string },
  pathname: string
): boolean {
  if (pathCheck.equals) return pathname === pathCheck.equals;
  if (pathCheck.startsWith) return pathname.startsWith(pathCheck.startsWith);
  return false;
}

// ── Profile Card ──────────────────────────────────────────────────────────────

function UploadProfileCard() {
  const auth = useAtprotoStore((s) => s.auth);

  if (auth.status !== "AUTHENTICATED") return null;

  const { displayName, handle, avatar } = auth.user;
  const label = displayName ?? handle ?? "My Organisation";

  return (
    <div className="mx-0.5 mb-3 p-2.5 rounded-xl bg-muted/30 border border-border/50">
      <div className="flex items-center gap-2.5">
        {/* Avatar */}
        <div className="h-9 w-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 overflow-hidden">
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} alt={label} className="h-full w-full object-cover" />
          ) : (
            <UserIcon className="h-4 w-4 text-primary" />
          )}
        </div>

        {/* Name + handle */}
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground truncate leading-tight">
            {label}
          </p>
          {handle && (
            <p className="text-[11px] text-muted-foreground truncate mt-0.5">
              @{handle}
            </p>
          )}
        </div>
      </div>
    </div>
  );
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
        {/* Logo + "Upload" wordmark */}
        <motion.div
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <div className="flex items-center gap-2.5 mb-1 py-1">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.1, type: "spring", stiffness: 300, damping: 20 }}
              className="h-8 w-8 rounded-xl border border-border shadow-sm bg-background flex items-center justify-center"
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
            <motion.span
              layoutId="sidebar-platform-name"
              className="font-serif text-xl font-bold tracking-tight text-foreground/80 inline-block"
            >
              Upload
            </motion.span>
          </div>
        </motion.div>

        {/* Back to home — subtle, just below logo */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.12 }}
          className="my-4"
        >
          <Link
            href={links.home}
            onClick={() => closeMobileNav(false)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors duration-150 w-fit"
          >
            <ChevronLeftIcon className="size-5" />
            <span className="text-sm">Go to Marketplace</span>
          </Link>
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
