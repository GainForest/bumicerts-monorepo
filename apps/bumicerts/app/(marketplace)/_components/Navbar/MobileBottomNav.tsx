"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HomeIcon, CompassIcon, Building2Icon, BadgePlusIcon } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const MOBILE_NAV = [
  { href: "/", label: "Home", Icon: HomeIcon, exact: true },
  { href: "/explore", label: "Explore", Icon: CompassIcon, exact: false },
  { href: "/organization/all", label: "Orgs", Icon: Building2Icon, exact: false },
  { href: "/bumicert/create", label: "Create", Icon: BadgePlusIcon, exact: false },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-background/90 backdrop-blur-xl border-t border-border">
      <div className="flex items-center justify-around py-2 px-4">
        {MOBILE_NAV.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href) && item.href !== "/";
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              <motion.div
                whileTap={{ scale: 0.85 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="relative"
              >
                {isActive && (
                  <motion.div
                    layoutId="mobile-nav-bg"
                    className="absolute -inset-1 bg-primary/10 rounded-lg"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <item.Icon className="h-5 w-5 relative z-10" />
              </motion.div>
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
