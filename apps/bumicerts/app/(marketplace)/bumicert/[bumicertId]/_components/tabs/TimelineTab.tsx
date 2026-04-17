"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ClockIcon,
  FileTextIcon,
  ExternalLinkIcon,
  Trash2Icon,
  AlertTriangleIcon,
} from "lucide-react";
import type { AttachmentItem } from "@/lib/graphql-dev/queries/attachments";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/client";
import { indexerTrpc } from "@/lib/trpc/indexer/client";
import { formatError } from "@/lib/utils/trpc-errors";
import { EvidenceLinker } from "../timeline/EvidenceLinker";
import Image from "next/image";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

function contentTypeLabel(raw: string | null | undefined): string {
  if (!raw) return "Attachment";
  const map: Record<string, string> = {
    report: "Report",
    audit: "Audit",
    evidence: "Evidence",
    testimonial: "Testimonial",
    methodology: "Methodology",
    photo: "Photo",
    video: "Video",
    dataset: "Dataset",
    certificate: "Certificate",
    audio: "Audio",
    occurrence: "Tree",
    location: "Site",
  };
  return map[raw.toLowerCase()] ?? raw.charAt(0).toUpperCase() + raw.slice(1);
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function TimelineSkeleton() {
  return (
    <div className="flex flex-col gap-0">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex gap-4">
          <div className="flex flex-col items-center w-8 shrink-0">
            <div className="mt-1 h-3 w-3 rounded-full bg-border shrink-0" />
            {i < 2 && <div className="w-px flex-1 bg-border/50 mt-1" />}
          </div>
          <div className="flex-1 pb-8">
            <div className="border border-border rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-16 rounded-full" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <div className="flex items-center gap-2 pt-1">
                <Skeleton className="h-5 w-5 rounded-full" />
                <Skeleton className="h-3 w-28" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function TimelineEmpty() {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
      <ClockIcon className="h-9 w-9 opacity-30" />
      <p className="text-sm font-medium">No evidence uploaded yet</p>
      <p className="text-xs max-w-xs leading-relaxed">
        Evidence reports, audits, and field notes published by this organization
        will appear here.
      </p>
    </div>
  );
}

// ── Inline delete confirm ─────────────────────────────────────────────────────

interface DeleteConfirmProps {
  title: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
  error: string | null;
}

function DeleteConfirm({
  title,
  onConfirm,
  onCancel,
  isDeleting,
  error,
}: DeleteConfirmProps) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.2 }}
        className="mt-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3 flex flex-col gap-2"
      >
        <div className="flex items-center gap-2 text-destructive">
          <AlertTriangleIcon className="h-3.5 w-3.5 shrink-0" />
          <p className="text-xs font-medium">
            Remove &ldquo;{title}&rdquo;? This cannot be undone.
          </p>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="destructive"
            className="h-7 text-xs px-3"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? "Removing…" : "Remove"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs px-3"
            onClick={onCancel}
            disabled={isDeleting}
          >
            Cancel
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// ── Timeline entry card ───────────────────────────────────────────────────────

interface EntryProps {
  item: AttachmentItem;
  isLast: boolean;
  index: number;
  isOwner: boolean;
}

