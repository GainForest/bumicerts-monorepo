import { OccurrenceItem } from "@/lib/graphql-dev/queries";
import CheckRow from "./shared/CheckRow";
import { useState, type Dispatch, type SetStateAction } from "react";
import { TreesIcon } from "lucide-react";
import { ListEmpty, ListLayout } from "./shared/RecordList";
import ManageOption from "./shared/ManageOption";
import OptionalNote, { OptionalNoteProps } from "./shared/OptionalNote";
import { SubjectInfo } from ".";
import Mutator, { AttachmentData } from "./shared/Mutator";

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const TreeViewer = ({
  data,
  description,
  setDescription,
  isSubmitting,
  setIsSubmitting,
  ...props
}: {
  data: OccurrenceItem[];
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
    return <ListEmpty tabId="trees" />;
  }

  const computedMutationData: AttachmentData = {
    title: "Tree Occurrences",
    contentType: "occurrence",
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
          const species =
            item.record?.scientificName ??
            item.record?.vernacularName ??
            "Unknown species";
          const count = item.record?.individualCount;
          const date = formatDate(
            item.record?.eventDate ?? item.record?.createdAt ?? undefined,
          );
          const secondary = [
            count != null
              ? `${count} individual${count !== 1 ? "s" : ""}`
              : null,
            date,
          ]
            .filter(Boolean)
            .join(" · ");
          return (
            <CheckRow
              key={uri}
              selected={selectedUris.has(uri)}
              onToggle={() => toggle(uri)}
              icon={TreesIcon}
              primary={species}
              secondary={secondary || undefined}
              disabled={isSubmitting}
            />
          );
        })}
      </ListLayout>

      <ManageOption type="trees" />
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

export default TreeViewer;
