"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface SectionDef {
  id: string;
  label: string;
}

interface BumicertTabsProps {
  sections: SectionDef[];
  activeSection: string | null;
}

export function BumicertTabs({ sections, activeSection }: BumicertTabsProps) {
  const tabRefs = useRef<Map<string, HTMLAnchorElement>>(new Map());

  // Auto-scroll the active tab into view inside the tab bar.
  useEffect(() => {
    if (!activeSection) return;
    const el = tabRefs.current.get(activeSection);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [activeSection]);

  return (
    <div className="overflow-x-auto scrollbar-hidden -mx-4 px-4">
      <div className="flex items-end min-w-max border-b border-border">
        {sections.map((section) => {
          const isActive = activeSection === section.id;
          return (
            <a
              key={section.id}
              href={`#${section.id}`}
              ref={(el) => {
                if (el) tabRefs.current.set(section.id, el);
                else tabRefs.current.delete(section.id);
              }}
              className={cn(
                "relative flex items-center px-4 py-2.5 text-sm font-medium transition-colors duration-150 whitespace-nowrap select-none",
                isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {section.label}
              {isActive && (
                <motion.div
                  layoutId="bumicert-tab-indicator"
                  className="absolute bottom-0 left-0 right-0 h-[2px] bg-foreground rounded-full"
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}
            </a>
          );
        })}
      </div>
    </div>
  );
}
