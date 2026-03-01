import React from "react";
import { headers } from "next/headers";
import AuthWrapper from "./_components/AuthWrapper";
import StepFooter from "./_components/StepFooter";
import HeaderContent from "./_components/HeaderContent";
import StoreHydrator from "./_components/StoreHydrator";
import StepBody from "./_components/StepBody";
import { links } from "@/lib/links";
import { BASE_URL } from "@/lib/config/endpoint";
import { supabaseAdmin } from "@/lib/supabase/server";

const trackDraftResumed = (draftId: number, updatedAt: string) => {
  const msSinceLastUpdate = Date.now() - new Date(updatedAt).getTime();
  const minutesSinceLastUpdate = msSinceLastUpdate / (1000 * 60);
  
  // Only track resume if draft hasn't been updated in the last 5 minutes
  // This prevents tracking "resumes" immediately after saving
  if (minutesSinceLastUpdate < 5) {
    return;
  }

  const daysSinceLastUpdate = Math.floor(msSinceLastUpdate / (1000 * 60 * 60 * 24));

  // Fire-and-forget server-side tracking
  supabaseAdmin
    .from("analytics_events")
    .insert({
      session_id: "server-generated",
      event_type: "draft_resumed",
      event_data: { draftId, daysSinceLastUpdate },
    })
    .then(({ error }) => {
      if (error) console.error("[Analytics] Failed to track draft resumed:", error);
    });
};

const getDataByDraftId = async (draftId: string) => {
  const draftIdNum = parseInt(draftId, 10);
  if (isNaN(draftIdNum) || draftIdNum === 0) {
    return null;
  }

  const headersList = await headers();
  const cookieHeader = headersList.get("cookie") || "";

  const response = await fetch(
    `${BASE_URL}${links.api.drafts.bumicert.get({ draftIds: [draftIdNum] })}`,
    {
      method: "GET",
      headers: { Cookie: cookieHeader },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  const draft = data.success && data.drafts?.[0] ? data.drafts[0] : null;

  // Track draft resumed (server-side)
  if (draft) {
    trackDraftResumed(draft.id, draft.updated_at);
  }

  return draft;
};

const CreateBumicertWithDraftIdPage = async ({
  params,
}: {
  params: Promise<{ draftId: string }>;
}) => {
  const { draftId } = await params;
  const data = await getDataByDraftId(draftId);

  return (
    <AuthWrapper footer={<StepFooter />}>
      <StoreHydrator draftResponse={data}>
        <HeaderContent />
        <StepBody />
      </StoreHydrator>
    </AuthWrapper>
  );
};

export default CreateBumicertWithDraftIdPage;
