import type { AudioRecordingItem } from "@/lib/graphql-dev/queries";
import { formatDate } from "@/lib/utils/date";
import UriEvidencePicker from "./shared/UriEvidenceViewer";
import { getManagedEvidenceTabConfig } from "./shared/evidenceRegistry";

const AudioEvidencePicker = ({
  data,
}: {
  data: AudioRecordingItem[];
}) => {
  const tabConfig = getManagedEvidenceTabConfig("audio");

  return (
    <UriEvidencePicker
      tabId="audio"
      data={data}
      icon={tabConfig.icon}
      mutation={tabConfig.attachment}
      getUri={(item) => item.metadata?.uri ?? undefined}
      getPrimary={(item) => item.record?.name ?? "Untitled recording"}
      getSecondary={(item) =>
        formatDate(
          getRecordedAt(item.record?.metadata) ?? item.record?.createdAt,
          {
            month: "short",
            day: "numeric",
            year: "numeric",
          },
        )
      }
    />
  );
};

function getRecordedAt(metadata: unknown): string | undefined {
  if (typeof metadata !== "object" || metadata === null) {
    return undefined;
  }

  if (!("recordedAt" in metadata)) {
    return undefined;
  }

  const recordedAt = metadata.recordedAt;
  if (typeof recordedAt !== "string") {
    return undefined;
  }

  return recordedAt;
}

export default AudioEvidencePicker;
