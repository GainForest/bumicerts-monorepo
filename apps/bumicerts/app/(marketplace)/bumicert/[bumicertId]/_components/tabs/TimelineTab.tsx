"use client";

import { motion } from "framer-motion";
import type { AttachmentItem } from "@/graphql/indexer/queries/attachments";
import { indexerTrpc } from "@/lib/trpc/indexer/client";
import { EvidenceAdder } from "../timeline/EvidenceAdder";
import { TimelinePanel } from "../timeline/viewers/TimelinePanel";

interface TimelineTabProps {
  organizationDid: string;
  activityUri: string;
  activityCid: string;
  bumicertTitle: string;
  isOwner: boolean;
}

export function TimelineTab({
  organizationDid,
  activityUri,
  activityCid,
  bumicertTitle,
  isOwner,
}: TimelineTabProps) {
  const { data, isLoading } = indexerTrpc.context.attachments.useQuery({
    did: organizationDid,
  });

  const entries = getEntriesForActivity(data, activityUri);

  return (
    <motion.div
      key="timeline"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
      className="py-1"
    >
      <div
        className={`grid grid-cols-1 gap-6 ${isOwner ? "xl:grid-cols-[minmax(0,1fr)_300px]" : ""}`}
      >
        <div className={isOwner ? "order-2 xl:order-1" : undefined}>
          <TimelinePanel entries={entries} isLoading={isLoading} isOwner={isOwner} />
        </div>

        {isOwner && (
          <div className="order-1 xl:order-2 xl:sticky xl:top-24 xl:self-start">
            <div className="rounded-2xl border border-border/40 bg-muted/15 p-4">
              <EvidenceAdder
                activityUri={activityUri}
                activityCid={activityCid}
                bumicertTitle={bumicertTitle}
                organizationDid={organizationDid}
              />
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function getEntriesForActivity(
  data: AttachmentItem[] | undefined,
  activityUri: string,
): AttachmentItem[] {
  const items = data ?? [];
  return items.filter((item) =>
    item.record?.subjects?.some((subject) => subject?.uri === activityUri),
  );
}
