"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { HomeIcon, BadgeIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { links } from "@/lib/links";

interface Tab {
  label: string;
  href: string;
  icon: React.ElementType;
  /** If true, only active on exact match; otherwise prefix match. */
  exact: boolean;
}

function buildTabs(did: string): Tab[] {
  return [
    {
      label: "Home",
      href: links.organization.home(did),
      icon: HomeIcon,
      exact: true,
    },
    {
      label: "Bumicerts",
      href: links.organization.bumicerts(did),
      icon: BadgeIcon,
      exact: false,
    },
  ];
}

interface OrgTabBarProps {
  did: string;
}

export function OrgTabBar({ did }: OrgTabBarProps) {
  const pathname = usePathname();
  const tabs = buildTabs(did);

  function isActive(tab: Tab): boolean {
    return tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
  }

  return (
    <div className="mt-3">
      {/* Horizontally scrollable on mobile, hidden scrollbar */}
      <div className="overflow-x-auto scrollbar-hidden -mx-4 px-4">
        <div className="flex items-end gap-1 min-w-max border-b border-border">
          {tabs.map((tab) => {
            const active = isActive(tab);
            const Icon = tab.icon;

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "relative flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium transition-colors duration-150 whitespace-nowrap select-none",
                  active
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                {tab.label}

                {/* Underline to highlight the active tab */}
                {active && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground rounded-full" />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
