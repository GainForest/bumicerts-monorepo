import type { AttachmentItem } from "@/graphql/indexer/queries/attachments";
import { TimelineEntry } from "./TimelineEntry";

interface TimelineEntryListProps {
  entries: AttachmentItem[];
}

export function TimelineEntryList({ entries }: TimelineEntryListProps) {
  return (
    <div className="flex flex-col gap-0">
      {entries.map((item, index) => (
        <TimelineEntry key={item.metadata?.uri ?? index} item={item} index={index} />
      ))}
    </div>
  );
}
