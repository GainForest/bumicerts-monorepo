"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { TAB_IDS, TAB_LABELS, useTabParam, type TabId } from "../_hooks/useTabParam";

export function BumicertTabs() {
  const [tab, setTab] = useTabParam();

  return (
    <div className="overflow-x-auto scrollbar-hidden -mx-4 px-4">
      <div className="flex items-end min-w-max border-b border-border">
        {TAB_IDS.map((id: TabId) => {
          const isActive = tab === id;
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                "relative flex items-center px-4 py-2.5 text-sm font-medium transition-colors duration-150 whitespace-nowrap select-none cursor-pointer",
                isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {TAB_LABELS[id]}
              {isActive && (
                <motion.div
                  layoutId="bumicert-tab-indicator"
                  className="absolute bottom-0 left-0 right-0 h-[2px] bg-foreground rounded-full"
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
