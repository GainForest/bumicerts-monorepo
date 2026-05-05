import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Trash2Icon } from "lucide-react";
import type { AttachmentItem } from "@/graphql/indexer/queries/attachments";
import { trpc } from "@/lib/trpc/client";
import { indexerTrpc } from "@/lib/trpc/indexer/client";
import { cn } from "@/lib/utils";
import { formatError } from "@/lib/utils/trpc-errors";
import {
  buildTimelineFeedTiles,
  getFeedNoun,
} from "../shared/timelineFeedViewModel";
import { getEvidenceContentTypeLabel } from "../shared/evidenceContentTypeRegistry";
import { useResolvedAttachmentReferences } from "./shared/referenceResolution/useResolvedAttachmentReferences";
import { TimelineDeleteConfirm } from "./shared/TimelineDeleteConfirm";
import { TimelineFeedHeader } from "./shared/TimelineFeedHeader";
import {
  TimelineOptionalNote,
  hasTimelineOptionalNote,
} from "./shared/TimelineOptionalNote";
import { TimelinePreviewPanel } from "./shared/TimelinePreviewPanel";
import { TimelineTileRow } from "./shared/TimelineTileRow";
import { useTimelineViewerStore } from "./shared/timelineViewerStore";

interface TimelineEntryProps {
  item: AttachmentItem;
  index: number;
}

export function TimelineEntry({ item, index }: TimelineEntryProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const isOwner = useTimelineViewerStore((state) => state.isOwner);
  const { references } = useResolvedAttachmentReferences(item.record?.content);
  const entryId = item.metadata?.uri ?? `${item.metadata?.rkey ?? "entry"}-${index}`;
  const tiles = useMemo(
    () =>
      buildTimelineFeedTiles({
        entryId,
        content: item.record?.content,
        references,
      }),
    [entryId, item.record?.content, references],
  );

  const contentLabel = getEvidenceContentTypeLabel(item.record?.contentType);
  const tileCount = tiles.length;
  const noun = getFeedNoun(contentLabel, tileCount);
  const previewTiles = useMemo(() => tiles.filter((tile) => tile.preview), [tiles]);
  const selectedTileId = useTimelineViewerStore(
    (state) => state.selectedPreviewTileByEntryId[entryId] ?? null,
  );
  const setSelectedPreviewTile = useTimelineViewerStore(
    (state) => state.setSelectedPreviewTile,
  );
  const activeTileId =
    selectedTileId && previewTiles.some((tile) => tile.id === selectedTileId)
      ? selectedTileId
      : (previewTiles[0]?.id ?? null);
  const activeInlinePreview = previewTiles.find((tile) => tile.id === activeTileId)?.preview ?? null;
  const shouldShowThumbnailRow = previewTiles.length > 1;
  const shouldUseStackedLayout = isOwner;
  const hasNote = hasTimelineOptionalNote(item.record?.description, item.metadata?.did);

  const indexerUtils = indexerTrpc.useUtils();
  const deleteAttachment = trpc.context.attachment.delete.useMutation();
  const rkey = item.metadata?.rkey;
  const authorDid = item.metadata?.did;

  async function handleDelete() {
    if (!rkey) {
      return;
    }

    setDeleteError(null);
    setIsDeleting(true);
    try {
      await deleteAttachment.mutateAsync({ rkey });

      if (authorDid) {
        indexerUtils.context.attachments.setData({ did: authorDid }, (previous) =>
          (previous ?? []).filter((entry) => entry.metadata?.rkey !== rkey),
        );
      }

      setShowDeleteConfirm(false);

      try {
        if (authorDid) {
          await indexerUtils.context.attachments.invalidate({ did: authorDid });
        } else {
          await indexerUtils.context.attachments.invalidate();
        }
      } catch {}
    } catch (error) {
      setDeleteError(formatError(error));
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <motion.article
      className="border-b border-border/50 py-5"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <div className="flex items-start gap-3">
        <TimelineFeedHeader
          actorDid={item.creatorInfo?.did ?? item.metadata?.did}
          actorName={item.creatorInfo?.organizationName}
          itemCount={tileCount}
          noun={noun}
          createdAt={item.record?.createdAt ?? item.metadata?.createdAt}
          className="flex-1"
        />
        {isOwner && rkey && (
          <button
            type="button"
            onClick={() => {
              setShowDeleteConfirm((v) => !v);
              setDeleteError(null);
            }}
            className="rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            aria-label="Remove evidence"
          >
            <Trash2Icon className="h-4 w-4" />
          </button>
        )}
      </div>

      <div
        className={cn(
          "mt-2 grid gap-3",
          !shouldUseStackedLayout && hasNote && "lg:grid-cols-2 lg:items-start lg:gap-x-4",
        )}
      >
        {hasNote ? (
          <div>
            <TimelineOptionalNote
              note={item.record?.description}
              ownerDid={item.metadata?.did}
            />
          </div>
        ) : null}

        <div>
          <TimelinePreviewPanel preview={activeInlinePreview} />
        </div>

        {shouldShowThumbnailRow ? (
          <div className={cn(!shouldUseStackedLayout && "lg:col-span-2")}>
            <TimelineTileRow
              tiles={previewTiles}
              activeTileId={activeTileId}
              onTileClick={(tile) => {
                setSelectedPreviewTile(entryId, tile.id);
              }}
            />
          </div>
        ) : null}
      </div>

      {showDeleteConfirm && rkey && (
        <TimelineDeleteConfirm
          title={item.record?.title ?? "Evidence item"}
          onConfirm={handleDelete}
          onCancel={() => {
            setShowDeleteConfirm(false);
            setDeleteError(null);
          }}
          isDeleting={isDeleting}
          error={deleteError}
        />
      )}
    </motion.article>
  );
}
