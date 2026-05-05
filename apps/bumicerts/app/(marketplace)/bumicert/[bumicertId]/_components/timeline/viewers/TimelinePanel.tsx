import type { AttachmentItem } from "@/graphql/indexer/queries/attachments";
import { TimelineEntryList } from "./TimelineEntryList";
import { TimelineEmpty } from "./shared/TimelineEmpty";
import { TimelineSkeleton } from "./shared/TimelineSkeleton";
import { TimelineViewerStoreProvider } from "./shared/timelineViewerStore";

interface TimelinePanelProps {
  entries: AttachmentItem[];
  isLoading: boolean;
  isOwner: boolean;
}

export function TimelinePanel({ entries, isLoading, isOwner }: TimelinePanelProps) {
  return (
    <TimelineViewerStoreProvider isOwner={isOwner}>
      <div className="space-y-1">
        {isLoading ? (
          <TimelineSkeleton />
        ) : entries.length === 0 ? (
          <TimelineEmpty />
        ) : (
          <TimelineEntryList entries={entries} />
        )}
      </div>
    </TimelineViewerStoreProvider>
  );
}
