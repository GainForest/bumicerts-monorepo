"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CirclePlusIcon, InboxIcon, TriangleAlertIcon } from "lucide-react";
import Link from "next/link";
import { useAtprotoStore } from "@/components/stores/atproto";
import { Button } from "@/components/ui/button";
import {
  BumicertCardSkeleton,
  BumicertCardVisual,
} from "@/app/(marketplace)/explore/_components/BumicertCard";
import {
  activitiesToBumicertDataArray,
  type GraphQLHcActivityItem,
} from "@/lib/adapters";
import { links } from "@/lib/links";
import { indexerTrpc } from "@/lib/trpc/indexer/client";

const MyBumicerts = () => {
  const auth = useAtprotoStore((state) => state.auth);

  const {
    data: activitiesData,
    error,
    isPending,
  } = indexerTrpc.activities.list.useQuery(
    { did: auth.authenticated ? auth.user.did : "" },
    { enabled: auth.authenticated },
  );

  const bumicerts = (() => {
    if (!auth.authenticated) return undefined;
    if (!activitiesData) return undefined;
    if (!Array.isArray(activitiesData)) return [];

    return activitiesToBumicertDataArray(
      activitiesData as GraphQLHcActivityItem[],
    );
  })();

  return (
    <section className="mt-4 flex flex-col gap-4 rounded-xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold font-serif text-muted-foreground">
          My Bumicerts
        </h1>
        {bumicerts !== undefined && (
          <span className="py-1 px-4 bg-muted text-muted-foreground font-bold rounded-lg">
            {bumicerts.length}
          </span>
        )}
      </div>

      {error ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
          className="flex h-48 flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border bg-muted/30 text-center"
        >
          <TriangleAlertIcon className="size-8 text-muted-foreground opacity-60" />
          <div className="space-y-1">
            <p
              className="text-xl font-semibold text-muted-foreground"
              style={{ fontFamily: "var(--font-garamond-var)" }}
            >
              Couldn&apos;t load bumicerts
            </p>
            <p className="text-sm text-muted-foreground">
              {error.message || "Please try again in a moment."}
            </p>
          </div>
        </motion.div>
      ) : isPending || bumicerts === undefined ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <BumicertCardSkeleton key={index} />
          ))}
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {bumicerts.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
              className="flex h-48 flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border text-center"
            >
              <InboxIcon className="size-8 text-muted-foreground opacity-50" />
              <div className="space-y-1">
                <p
                  className="text-xl font-semibold text-muted-foreground"
                  style={{ fontFamily: "var(--font-garamond-var)" }}
                >
                  No bumicerts yet
                </p>
                <p className="text-sm text-muted-foreground">
                  Create your first bumicert to get started.
                </p>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href={links.bumicert.createWithDraftId("0")}>
                  <CirclePlusIcon />
                  Create bumicert
                </Link>
              </Button>
            </motion.div>
          ) : (
            <div key="grid" className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {bumicerts.map((bumicert) => (
                <motion.div
                  key={bumicert.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
                >
                  <Link
                    href={links.bumicert.view(bumicert.id)}
                    className="block h-full"
                  >
                    <BumicertCardVisual
                      coverImage={bumicert.coverImageUrl}
                      logoUrl={bumicert.logoUrl}
                      title={bumicert.title}
                      organizationName={bumicert.organizationName}
                      objectives={bumicert.objectives}
                      description={bumicert.shortDescription}
                      className="h-full"
                    />
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      )}
    </section>
  );
};

export default MyBumicerts;
