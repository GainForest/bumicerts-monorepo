"use client";

/**
 * EvidencePickerModal — lets an org owner link existing records (audio, tree
 * occurrences, sites) as evidence on a bumicert by creating
 * org.hypercerts.context.attachment records.
 *
 * Each selected record becomes a separate attachment, linked via:
 *   subjects: [{ uri: activityUri }]
 *   content:  [{ $type: "org.hypercerts.defs#uri", uri: selectedRecordUri }]
 */

import { useState } from "react";
import { MicIcon, TreesIcon, MapPinIcon, ExternalLinkIcon } from "lucide-react";
import { useModal } from "@/components/ui/modal/context";
import {
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
} from "@/components/ui/modal/modal";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LeafletEditor } from "@/components/ui/leaflet-editor";
import { useAtprotoStore } from "@/components/stores/atproto";
import type { AudioRecordingItem } from "@/lib/graphql-dev/queries/audio";
import type { OccurrenceItem } from "@/lib/graphql-dev/queries/occurrences";
import type { CertifiedLocation } from "@/lib/graphql-dev/queries/locations";
import { trpc } from "@/lib/trpc/client";
import { indexerTrpc } from "@/lib/trpc/indexer/client";
import { formatError } from "@/lib/utils/trpc-errors";
import { links } from "@/lib/links";
import Link from "next/link";
import type { LeafletLinearDocument } from "@gainforest/leaflet-react";

// ── Tab types ─────────────────────────────────────────────────────────────────

type TabId = "audio" | "trees" | "sites";

const TABS: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "audio", label: "Audio", icon: MicIcon },
  { id: "trees", label: "Trees", icon: TreesIcon },
  { id: "sites", label: "Sites", icon: MapPinIcon },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const EMPTY_DOC: LeafletLinearDocument = { blocks: [] };

// ── Row components ────────────────────────────────────────────────────────────

function AudioRow({
  item,
  selected,
  onToggle,
}: {
  item: AudioRecordingItem;
  selected: boolean;
  onToggle: () => void;
}) {
  const title = item.record?.name ?? "Untitled recording";
  const meta = item.record?.metadata as Record<string, unknown> | null | undefined;
  const date = formatDate((meta?.["recordedAt"] as string) ?? item.record?.createdAt ?? undefined);
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all duration-150 ${
        selected
          ? "border-primary/40 bg-primary/5"
          : "border-border hover:border-border/80 hover:bg-muted/30"
      }`}
    >
      <div className={`h-4 w-4 rounded-sm border-2 shrink-0 flex items-center justify-center transition-colors ${selected ? "bg-primary border-primary" : "border-muted-foreground/40"}`}>
        {selected && <div className="h-2 w-2 rounded-[2px] bg-primary-foreground" />}
      </div>
      <MicIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{title}</p>
        {date && <p className="text-xs text-muted-foreground">{date}</p>}
      </div>
    </button>
  );
}

function OccurrenceRow({
  item,
  selected,
  onToggle,
}: {
  item: OccurrenceItem;
  selected: boolean;
  onToggle: () => void;
}) {
  const name = item.record?.scientificName ?? item.record?.vernacularName ?? "Unknown species";
  const count = item.record?.individualCount;
  const date = formatDate(item.record?.eventDate ?? item.record?.createdAt ?? item.metadata?.createdAt);
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all duration-150 ${
        selected
          ? "border-primary/40 bg-primary/5"
          : "border-border hover:border-border/80 hover:bg-muted/30"
      }`}
    >
      <div className={`h-4 w-4 rounded-sm border-2 shrink-0 flex items-center justify-center transition-colors ${selected ? "bg-primary border-primary" : "border-muted-foreground/40"}`}>
        {selected && <div className="h-2 w-2 rounded-[2px] bg-primary-foreground" />}
      </div>
      <TreesIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate italic">{name}</p>
        <p className="text-xs text-muted-foreground">
          {[count != null ? `${count} individual${count !== 1 ? "s" : ""}` : null, date]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>
    </button>
  );
}

