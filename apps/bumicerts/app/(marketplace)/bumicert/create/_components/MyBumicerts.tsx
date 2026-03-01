"use client";

import { useAtprotoStore } from "@/components/stores/atproto";
import { Button } from "@/components/ui/button";
import { links } from "@/lib/links";
import { parseAtUri } from "@gainforest/atproto-mutations-next";
import { ArrowUpRight, Inbox, Loader2 } from "lucide-react";
import Link from "next/link";
import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { graphqlClient } from "@/lib/graphql/client";
import { graphql } from "@/lib/graphql/tada";
import { queryKeys } from "@/lib/query-keys";

// Query to get activities for current user
const MyActivitiesQuery = graphql(`
  query MyActivities($did: String!) {
    hypercerts {
      activities(where: { did: $did }, order: DESC, sortBy: CREATED_AT) {
        records {
          meta {
            did
            uri
            rkey
          }
          title
        }
      }
    }
  }
`);

interface ActivityRecord {
  meta: {
    did: string | null;
    uri: string | null;
    rkey: string | null;
  } | null;
  title: string | null;
}

const MyBumicerts = () => {
  const auth = useAtprotoStore((state) => state.auth);

  const {
    data: activitiesData,
    isPending: isPendingActivityClaims,
    error: errorActivityClaims,
  } = useQuery({
    queryKey: queryKeys.activities.byDid(auth.authenticated ? auth.user.did : undefined),
    queryFn: async () => {
      if (!auth.authenticated) return { records: [] };
      const response = await graphqlClient.request(MyActivitiesQuery, {
        did: auth.user.did,
      });
      return {
        records: (response.hypercerts?.activities?.records ?? []) as ActivityRecord[],
      };
    },
    enabled: auth.authenticated,
    staleTime: 30 * 1000, // 30 seconds
  });

  const bumicerts = useMemo(() => {
    if (!auth.authenticated) return undefined;
    if (!activitiesData) return undefined;
    return activitiesData.records;
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
          <Loader2 className="size-5 text-primary animate-spin opacity-50" />
          <span className="mt-2 text-muted-foreground">
            Loading bumicerts...
          </span>
        </div>
      ) : bumicerts.length === 0 ? (
        <div className="mt-2 flex flex-col items-center justify-center py-12 text-center rounded-lg border border-border/50 bg-muted/50">
          <Inbox className="size-8 text-muted-foreground opacity-50" />
          <span className="mt-2 text-muted-foreground">
            No bumicerts found.
          </span>
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-border border border-border rounded-xl p-1 mt-2">
          {bumicerts.map((bumicert) => {
            const did = bumicert.meta?.did ?? "";
            const rkey = bumicert.meta?.rkey ?? "";
            const uri = bumicert.meta?.uri ?? "";

            return (
              <div
                key={uri}
                className="flex items-center justify-between p-1"
              >
                <span className="ml-2">{bumicert.title ?? "Untitled"}</span>
                <Link href={links.bumicert.view(`${did}-${rkey}`)}>
                  <Button variant="link" size={"sm"}>
                    View <ArrowUpRight />
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
