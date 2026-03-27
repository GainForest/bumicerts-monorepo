"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRightIcon, PlusIcon } from "lucide-react";
import BumicertIcon from "@/icons/BumicertIcon";
import { links } from "@/lib/links";
import { Skeleton } from "@/components/ui/skeleton";
import { indexerTrpc } from "@/lib/trpc/indexer/client";
import type { OrganizationData } from "@/lib/types";
import { activitiesToBumicertDataArray, type GraphQLHcActivityItem } from "@/lib/adapters";

interface BumicertsPreviewProps {
  organization: OrganizationData;
}

/**
 * Compact 2-card preview of the organisation's bumicerts.
 * Fetches the first 2 activities and renders them as mini cards.
 * "View all" links to the bumicerts management page.
 */
export function BumicertsPreview({ organization }: BumicertsPreviewProps) {
  const { data: orgData, isLoading } = indexerTrpc.organization.byDid.useQuery(
    { did: organization.did }
  );
  const data = orgData
    ? activitiesToBumicertDataArray((orgData.activities as GraphQLHcActivityItem[]).slice(0, 2))
    : undefined;

  const bumicerts = data ?? [];

  return (
    <section className="py-4 space-y-3">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BumicertIcon className="h-4 w-4 text-primary" />
          <span className="text-xs uppercase tracking-[0.15em] text-muted-foreground font-medium">
            Bumicerts
          </span>
        </div>
        <Link
          href={links.upload.bumicerts}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          View all
          <ArrowRightIcon className="h-3 w-3" />
        </Link>
      </div>

      {/* Bumicert preview cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Skeleton className="h-36 rounded-xl" />
          <Skeleton className="h-36 rounded-xl" />
        </div>
      ) : bumicerts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {bumicerts.map((b, i) => (
            <motion.div
              key={b.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.4,
                delay: i * 0.05,
                ease: [0.25, 0.1, 0.25, 1],
              }}
            >
              <Link
                href={links.bumicert.view(b.id)}
                className="group flex gap-3 p-3 rounded-xl border border-border hover:border-primary/30 hover:bg-primary/[0.02] transition-all duration-300 h-full"
              >
                {/* Cover thumbnail */}
                <div className="relative h-16 w-16 rounded-lg overflow-hidden bg-muted shrink-0">
                  {b.coverImageUrl ? (
                    <Image
                      src={b.coverImageUrl}
                      alt={b.title}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BumicertIcon className="h-6 w-6 text-muted-foreground/40" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm font-medium text-foreground truncate"
                    style={{ fontFamily: "var(--font-garamond-var)" }}
                  >
                    {b.title || "Untitled"}
                  </p>
                  {b.shortDescription && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5 leading-relaxed">
                      {b.shortDescription}
                    </p>
                  )}
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      ) : (
        /* Empty state — link to create */
        <Link
          href={links.bumicert.create}
          className="group flex items-center gap-4 p-4 rounded-xl border border-dashed border-border hover:border-primary/30 hover:bg-primary/[0.02] transition-all duration-300"
        >
          <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/10 shrink-0">
            <PlusIcon className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">
              Create your first Bumicert
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Record verified environmental impact on-chain.
            </p>
          </div>
          <ArrowRightIcon className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
        </Link>
      )}
    </section>
  );
}
