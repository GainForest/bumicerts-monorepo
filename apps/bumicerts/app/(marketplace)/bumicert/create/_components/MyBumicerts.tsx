"use client";

import { useAtprotoStore } from "@/components/stores/atproto";
import { Button } from "@/components/ui/button";
import { links } from "@/lib/links";
import { ArrowUpRightIcon, InboxIcon, Loader2Icon } from "lucide-react";
import Link from "next/link";
import React, { useMemo } from "react";
import { indexerTrpc } from "@/lib/trpc/indexer/client";
import type { GraphQLHcActivityItem } from "@/lib/adapters";

const MyBumicerts = () => {
  const auth = useAtprotoStore((state) => state.auth);

  const {
    data: activitiesData,
    isPending: isPendingActivityClaims,
    error: errorActivityClaims,
  } = indexerTrpc.activities.list.useQuery(
    { did: auth.authenticated ? auth.user.did : "" },
    { enabled: auth.authenticated }
  );

  const bumicerts = useMemo(() => {
    if (!auth.authenticated) return undefined;
    if (!activitiesData) return undefined;
    return Array.isArray(activitiesData) ? (activitiesData as GraphQLHcActivityItem[]) : [];
  }, [activitiesData, auth]);

  return (
    <section className="mt-4 flex flex-col rounded-xl gap-2">
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

      {bumicerts === undefined ? (
        <div className="mt-2 flex flex-col items-center justify-center py-12 text-center rounded-lg border border-border/50 bg-muted/50">
          <Loader2Icon className="size-5 text-primary animate-spin opacity-50" />
          <span className="mt-2 text-muted-foreground">
            Loading bumicerts...
          </span>
        </div>
      ) : bumicerts.length === 0 ? (
        <div className="mt-2 flex flex-col items-center justify-center py-12 text-center rounded-lg border border-border/50 bg-muted/50">
          <InboxIcon className="size-8 text-muted-foreground opacity-50" />
          <span className="mt-2 text-muted-foreground">
            No bumicerts found.
          </span>
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-border border border-border rounded-xl p-1 mt-2">
          {bumicerts.map((bumicert) => {
            const did = bumicert.metadata?.did ?? "";
            const rkey = bumicert.metadata?.rkey ?? "";
            const uri = bumicert.metadata?.uri ?? "";

            return (
              <div
                key={uri}
                className="flex items-center justify-between p-1"
              >
                <span className="ml-2">{bumicert.record?.title ?? "Untitled"}</span>
                <Link href={links.bumicert.view(`${did}-${rkey}`)}>
                  <Button variant="link" size={"sm"}>
                    View <ArrowUpRightIcon />
                  </Button>
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default MyBumicerts;
