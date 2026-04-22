"use client";

import { Button } from "@/components/ui/button";
import { BumicertsLeafletEditorProps } from "@/components/ui/leaflet-editor";
import { trpc } from "@/lib/trpc/client";
import { indexerTrpc } from "@/lib/trpc/indexer/client";
import { formatError } from "@/lib/utils/trpc-errors";
import { ArrowRightIcon } from "lucide-react";
import { useState } from "react";

export type AttachmentData = {
  title: string;
  contentType: string;
  description?: BumicertsLeafletEditorProps["content"];
  contents: Array<string | File>;
  subjectInfo: {
    uri: string;
    cid: string;
  };
};

const Mutator = ({
  data,
  isSubmitting,
  setIsSubmitting,
  onSuccess,
}: {
  data: AttachmentData;
  isSubmitting: boolean;
  setIsSubmitting: React.Dispatch<React.SetStateAction<boolean>>;
  onSuccess?: () => void;
}) => {
  const indexerUtils = indexerTrpc.useUtils();

  const createAttachment = trpc.context.attachment.create.useMutation();
  const [errorMessage, setErrorMessage] = useState<string>();

  const { title, contentType, description, contents, subjectInfo } = data;

  const mutate = async () => {
    if (contents.length === 0) return;
    setErrorMessage(undefined);
    setIsSubmitting(true);
    const hasDescription = description && description.blocks.length > 0;

    try {
      await createAttachment.mutateAsync({
        title,
        contentType,
        subjects: [
          {
            $type: "com.atproto.repo.strongRef",
            uri: subjectInfo.uri,
            cid: subjectInfo.cid,
          },
        ],
        content: contents.map((content) => {
          if (typeof content === "string") {
            return { $type: "org.hypercerts.defs#uri", uri: content };
          } else {
            return { $type: "org.hypercerts.defs#smallBlob", blob: content };
          }
        }),
        ...(hasDescription ? { description } : {}),
      });
      onSuccess?.();

      await indexerUtils.context.attachments.invalidate();
    } catch (e) {
      setErrorMessage(formatError(e));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Error / success feedback */}
      {errorMessage && (
        <p className="text-sm text-destructive">{errorMessage}</p>
      )}

      {/* Submit */}
      <Button
        onClick={mutate}
        disabled={isSubmitting || data.contents.length === 0}
        className="w-full"
      >
        {isSubmitting
          ? "Linking…"
          : data.contents.length === 0
            ? "Select records to link"
            : `Link ${data.contents.length} selection${data.contents.length !== 1 ? "s" : ""}`}
        <ArrowRightIcon />
      </Button>
    </>
  );
};

export default Mutator;