function TimelineEntry({ item, isLast, index, isOwner }: EntryProps) {
  const { metadata, creatorInfo, record } = item;

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const indexerUtils = indexerTrpc.useUtils();
  const deleteAttachment = trpc.context.attachment.delete.useMutation();

  const date = formatDate(record?.createdAt ?? metadata?.createdAt);
  const label = contentTypeLabel(record?.contentType);
  const title = record?.title ?? "Untitled";
  const description = record?.shortDescription;
  const orgName = creatorInfo?.organizationName;
  const logoUri = creatorInfo?.organizationLogo?.uri;
  const rkey = metadata?.rkey;

  const contentLinks: string[] = [];
  if (Array.isArray(record?.content)) {
    for (const contentItem of record.content as unknown[]) {
      if (
        contentItem &&
        typeof contentItem === "object" &&
        "uri" in contentItem &&
        typeof (contentItem as { uri: unknown }).uri === "string"
      ) {
        const uri = (contentItem as { uri: string }).uri;
        // Only include HTTP/HTTPS URLs, filter out AT Protocol URIs (at://...)
        if (uri.startsWith("http://") || uri.startsWith("https://")) {
          contentLinks.push(uri);
        }
      }
    }
  }

  const handleDelete = async () => {
    if (!rkey) return;
    setDeleteError(null);
    setIsDeleting(true);
    try {
      await deleteAttachment.mutateAsync({ rkey });
      await indexerUtils.context.attachments.invalidate();
    } catch (e) {
      setDeleteError(formatError(e));
      setIsDeleting(false);
    }
  };

  return (
    <motion.div
      className="flex gap-4"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.35,
        delay: index * 0.07,
        ease: [0.25, 0.1, 0.25, 1],
      }}
    >
      {/* Spine */}
      <div className="flex flex-col items-center w-8 shrink-0">
        <div className="mt-[18px] h-2.5 w-2.5 rounded-full bg-primary/60 ring-2 ring-primary/20 shrink-0" />
        {!isLast && <div className="w-px flex-1 bg-border/60 mt-1.5" />}
      </div>

      {/* Card */}
      <div className="flex-1 pb-8">
        <div className="border border-border rounded-2xl p-4 transition-all duration-300 hover:shadow-md hover:border-primary/20">
          {/* Top row: badge + date + delete trigger */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] uppercase tracking-[0.08em] text-foreground/60 bg-muted/60 border border-border/50 rounded-full px-2.5 py-1 font-medium">
              {label}
            </span>
            {date && (
              <span className="text-xs text-muted-foreground">{date}</span>
            )}
            {isOwner && rkey && (
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm((v) => !v);
                  setDeleteError(null);
                }}
                className="ml-auto p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                aria-label="Remove evidence"
              >
                <Trash2Icon className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Title */}
          <h3
            className="text-base font-medium text-foreground leading-snug mb-1"
            style={{ fontFamily: "var(--font-garamond-var)" }}
          >
            {title}
          </h3>

          {/* Short description */}
          {description && (
            <p className="text-sm text-muted-foreground leading-relaxed mb-3">
              {description}
            </p>
          )}

          {/* Content links */}
          {contentLinks.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {contentLinks.map((href, i) => (
                <a
                  key={i}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
                >
                  <FileTextIcon className="h-3 w-3" />
                  <span>View file {contentLinks.length > 1 ? i + 1 : ""}</span>
                  <ExternalLinkIcon className="h-3 w-3 opacity-60" />
                </a>
              ))}
            </div>
          )}

          {/* Separator + org attribution */}
          <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent mb-3" />
          <div className="flex items-center gap-2">
            {logoUri ? (
              <div className="relative h-5 w-5 rounded-full overflow-hidden border border-border shrink-0">
                <Image
                  src={logoUri}
                  alt={orgName ?? ""}
                  fill
                  className="object-cover"
                  sizes="20px"
                />
              </div>
            ) : (
              <div className="h-5 w-5 rounded-full bg-muted border border-border flex items-center justify-center shrink-0">
                <span className="text-[9px] font-medium text-muted-foreground">
                  {orgName?.charAt(0).toUpperCase() ?? "?"}
                </span>
              </div>
            )}
            {orgName && (
              <span className="text-xs text-muted-foreground">{orgName}</span>
            )}
          </div>

          {/* Inline delete confirm */}
          {showDeleteConfirm && rkey && (
            <DeleteConfirm
              title={title}
              onConfirm={handleDelete}
              onCancel={() => {
                setShowDeleteConfirm(false);
                setDeleteError(null);
              }}
              isDeleting={isDeleting}
              error={deleteError}
            />
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

interface TimelineTabProps {
  organizationDid: string;
  activityUri: string;
  activityCid: string;
  bumicertTitle: string;
  isOwner: boolean;
}

export function TimelineTab({
  organizationDid,
  activityUri,
  activityCid,
  bumicertTitle,
  isOwner,
}: TimelineTabProps) {
  const { data, isLoading } = indexerTrpc.context.attachments.useQuery({
    did: organizationDid,
  });

  const entries: AttachmentItem[] = (data ?? []).filter((item) =>
    item.record?.subjects?.some(
      (s: { uri?: string | null }) => s.uri === activityUri,
    ),
  );

  return (
    <motion.div
      key="timeline"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
      className="py-1"
    >
      {/* Two-column layout: timeline left, linker right (owner only) */}
      <div
        className={`grid grid-cols-1 gap-8 ${isOwner ? "lg:grid-cols-[1fr_320px]" : ""}`}
      >
        {/* ── Left: timeline entries ─────────────────────────────────────── */}
        <div>
          <div className="flex items-center gap-2 mb-6">
            <ClockIcon className="h-4 w-4 text-primary" />
            <span className="text-xs uppercase tracking-[0.15em] text-muted-foreground font-medium">
              Evidence Timeline
            </span>
          </div>

          {isLoading ? (
            <TimelineSkeleton />
          ) : entries.length === 0 ? (
            <TimelineEmpty />
          ) : (
            <div className="flex flex-col gap-0">
              {entries.map((item, i) => (
                <TimelineEntry
                  key={item.metadata?.uri ?? i}
                  item={item}
                  isLast={i === entries.length - 1}
                  index={i}
                  isOwner={isOwner}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Right: evidence linker (owner only) ───────────────────────── */}
        {isOwner && (
          <div className="lg:sticky lg:top-24 lg:self-start">
            <div className="border border-border rounded-2xl p-4">
              <EvidenceLinker
                activityUri={activityUri}
                activityCid={activityCid}
                bumicertTitle={bumicertTitle}
                organizationDid={organizationDid}
              />
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
