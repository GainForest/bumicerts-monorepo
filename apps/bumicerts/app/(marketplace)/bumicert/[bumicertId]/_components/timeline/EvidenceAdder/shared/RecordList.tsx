"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLinkIcon } from "lucide-react";
import Link from "next/link";
import {
  getManagedEvidenceTabConfig,
  type ManagedEvidenceTabId,
} from "./evidenceRegistry";

export function ListSkeleton() {
  return (
    <div className="flex flex-col gap-1.5">
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-11 w-full rounded-xl" />
      ))}
    </div>
  );
}

export function ListEmpty({ tabId }: { tabId: ManagedEvidenceTabId }) {
  const tab = getManagedEvidenceTabConfig(tabId);
  return (
    <div className="flex flex-col items-center gap-2 py-6 text-center">
      <p className="text-xs text-muted-foreground">
        No {tab.emptyLabel} uploaded yet.
      </p>
      <Link
        href={tab.manageHref}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
      >
        Upload {tab.emptyLabel}
        <ExternalLinkIcon className="h-3 w-3" />
      </Link>
    </div>
  );
}

export function ListLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full relative rounded-xl overflow-hidden bg-muted/80">
      <div className="w-full max-h-72 overflow-y-auto p-1.5">
        <div className="flow-root pt-2 py-4">
          <div className="flex flex-col gap-1">{children}</div>
        </div>
      </div>
      <div className="absolute top-0 left-0 right-0 h-4 bg-linear-to-t from-transparent via-muted/80 to-muted/80 pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 right-0 h-8 bg-linear-to-b from-transparent to-muted/80 pointer-events-none"></div>
    </div>
  );
}
