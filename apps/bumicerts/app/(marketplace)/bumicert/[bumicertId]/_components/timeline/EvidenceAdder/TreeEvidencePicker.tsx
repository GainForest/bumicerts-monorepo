import type { OccurrenceItem } from "@/lib/graphql-dev/queries";
import { formatDate } from "@/lib/utils/date";
import UriEvidencePicker from "./shared/UriEvidenceViewer";
import { getManagedEvidenceTabConfig } from "./shared/evidenceRegistry";

const TreeEvidencePicker = ({
  data,
}: {
  data: OccurrenceItem[];
}) => {
  const tabConfig = getManagedEvidenceTabConfig("trees");

  return (
    <UriEvidencePicker
      tabId="trees"
      data={data}
      icon={tabConfig.icon}
      mutation={tabConfig.attachment}
      getUri={(item) => item.metadata?.uri ?? undefined}
      getPrimary={(item) =>
        item.record?.scientificName ??
        item.record?.vernacularName ??
        "Unknown species"
      }
      getSecondary={(item) => {
        const count = item.record?.individualCount;
        const date = formatDate(
          item.record?.eventDate ?? item.record?.createdAt,
          {
            month: "short",
            day: "numeric",
            year: "numeric",
          },
        );
        const secondary = [
          count != null ? `${count} individual${count !== 1 ? "s" : ""}` : null,
          date,
        ]
          .filter(Boolean)
          .join(" · ");
        return secondary || undefined;
      }}
    />
  );
};

export default TreeEvidencePicker;