function SiteRow({
  item,
  selected,
  onToggle,
}: {
  item: CertifiedLocation;
  selected: boolean;
  onToggle: () => void;
}) {
  const name = item.record?.name ?? "Unnamed site";
  const type = item.record?.locationType;
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all duration-150 ${
        selected
          ? "border-primary/40 bg-primary/5"
          : "border-border hover:border-border/80 hover:bg-muted/30"
      }`}
    >
      <div className={`h-4 w-4 rounded-sm border-2 shrink-0 flex items-center justify-center transition-colors ${selected ? "bg-primary border-primary" : "border-muted-foreground/40"}`}>
        {selected && <div className="h-2 w-2 rounded-[2px] bg-primary-foreground" />}
      </div>
      <MapPinIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{name}</p>
        {type && <p className="text-xs text-muted-foreground capitalize">{type}</p>}
      </div>
    </button>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-12 w-full rounded-xl" />
      ))}
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ tab, manageHref }: { tab: TabId; manageHref: string }) {
  const label =
    tab === "audio" ? "audio recordings" : tab === "trees" ? "tree occurrences" : "sites";
  return (
    <div className="flex flex-col items-center gap-3 py-8 text-center text-muted-foreground">
      <p className="text-sm">No {label} uploaded yet.</p>
      <Link
        href={manageHref}
        className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
        target="_blank"
        rel="noopener noreferrer"
      >
        Upload {label}
        <ExternalLinkIcon className="h-3 w-3" />
      </Link>
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

export interface EvidencePickerModalProps {
  /** AT-URI of the bumicert activity (subjects field of attachment) */
  activityUri: string;
  /** CID of the bumicert activity (for StrongRef) */
  activityCid: string;
  /** Display title of the bumicert — shown in the modal header */
  bumicertTitle: string;
  /** The org's DID — used to fetch their records */
  organizationDid: string;
  /** Called after all attachments are created successfully */
  onLinked: () => void;
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function EvidencePickerModal({
  activityUri,
  activityCid,
  bumicertTitle,
  organizationDid,
  onLinked,
}: EvidencePickerModalProps) {
  const { hide, clear } = useModal();
  const auth = useAtprotoStore((state) => state.auth);
  const indexerUtils = indexerTrpc.useUtils();

  const [activeTab, setActiveTab] = useState<TabId>("audio");
  const [selectedUris, setSelectedUris] = useState<Set<string>>(new Set());
  const [description, setDescription] = useState<LeafletLinearDocument>(EMPTY_DOC);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Queries ──────────────────────────────────────────────────────────────

  const { data: audioData, isLoading: audioLoading } = indexerTrpc.audio.list.useQuery({ did: organizationDid });
  const { data: occurrenceData, isLoading: occurrenceLoading } = indexerTrpc.dwc.occurrences.useQuery({ did: organizationDid });
  const { data: locationData, isLoading: locationLoading } = indexerTrpc.locations.list.useQuery({ did: organizationDid });

  const audioItems = audioData ?? [];
  const occurrenceItems = occurrenceData ?? [];
  const locationItems = locationData ?? [];

  const isLoading =
    activeTab === "audio" ? audioLoading :
    activeTab === "trees" ? occurrenceLoading :
    locationLoading;

  // ── Selection helpers ─────────────────────────────────────────────────────

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

  const selectedCount = selectedUris.size;

  // ── Mutations ─────────────────────────────────────────────────────────────

  const createAttachment = trpc.context.attachment.create.useMutation();

  const handleLink = async () => {
    if (selectedCount === 0) return;
    setError(null);
    setIsSubmitting(true);

    const hasDescription = description.blocks.length > 0;

    // Build title + contentType per URI based on which list it belongs to.
    const audioUriSet = new Set(audioItems.map((a) => a.metadata?.uri).filter(Boolean));
    const occurrenceUriSet = new Set(occurrenceItems.map((o) => o.metadata?.uri).filter(Boolean));

    try {
      for (const uri of selectedUris) {
        let title: string;
        let contentType: string;

        if (audioUriSet.has(uri)) {
          const item = audioItems.find((a) => a.metadata?.uri === uri);
          title = `Audio: ${item?.record?.name ?? "Recording"}`;
          contentType = "audio";
        } else if (occurrenceUriSet.has(uri)) {
          const item = occurrenceItems.find((o) => o.metadata?.uri === uri);
          const species = item?.record?.scientificName ?? item?.record?.vernacularName ?? "Occurrence";
          title = `Tree: ${species}`;
          contentType = "occurrence";
        } else {
          const item = locationItems.find((l) => l.metadata?.uri === uri);
          title = `Site: ${item?.record?.name ?? "Location"}`;
          contentType = "location";
        }

        await createAttachment.mutateAsync({
          title,
          contentType,
          subjects: [{ $type: "com.atproto.repo.strongRef", uri: activityUri, cid: activityCid }],
          content: [{ $type: "org.hypercerts.defs#uri", uri }],
          ...(hasDescription ? { description } : {}),
        });
      }

      await indexerUtils.context.attachments.invalidate();
      onLinked();
      hide().then(() => clear());
    } catch (e) {
      setError(formatError(e));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    hide().then(() => clear());
  };

  // ── Manage links per tab ──────────────────────────────────────────────────

  const manageHref =
    activeTab === "audio" ? links.upload.audio :
    activeTab === "trees" ? links.upload.trees :
    links.upload.sites;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <ModalContent dismissible={!isSubmitting}>
      <ModalHeader>
        <ModalTitle>Link Evidence</ModalTitle>
        <ModalDescription>
          Select records to attach as evidence for{" "}
          <span className="font-medium text-foreground">{bumicertTitle}</span>.
        </ModalDescription>
      </ModalHeader>

      {/* Tab bar */}
      <div className="flex gap-1 bg-muted/50 rounded-xl p-1 mt-3 mb-3">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-1.5 rounded-lg transition-all duration-150 ${
              activeTab === id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-3 w-3" />
            {label}
          </button>
        ))}
      </div>

      {/* Record list */}
      <div className="min-h-[160px] max-h-[260px] overflow-y-auto flex flex-col gap-1.5 pr-0.5">
        {isLoading ? (
          <ListSkeleton />
        ) : activeTab === "audio" ? (
          audioItems.length === 0 ? (
            <EmptyState tab="audio" manageHref={manageHref} />
          ) : (
            audioItems.map((item) => {
              const uri = item.metadata?.uri;
              if (!uri) return null;
              return (
                <AudioRow
                  key={uri}
                  item={item}
                  selected={selectedUris.has(uri)}
                  onToggle={() => toggle(uri)}
                />
              );
            })
          )
        ) : activeTab === "trees" ? (
          occurrenceItems.length === 0 ? (
            <EmptyState tab="trees" manageHref={manageHref} />
          ) : (
            occurrenceItems.map((item) => {
              const uri = item.metadata?.uri;
              if (!uri) return null;
              return (
                <OccurrenceRow
                  key={uri}
                  item={item}
                  selected={selectedUris.has(uri)}
                  onToggle={() => toggle(uri)}
                />
              );
            })
          )
        ) : locationItems.length === 0 ? (
          <EmptyState tab="sites" manageHref={manageHref} />
        ) : (
          locationItems.map((item) => {
            const uri = item.metadata?.uri;
            if (!uri) return null;
            return (
              <SiteRow
                key={uri}
                item={item}
                selected={selectedUris.has(uri)}
                onToggle={() => toggle(uri)}
              />
            );
          })
        )}
      </div>

      {/* Manage ghost link */}
      <div className="flex justify-end mt-1 mb-3">
        <Link
          href={manageHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          Manage
          <ExternalLinkIcon className="h-3 w-3" />
        </Link>
      </div>

      {/* Optional description */}
      <div className="mb-3">
        <p className="text-xs text-muted-foreground mb-1.5 font-medium uppercase tracking-[0.1em]">
          Optional Note
        </p>
        <div className="border border-border rounded-xl overflow-hidden min-h-[80px]">
          <LeafletEditor
            content={description}
            onChange={setDescription}
            ownerDid={auth.user?.did ?? organizationDid}
            placeholder="Add context about this evidence…"
            className="p-3 text-sm min-h-[80px]"
          />
        </div>
      </div>

      {error && <p className="text-sm text-destructive mb-2">{error}</p>}

      <ModalFooter className="flex flex-col gap-2">
        <Button
          className="w-full"
          onClick={handleLink}
          disabled={selectedCount === 0 || isSubmitting}
        >
          {isSubmitting
            ? "Linking…"
            : selectedCount === 0
            ? "Select records to link"
            : `Link ${selectedCount} record${selectedCount !== 1 ? "s" : ""}`}
        </Button>
        <Button variant="ghost" className="w-full" onClick={handleCancel} disabled={isSubmitting}>
          Cancel
        </Button>
      </ModalFooter>
    </ModalContent>
  );
}
