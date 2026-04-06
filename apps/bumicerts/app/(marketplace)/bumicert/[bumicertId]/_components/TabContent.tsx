"use client";

import { AnimatePresence } from "framer-motion";
import type { BumicertData } from "@/lib/types";
import { useTabParam } from "../_hooks/useTabParam";
import { DescriptionTab } from "./tabs/DescriptionTab";
import { SiteBoundariesTab } from "./tabs/SiteBoundariesTab";
import { DonationsTab } from "./tabs/DonationsTab";
import { TimelineTab } from "./tabs/TimelineTab";

interface TabContentProps {
  bumicert: BumicertData;
  isOwner: boolean;
}

export function TabContent({ bumicert, isOwner }: TabContentProps) {
  const [tab] = useTabParam();

  const activityUri = `at://${bumicert.organizationDid}/org.hypercerts.claim.activity/${bumicert.rkey}`;
  const activityCid = bumicert.cid ?? "";

  return (
    <AnimatePresence mode="wait" initial={false}>
      {tab === "description" && <DescriptionTab key="description" bumicert={bumicert} />}
      {tab === "site-boundaries" && <SiteBoundariesTab key="site-boundaries" bumicert={bumicert} />}
      {tab === "donations" && <DonationsTab key="donations" bumicert={bumicert} />}
      {tab === "timeline" && (
        <TimelineTab
          key="timeline"
          organizationDid={bumicert.organizationDid}
          activityUri={activityUri}
          activityCid={activityCid}
          bumicertTitle={bumicert.title}
          isOwner={isOwner}
        />
      )}
    </AnimatePresence>
  );
}
