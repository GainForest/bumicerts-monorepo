"use client";

import { useAtprotoStore } from "@/components/stores/atproto";
import { Button } from "@/components/ui/button";
import { BumicertsLeafletEditorProps } from "@/components/ui/leaflet-editor";
import { toSerializableFile } from "@/lib/mutations-utils";
import { trpc } from "@/lib/trpc/client";
import { indexerTrpc } from "@/lib/trpc/indexer/client";
import { formatError } from "@/lib/utils/trpc-errors";
import { ArrowRightIcon, Loader2Icon } from "lucide-react";
import { useState } from "react";
import { useEvidenceAdderStore } from "./evidenceAdderStore";
import {
  buildOptimisticAttachmentItem,
  type OptimisticAttachmentContent,
} from "./optimisticAttachmentItem";

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
  onSuccess,
}: {
  data: AttachmentData;
  onSuccess?: () => void;
}) => {
  const isSubmitting = useEvidenceAdderStore((state) => state.isSubmitting);
  const setIsSubmitting = useEvidenceAdderStore(
    (state) => state.setIsSubmitting,
  );
  const viewerDid = useAtprotoStore((state) => state.auth.user?.did ?? null);
  const organizationDid = useEvidenceAdderStore((state) => state.organizationDid);
  const indexerUtils = indexerTrpc.useUtils();

  const createAttachment = trpc.context.attachment.create.useMutation();
  const [errorMessage, setErrorMessage] = useState<string>();

  const { title, contentType, description, contents, subjectInfo } = data;

  const mutate = async () => {
    if (contents.length === 0) return;

    setErrorMessage(undefined);
    setIsSubmitting(true);

    try {
      const hasDescription = description && description.blocks.length > 0;
      const resolvedContents = await Promise.all(
        contents.map(async (content) => {
          if (typeof content === "string") {
            return content;
          }

          return toSerializableFile(content);
        }),
      );

      const created = await createAttachment.mutateAsync({
        title,
        contentType,
        subjects: [
          {
            $type: "com.atproto.repo.strongRef",
            uri: subjectInfo.uri,
            cid: subjectInfo.cid,
          },
        ],
        content: resolvedContents.map((content) => {
          if (typeof content === "string") {
            return { $type: "org.hypercerts.defs#uri", uri: content };
          } else {
            return { $type: "org.hypercerts.defs#smallBlob", blob: content };
          }
        }),
        ...(hasDescription ? { description } : {}),
      });

      if (organizationDid) {
        const optimisticContents: OptimisticAttachmentContent[] =
          resolvedContents.map((content) => {
            if (typeof content === "string") {
              return content;
            }

            const mimeType =
              content.type.length > 0
                ? content.type
                : "application/octet-stream";

            return {
              name: content.name,
              type: mimeType,
              size: content.size,
              dataUrl: `data:${mimeType};base64,${content.data}`,
            };
          });

        const optimisticItem = buildOptimisticAttachmentItem({
          did: viewerDid ?? organizationDid,
          uri: created.uri,
          rkey: created.rkey,
          cid: created.cid,
          title,
          contentType,
          description,
          subjectInfo,
          contents: optimisticContents,
        });

        const applyOptimisticUpdate = () => {
          indexerUtils.context.attachments.setData(
            { did: organizationDid },
            (previous) => {
              const current = previous ?? [];
              const deduped = current.filter(
                (item) => item.metadata?.rkey !== created.rkey,
              );
              return [optimisticItem, ...deduped];
            },
          );
        };

        applyOptimisticUpdate();
        onSuccess?.();

        try {
          await indexerUtils.context.attachments.invalidate({
            did: organizationDid,
          });
          applyOptimisticUpdate();
        } catch {
          applyOptimisticUpdate();
        }
      } else {
        onSuccess?.();

        try {
          await indexerUtils.context.attachments.invalidate();
        } catch {}
      }
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
        {isSubmitting ? <Loader2Icon className="animate-spin" /> : null}
        {isSubmitting
          ? "Linking…"
          : data.contents.length === 0
            ? "Select evidence to link"
            : `Link ${data.contents.length} item${data.contents.length !== 1 ? "s" : ""}`}
        {!isSubmitting ? <ArrowRightIcon /> : null}
      </Button>
    </>
  );
};

export default Mutator;
