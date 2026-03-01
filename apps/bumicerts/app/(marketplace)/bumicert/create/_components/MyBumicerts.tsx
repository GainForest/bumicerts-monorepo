"use client";

import { trpcApi } from "@/components/providers/TrpcProvider";
import { useAtprotoStore } from "@/components/stores/atproto";
import { Button } from "@/components/ui/button";
import { allowedPDSDomains } from "@/lib/config/gainforest-sdk";
import { links } from "@/lib/links";
import { parseAtUri } from "gainforest-sdk/utilities/atproto";
import { getEcocertsFromClaimActivities as getBumicertsFromClaimActivities } from "gainforest-sdk/utilities/hypercerts";
import { ArrowUpRight, Inbox, Loader2 } from "lucide-react";
import Link from "next/link";
import React, { useMemo } from "react";

const MyBumicerts = () => {
  const auth = useAtprotoStore((state) => state.auth);
  const {
    data: activityClaims,
    isPending: isPendingActivityClaims,
    error: errorActivityClaims,
  } = trpcApi.hypercerts.claim.activity.getAll.useQuery(
    {
      did: auth.authenticated ? auth.user.did : "",
      pdsDomain: allowedPDSDomains[0],
    },
    {
      enabled: auth.authenticated,
    }
  );
  const {
    data: organizationInfo,
    isPending: isPendingOrganizationInfo,
    error: errorOrganizationInfo,
  } = trpcApi.gainforest.organization.info.get.useQuery(
    {
      did: auth.authenticated ? auth.user.did : "",
      pdsDomain: allowedPDSDomains[0],
    },
    {
      enabled: auth.authenticated,
    }
  );
  const bumicerts = useMemo(() => {
    if (!auth.authenticated) return undefined;
    if (!activityClaims || !organizationInfo) return undefined;
    const bumicerts = getBumicertsFromClaimActivities(
      [
        {
          activities: activityClaims.activities,
          organizationInfo: organizationInfo.value,
          repo: {
            did: auth.user.did,
          },
        },
      ],
      allowedPDSDomains[0]
    );
    return bumicerts;
  }, [activityClaims, organizationInfo, auth]);
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
          {bumicerts.map((bumicert) => (
            <div
              key={bumicert.claimActivity.uri}
              className="flex items-center justify-between p-1"
            >
              <span className="ml-2">{bumicert.claimActivity.value.title}</span>
              <Link
                href={links.bumicert.view(
                  `${bumicert.repo.did}-${
                    parseAtUri(bumicert.claimActivity.uri).rkey
                  }`
                )}
              >
                <Button variant="link" size={"sm"}>
                  View <ArrowUpRight />
                </Button>
              </Link>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default MyBumicerts;
