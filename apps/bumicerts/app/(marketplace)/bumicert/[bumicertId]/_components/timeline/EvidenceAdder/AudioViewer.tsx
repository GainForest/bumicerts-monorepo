import { AudioRecordingItem } from "@/lib/graphql-dev/queries";
import CheckRow from "./shared/CheckRow";
import { useState, type Dispatch, type SetStateAction } from "react";
import { MicIcon } from "lucide-react";
import { ListEmpty, ListLayout } from "./shared/RecordList";
import ManageOption from "./shared/ManageOption";
import OptionalNote, { OptionalNoteProps } from "./shared/OptionalNote";
import Mutator, { AttachmentData } from "./shared/Mutator";
import { SubjectInfo } from ".";

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const AudioViewer = ({
  data,
  description,
  setDescription,
  isSubmitting,
  setIsSubmitting,
  ...props
}: {
  data: AudioRecordingItem[];
  isSubmitting: boolean;
  setIsSubmitting: Dispatch<SetStateAction<boolean>>;
} & OptionalNoteProps &
  SubjectInfo) => {
  const [selectedUris, setSelectedUris] = useState<Set<string>>(new Set());

  const availableUris = new Set<string>();
  data.forEach((item) => {
    const uri = item.metadata?.uri;
    if (uri) {
      availableUris.add(uri);
    }
  });

  const selectedContents = Array.from(selectedUris).filter((uri) =>
    availableUris.has(uri),
  );

  const toggle = (uri: string) => {
    setSelectedUris((prev) => {
      const next = new Set(prev);
      if (next.has(uri)) {
        next.delete(uri);
      } else {
        next.add(uri);
      }
      return next;
    });
  };

  if (data.length === 0) {
    return <ListEmpty tabId="audio" />;
  }

  const computedMutationData: AttachmentData = {
    title: "Audio Recordings",
    contentType: "audio",
    description,
    subjectInfo: {
      uri: props.activityUri,
      cid: props.activityCid,
    },
    contents: selectedContents,
  };

  return (
    <>
      <ListLayout>
        {data.map((item) => {
          const uri = item.metadata?.uri;
          if (!uri) return null;
          return (
            <CheckRow
              key={uri}
              selected={selectedUris.has(uri)}
              onToggle={() => toggle(uri)}
              icon={MicIcon}
              primary={item.record?.name ?? "Untitled recording"}
              secondary={formatDate(
                ((
                  item.record?.metadata as
                    | Record<string, unknown>
                    | null
                    | undefined
                )?.["recordedAt"] as string) ??
                  item.record?.createdAt ??
                  undefined,
              )}
              disabled={isSubmitting}
            />
          );
        })}
      </ListLayout>
      <ManageOption type="audio" />
      <OptionalNote
        description={description}
        setDescription={setDescription}
        disabled={isSubmitting}
      />
      <Mutator
        data={computedMutationData}
        isSubmitting={isSubmitting}
        setIsSubmitting={setIsSubmitting}
        onSuccess={() => {
          setDescription({ blocks: [] });
          setSelectedUris(new Set());
        }}
      />
    </>
  );
};

export default AudioViewer;
