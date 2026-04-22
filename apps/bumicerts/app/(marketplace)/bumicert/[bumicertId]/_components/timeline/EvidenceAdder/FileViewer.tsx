import { useState, type Dispatch, type SetStateAction } from "react";
import FileInput from "@/components/ui/FileInput";
import { ListLayout } from "./shared/RecordList";
import OptionalNote, { OptionalNoteProps } from "./shared/OptionalNote";
import { SubjectInfo } from ".";
import Mutator, { AttachmentData } from "./shared/Mutator";

const BROAD_SUPPORTED_FILE_TYPES = [
  "image/*",
  "audio/*",
  "video/*",
  "application/*",
  "text/*",
];

function toFileKey(file: File): string {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

const FileViewer = ({
  description,
  setDescription,
  isSubmitting,
  setIsSubmitting,
  ...props
}: {
  isSubmitting: boolean;
  setIsSubmitting: Dispatch<SetStateAction<boolean>>;
} & OptionalNoteProps &
  SubjectInfo) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [filePickerValue, setFilePickerValue] = useState<File | null>(null);
  const [filePickerKey, setFilePickerKey] = useState(0);

  const appendFile = (file: File) => {
    setSelectedFiles((prev) => {
      const next = [...prev];
      const existing = new Set(prev.map(toFileKey));

      const key = toFileKey(file);
      if (!existing.has(key)) {
        next.push(file);
      }

      return next;
    });
  };

  const removeFile = (fileToRemove: File) => {
    const removeKey = toFileKey(fileToRemove);
    setSelectedFiles((prev) =>
      prev.filter((file) => toFileKey(file) !== removeKey),
    );
  };

  const computedMutationData: AttachmentData = {
    title: "Files",
    contentType: "evidence",
    description,
    subjectInfo: {
      uri: props.activityUri,
      cid: props.activityCid,
    },
    contents: selectedFiles,
  };

  return (
    <>
      <div className="flex flex-col gap-2">
        <FileInput
          key={filePickerKey}
          placeholder="Add a file as evidence"
          value={filePickerValue ?? undefined}
          supportedFileTypes={BROAD_SUPPORTED_FILE_TYPES}
          maxSizeInMB={4}
          onFileChange={(file) => {
            if (isSubmitting) return;
            if (!file) {
              setFilePickerValue(null);
              return;
            }

            appendFile(file);
            setFilePickerValue(null);
            setFilePickerKey((prev) => prev + 1);
          }}
          className={`min-h-[120px] ${isSubmitting ? "pointer-events-none opacity-70" : ""}`}
        />

        {selectedFiles.length > 0 ? (
          <ListLayout>
            {selectedFiles.map((file) => {
              const key = toFileKey(file);
              return (
                <div
                  key={key}
                  className="w-full bg-background flex items-center gap-2.5 px-3 py-2 rounded-xl border"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {formatFileSize(file.size)}
                      {file.type ? ` · ${file.type}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                    onClick={() => removeFile(file)}
                    disabled={isSubmitting}
                  >
                    Remove
                  </button>
                </div>
              );
            })}
          </ListLayout>
        ) : (
          <div className="rounded-xl bg-muted/60 px-3 py-2 text-xs text-muted-foreground text-center">
            No files selected yet.
          </div>
        )}
      </div>

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
          setSelectedFiles([]);
        }}
      />
    </>
  );
};

export default FileViewer;
