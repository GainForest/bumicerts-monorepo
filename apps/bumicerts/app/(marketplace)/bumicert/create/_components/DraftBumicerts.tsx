"use client";
import React, { useMemo } from "react";
import Link from "next/link";
import {
  ArrowRightIcon,
  ClockIcon,
  PartyPopperIcon,
  Loader2Icon,
  AlertCircleIcon,
} from "lucide-react";

import CircularProgressBar from "@/components/circular-progressbar";
import { useAtprotoStore } from "@/components/stores/atproto";
import { Button } from "@/components/ui/button";
import TimeText from "@/components/time-text";
import { useQuery } from "@tanstack/react-query";
import { links } from "@/lib/links";
import { queryKeys } from "@/lib/query-keys";
import type {
  DraftBumicertData,
  DraftBumicertResponse,
  GetDraftBumicertResponse,
} from "@/app/api/supabase/drafts/bumicert/type";

async function fetchDrafts(): Promise<DraftBumicertResponse[]> {
  const res = await fetch(links.api.drafts.bumicert.get(), {
    method: "GET",
    credentials: "include",
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error("Unauthorized");
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to fetch drafts");
  }
  const data: GetDraftBumicertResponse = await res.json();
  if (!data.success || !data.drafts)
    throw new Error("Invalid response from server");
  return data.drafts;
}

// Calculate progress based on filled fields
const calculateProgress = (data: DraftBumicertData): number => {
  // description may be a string (V0) or a LinearDocument (V1) — both truthy when present
  const descriptionFilled =
    typeof data.description === "string"
      ? data.description.trim().length > 0
      : typeof data.description === "object" &&
        data.description !== null &&
        "blocks" in data.description &&
        (data.description as { blocks: unknown[] }).blocks.length > 0;

  const fields = [
    data.title,
    data.startDate,
    data.endDate,
    data.workScopes?.length,
    data.coverImage,
    descriptionFilled || undefined,
    data.shortDescription,
    data.contributors?.length,
    data.siteBoundaries?.length,
  ];

  const filledFields = fields.filter(
    (field) => field !== undefined && field !== null && field !== "",
  ).length;

  return Math.round((filledFields / fields.length) * 100);
};

const DraftBumicerts = () => {
  const auth = useAtprotoStore((state) => state.auth);

  const {
    data: drafts,
    isLoading,
    error,
  } = useQuery({
    queryKey: queryKeys.drafts.byDid(auth.user?.did),
    queryFn: fetchDrafts,
    enabled: auth.authenticated && !!auth.user?.did,
  });

  const draftsWithProgress = useMemo(() => {
    if (!drafts) return [];
    return drafts.map((draft) => ({
      ...draft,
      title: draft.data.title || "Untitled Draft",
      progress: calculateProgress(draft.data),
    }));
  }, [drafts]);

  if (!auth.authenticated) {
    return (
      <div className="bg-muted/50 rounded-xl p-4 text-muted-foreground flex flex-col items-center justify-center text-center">
        <AlertCircleIcon className="size-8 opacity-50" />
        <span className="text-center text-pretty mt-2">
          Please sign in to view your drafts.
        </span>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-muted/50 rounded-xl p-4 text-muted-foreground flex flex-col items-center justify-center text-center">
        <Loader2Icon className="size-8 opacity-50 animate-spin" />
        <span className="text-center text-pretty mt-2">Loading drafts...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-muted/50 rounded-xl p-4 text-muted-foreground flex flex-col items-center justify-center text-center">
        <AlertCircleIcon className="size-8 opacity-50" />
        <span className="text-center text-pretty mt-2">
          {error instanceof Error
            ? error.message
            : "Failed to load drafts. Please try again."}
        </span>
      </div>
    );
  }

  if (!draftsWithProgress || draftsWithProgress.length === 0) {
    return (
      <div className="bg-muted/50 rounded-xl p-4 text-muted-foreground flex flex-col items-center justify-center text-center">
        <PartyPopperIcon className="size-8 opacity-50" />
        <span className="text-center text-pretty mt-2">
          You do not have any Draft Bumicerts.
        </span>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-1">
      {draftsWithProgress.map((draft) => (
        <div
          key={draft.id}
          className="w-full flex items-center p-2 rounded-lg border hover:bg-muted/50 transition-colors"
        >
          <CircularProgressBar value={draft.progress} size={34} />
          <div className="flex flex-col flex-1 ml-2">
            <h3 className="font-medium">{draft.title}</h3>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <ClockIcon className="h-3 w-3" />
              <TimeText date={new Date(draft.updated_at)} />
            </p>
          </div>
          <Link href={links.bumicert.createWithDraftId(draft.id.toString())}>
            <Button
              variant="outline"
              size="icon-sm"
              className="gap-2 rounded-full"
            >
              <ArrowRightIcon />
            </Button>
          </Link>
        </div>
      ))}
    </div>
  );
};

export default DraftBumicerts;
