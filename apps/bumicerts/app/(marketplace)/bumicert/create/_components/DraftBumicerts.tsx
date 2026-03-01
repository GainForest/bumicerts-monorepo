"use client";
import React, { useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Clock,
  PartyPopper,
  Loader2,
  AlertCircle,
} from "lucide-react";

import CircularProgressBar from "@/components/circular-progressbar";
import { useAtprotoStore } from "@/components/stores/atproto";
import { Button } from "@/components/ui/button";
import TimeText from "@/components/time-text";
import { links } from "@/lib/links";
import {
  DraftBumicertDataV0,
  DraftBumicertResponse,
  GetDraftBumicertResponse,
} from "@/app/api/supabase/drafts/bumicert/type";

// Calculate progress based on filled fields
const calculateProgress = (data: DraftBumicertDataV0): number => {
  const fields = [
    data.title,
    data.startDate,
    data.endDate,
    data.workScopes?.length,
    data.coverImage,
    data.description,
    data.shortDescription,
    data.contributors?.length,
    data.siteBoundaries?.length,
  ];

  const filledFields = fields.filter(
    (field) => field !== undefined && field !== null && field !== ""
  ).length;

  return Math.round((filledFields / fields.length) * 100);
};

const getDrafts = async (): Promise<DraftBumicertResponse[]> => {
  const response = await fetch(links.api.drafts.bumicert.get(), {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Unauthorized");
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to fetch drafts");
  }

  const data: GetDraftBumicertResponse = await response.json();

  if (!data.success || !data.drafts) {
    throw new Error("Invalid response from server");
  }

  return data.drafts;
};

const DraftBumicerts = () => {
  const auth = useAtprotoStore((state) => state.auth);

  const {
    data: drafts,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["drafts", auth.user?.did],
    queryFn: getDrafts,
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
        <AlertCircle className="size-8 opacity-50" />
        <span className="text-center text-pretty mt-2">
          Please sign in to view your drafts.
        </span>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-muted/50 rounded-xl p-4 text-muted-foreground flex flex-col items-center justify-center text-center">
        <Loader2 className="size-8 opacity-50 animate-spin" />
        <span className="text-center text-pretty mt-2">Loading drafts...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-muted/50 rounded-xl p-4 text-muted-foreground flex flex-col items-center justify-center text-center">
        <AlertCircle className="size-8 opacity-50" />
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
        <PartyPopper className="size-8 opacity-50" />
        <span className="text-center text-pretty mt-2">
          You do not have any pending applications.
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
              <Clock className="h-3 w-3" />
              <TimeText date={new Date(draft.updated_at)} />
            </p>
          </div>
          <Link href={links.bumicert.createWithDraftId(draft.id.toString())}>
            <Button
              variant="outline"
              size="icon-sm"
              className="gap-2 rounded-full"
            >
              <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>
      ))}
    </div>
  );
};

export default DraftBumicerts;
