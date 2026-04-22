"use client";

/**
 * EvidenceAdder — inline sticky panel (owner only) that lets an org
 * link existing records (audio, tree occurrences, sites, files) as evidence on
 * a bumicert by creating org.hypercerts.context.attachment records.
 *
 * Lives in the right column of the full-width timeline tab. No modal involved.
 */

import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AudioRecordingItem } from "@/lib/graphql-dev/queries/audio";
import type { OccurrenceItem } from "@/lib/graphql-dev/queries/occurrences";
import type { CertifiedLocation } from "@/lib/graphql-dev/queries/locations";
import { indexerTrpc } from "@/lib/trpc/indexer/client";
import AudioEvidencePicker from "./AudioEvidencePicker";
import TreeEvidencePicker from "./TreeEvidencePicker";
import SiteEvidencePicker from "./SiteEvidencePicker";
import FileEvidencePicker from "./FileEvidencePicker";
import { ListSkeleton } from "./shared/RecordList";
import {
  EVIDENCE_TABS,
  getEvidenceTabLabel,
} from "./shared/evidenceRegistry";
import {
  EvidenceAdderStoreProvider,
  useEvidenceAdderStore,
} from "./shared/evidenceAdderStore";

const LoadingWrapper = ({
  isLoading,
  children,
}: {
  isLoading: boolean;
  children: React.ReactNode;
}) => {
  if (isLoading) return <ListSkeleton />;
  return children;
};

interface EvidenceAdderProps {
  activityUri: string;
  activityCid: string;
  bumicertTitle: string;
  organizationDid: string;
}

// ── Main ──────────────────────────────────────────────────────────────────────
export function EvidenceAdder({
  activityUri,
  organizationDid,
  activityCid,
}: EvidenceAdderProps) {
  return (
    <EvidenceAdderStoreProvider activityUri={activityUri} activityCid={activityCid}>
      <EvidenceAdderContent organizationDid={organizationDid} />
    </EvidenceAdderStoreProvider>
  );
}

function EvidenceAdderContent({ organizationDid }: { organizationDid: string }) {
  const activeTab = useEvidenceAdderStore((state) => state.activeTab);
  const setActiveTab = useEvidenceAdderStore((state) => state.setActiveTab);
  const isSubmitting = useEvidenceAdderStore((state) => state.isSubmitting);

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: audioData, isLoading: audioLoading } =
    indexerTrpc.audio.list.useQuery({ did: organizationDid });
  const { data: occurrenceData, isLoading: occurrenceLoading } =
    indexerTrpc.dwc.occurrences.useQuery({ did: organizationDid });
  const { data: locationData, isLoading: locationLoading } =
    indexerTrpc.locations.list.useQuery({ did: organizationDid });

  const audioItems: AudioRecordingItem[] = audioData ?? [];
  const occurrenceItems: OccurrenceItem[] = occurrenceData ?? [];
  const locationItems: CertifiedLocation[] = locationData ?? [];

  // ── Selection ──────────────────────────────────────────────────────────────

  if (activeTab === undefined)
    return (
      <div className="flex flex-col">
        <span className="text-muted-foreground italic font-instrument text-2xl font-medium">
          Add Evidence
        </span>
        <span className="text-sm text-muted-foreground">
          Select the type of evidence to add.
        </span>
        <div className="grid grid-cols-2 gap-2 mt-4">
          {EVIDENCE_TABS.map(({ id, label, icon: Icon }) => {
            return (
              <Button
                key={id}
                variant={"secondary"}
                onClick={() => setActiveTab(id)}
                className="h-auto hover:bg-accent hover:text-primary rounded-2xl shadow-none flex flex-col items-start justify-between"
              >
                <Icon className="size-6 opacity-40" />
                <span className="text-xl">{label}</span>
              </Button>
            );
          })}
        </div>
      </div>
    );

  return (
    <div className="flex flex-col">
      {/* Panel header */}
      <div className="flex items-center gap-3">
        <Button
          variant={"secondary"}
          size={"icon-sm"}
          className="shadow-none"
          disabled={isSubmitting}
          onClick={() => {
            setActiveTab(undefined);
          }}
        >
          <ChevronLeft />
        </Button>
        <div className="flex flex-col">
          <span className="text-muted-foreground italic font-instrument text-2xl font-medium">
            Add {getEvidenceTabLabel(activeTab)}
          </span>
          <span className="text-sm text-muted-foreground">
            Select the evidence to add.
          </span>
        </div>
      </div>
      {/* Record list */}
      <div className="mt-4 flex flex-col gap-2">
        {activeTab === "audio" ? (
          <LoadingWrapper isLoading={audioLoading}>
            <AudioEvidencePicker
              data={audioItems}
            />
          </LoadingWrapper>
        ) : activeTab === "trees" ? (
          <LoadingWrapper isLoading={occurrenceLoading}>
            <TreeEvidencePicker
              data={occurrenceItems}
            />
          </LoadingWrapper>
        ) : activeTab === "sites" ? (
          <LoadingWrapper isLoading={locationLoading}>
            <SiteEvidencePicker
              data={locationItems}
            />
          </LoadingWrapper>
        ) : (
          <FileEvidencePicker />
        )}
      </div>
    </div>
  );
}
