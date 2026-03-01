"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HomeIcon,
  CompassIcon,
  Building2Icon,
  BadgePlusIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  GithubIcon,
  TwitterIcon,
  FileTextIcon,
  ExternalLinkIcon,
} from "lucide-react";
import { AnimatePresence, motion, LayoutGroup } from "framer-motion";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const NAV_GROUPS = [
  {
    id: "home",
    text: "Home",
    Icon: HomeIcon,
    href: "/",
    pathCheck: { equals: "/" },
  },
  {
    id: "explore",
    text: "Explore",
    Icon: CompassIcon,
    children: [
      {
        id: "bumicerts",
        text: "Bumicerts",
        Icon: CompassIcon,
        href: "/explore",
        pathCheck: { startsWith: "/explore" },
      },
      {
        id: "organizations",
        text: "Organizations",
        Icon: Building2Icon,
        href: "/organization/all",
        pathCheck: { startsWith: "/organization" },
      },
    ],
  },
  {
    id: "create",
    text: "Create",
    Icon: BadgePlusIcon,
    href: "/bumicert/create",
    pathCheck: { startsWith: "/bumicert/create" },
  },
];

const FOOTER_LINKS = [
  { href: "https://github.com/gainforest-earth", text: "GitHub", Icon: GithubIcon },
  { href: "https://twitter.com/gainforest", text: "Twitter", Icon: TwitterIcon },
  { href: "/changelog", text: "Changelog", Icon: FileTextIcon },
];

function isLeafActive(pathCheck: { equals?: string; startsWith?: string }, pathname: string) {
  if (pathCheck.equals) return pathname === pathCheck.equals;
  if (pathCheck.startsWith) return pathname.startsWith(pathCheck.startsWith);
  return false;
}

export function DesktopSidebar() {
  const pathname = usePathname();
  const [expandedGroups, setExpandedGroups] = useState<string[]>(["explore"]);

  useEffect(() => {
    // Auto-expand the group that has an active child
    NAV_GROUPS.forEach((group) => {
      if (group.children) {
        const hasActiveChild = group.children.some((child) =>
          isLeafActive(child.pathCheck, pathname)
        );
        if (hasActiveChild) {
          setExpandedGroups((prev) =>
            prev.includes(group.id) ? prev : [...prev, group.id]
          );
        }
      }
    });
  }, [pathname]);

  const toggleGroup = (id: string) => {
    setExpandedGroups((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    );
  };

  return (
    <nav className="w-[240px] h-full flex flex-col justify-between p-4 border-r border-border bg-foreground/3">
      {/* Top section */}
      <div className="flex flex-col gap-1">
        {/* Logo + Wordmark */}
        <motion.div
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <Link href="/" className="group flex items-center gap-2.5 mb-4 py-1">
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
            <span className="font-serif text-xl font-bold tracking-tight text-foreground group-hover:text-primary transition-colors duration-200">
              Bumicerts
            </span>
          </Link>
        </motion.div>

        {/* Nav links */}
        <LayoutGroup id="sidebar-nav">
          <ul className="flex flex-col gap-0.5">
            {NAV_GROUPS.map((item, idx) => {
              if (!item.children) {
                // Leaf link
                const isActive = isLeafActive(item.pathCheck!, pathname);
                return (
                  <motion.li
                    key={item.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.05 * idx, ease: [0.25, 0.1, 0.25, 1] }}
                  >
                    <Link href={item.href!} className="block relative">
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
                            layoutId="active-nav-pill"
                            className="absolute left-0 top-2 bottom-2 w-0.5 bg-primary-foreground/50 rounded-full"
                          />
                        )}
                        <item.Icon className="h-4 w-4 shrink-0" />
                        <span>{item.text}</span>
                      </motion.div>
                    </Link>
                  </motion.li>
                );
              }

              // Group with children
              const isExpanded = expandedGroups.includes(item.id);
              const hasActiveChild = item.children.some((child) =>
                isLeafActive(child.pathCheck, pathname)
              );

              return (
                <motion.li
                  key={item.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.05 * idx, ease: [0.25, 0.1, 0.25, 1] }}
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
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
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

                  {/* Children */}
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
                            <Link key={child.id} href={child.href} className="block">
                              <motion.div
                                whileHover={{ x: 2 }}
                                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                className={cn(
                                  "flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm transition-colors duration-150 relative",
                                  isActive
                                    ? "bg-primary text-primary-foreground font-medium"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
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
