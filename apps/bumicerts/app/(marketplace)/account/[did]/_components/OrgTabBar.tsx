"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { HomeIcon, BadgeIcon, HeartIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { links } from "@/lib/links";

interface Tab {
  label: string;
  href: string;
  icon: React.ElementType;
  /** If true, only active on exact match; otherwise prefix match. */
  exact: boolean;
}

type AccountTabBarKind = "organization" | "user";

function buildTabs(did: string, accountKind: AccountTabBarKind): Tab[] {
  if (accountKind === "user") {
    return [
      {
        label: "Bumicerts",
        href: links.account.bumicerts(did),
        icon: BadgeIcon,
        exact: false,
      },
      {
        label: "Donation History",
        href: links.account.donations(did),
        icon: HeartIcon,
        exact: false,
      },
    ];
  }

  return [
    {
      label: "Home",
      href: links.account.byDid(did),
      icon: HomeIcon,
      exact: true,
    },
    {
      label: "Bumicerts",
      href: links.account.bumicerts(did),
      icon: BadgeIcon,
      exact: false,
    },
  ];
}

interface OrgTabBarProps {
  did: string;
  accountKind?: AccountTabBarKind;
}

export function OrgTabBar({
  did,
  accountKind = "organization",
}: OrgTabBarProps) {
  const pathname = usePathname();
  const tabs = buildTabs(did, accountKind);

  function isActive(tab: Tab): boolean {
    if (
      accountKind === "user" &&
      tab.href === links.account.bumicerts(did) &&
      pathname === links.account.byDid(did)
    ) {
      return true;
    }

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
