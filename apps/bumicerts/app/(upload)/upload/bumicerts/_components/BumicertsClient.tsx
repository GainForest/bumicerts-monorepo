"use client";

import Link from "next/link";
import { CirclePlusIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import Container from "@/components/ui/container";
import { BumicertCardVisual, BumicertCardSkeleton } from "@/app/(marketplace)/explore/_components/BumicertCard";
import { activityToBumicertData, type GraphQLHcActivityItem } from "@/lib/adapters";
import { links } from "@/lib/links";
import { indexerTrpc } from "@/lib/trpc/indexer/client";

// ── Props ─────────────────────────────────────────────────────────────────────

interface BumicertsClientProps {
  did: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function BumicertsClient({ did }: BumicertsClientProps) {
  const { data, isLoading } = indexerTrpc.activities.list.useQuery({ did });

  const activities = (Array.isArray(data) ? data : []) as GraphQLHcActivityItem[];
  const bumicerts = activities.map((a) => activityToBumicertData(a));

  return (
    <Container className="pt-4 pb-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1
          className="text-2xl font-bold"
          style={{ fontFamily: "var(--font-garamond-var)" }}
        >
          Bumicerts
        </h1>
        <Button size="sm" className="rounded-full" asChild>
          <Link href={links.bumicert.create}>
            <CirclePlusIcon />
            Create new
          </Link>
        </Button>
      </div>

      {isLoading ? (
        // Skeleton grid while loading
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <BumicertCardSkeleton key={i} />
          ))}
        </div>
      ) : bumicerts.length === 0 ? (
        // Empty state
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
            className="flex flex-col items-center justify-center h-48 gap-4 rounded-xl border border-dashed border-border text-center"
          >
            <p
              className="text-xl font-semibold text-muted-foreground"
              style={{ fontFamily: "var(--font-garamond-var)" }}
            >
              No bumicerts yet
            </p>
            <p className="text-sm text-muted-foreground">
              Create your first bumicert to get started.
            </p>
            <Button variant="outline" size="sm" asChild>
              <Link href={links.bumicert.create}>
                <CirclePlusIcon />
                Create bumicert
              </Link>
            </Button>
          </motion.div>
        </AnimatePresence>
      ) : (
        // Grid of bumicert cards
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {bumicerts.map((b) => (
            <motion.div
              key={b.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <Link href={links.bumicert.view(b.id)}>
                <BumicertCardVisual
                  coverImage={b.coverImageUrl}
                  logoUrl={b.logoUrl}
                  title={b.title}
                  organizationName={b.organizationName}
                  objectives={b.objectives}
                  description={b.shortDescription}
                />
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </Container>
  );
}
