import { cache } from "react";
import { notFound } from "next/navigation";
import { gainforestSdk } from "@/lib/config/gainforest-sdk.server";
import { allowedPDSDomains } from "@/lib/config/gainforest-sdk";
import { tryCatch } from "@/lib/tryCatch";
import { TRPCError } from "@trpc/server";
import { getBlobUrl, parseAtUri } from "gainforest-sdk/utilities/atproto";
import type { BumicertData } from "@/lib/types";
import type {
  AppGainforestOrganizationInfo,
  OrgHypercertsClaimActivity,
} from "gainforest-sdk/lex-api";
import { BumicertHero } from "./_components/Hero";
import { BumicertBody } from "./_components/Body";
import { BumicertDetailHeader } from "./_components/BumicertDetailHeader";

type SupportedImageData = Parameters<typeof getBlobUrl>[1];
type ImageParam = SupportedImageData | { $type?: string } | null | undefined;

const pdsDomain = allowedPDSDomains[0];

const getActivity = cache(async (did: string, rkey: string) => {
  const caller = gainforestSdk.getServerCaller();
  type ActivityGetResponse = Awaited<ReturnType<typeof caller.hypercerts.claim.activity.get>>;
  return tryCatch<ActivityGetResponse>(
    caller.hypercerts.claim.activity.get({ did, rkey, pdsDomain })
  );
});

function resolveImageUrl(did: string, image: ImageParam): string | null {
  if (!image || typeof image === "string") return null;
  if (typeof image !== "object" || !("$type" in image) || !image.$type) return null;
  try {
    return getBlobUrl(did, image as SupportedImageData, pdsDomain);
  } catch {
    return null;
  }
}

function extractObjectives(
  workScope: OrgHypercertsClaimActivity.Record["workScope"]
): string[] {
  if (!workScope) return [];
  if ("scope" in workScope && typeof workScope.scope === "string") {
    return workScope.scope
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

function extractRichtext(rt: { text?: string } | undefined): string {
  return rt?.text ?? "";
}

function buildBumicertData(
  did: string,
  rkey: string,
  activity: OrgHypercertsClaimActivity.Record,
  orgInfo: AppGainforestOrganizationInfo.Record
): BumicertData {
  const logoUrl = resolveImageUrl(did, orgInfo.logo);
  const coverImageUrl = resolveImageUrl(did, activity.image) ?? resolveImageUrl(did, orgInfo.coverImage);

  return {
    id: `${did}-${rkey}`,
    organizationDid: did,
    rkey,
    title: activity.title,
    shortDescription: activity.shortDescription ?? "",
    description: activity.description ?? activity.shortDescription ?? "",
    coverImageUrl,
    logoUrl,
    organizationName: orgInfo.displayName,
    country: orgInfo.country ?? "",
    objectives: extractObjectives(activity.workScope),
    startDate: activity.startDate ?? null,
    endDate: activity.endDate ?? null,
    createdAt: activity.createdAt,
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ bumicertId: string }>;
}) {
  const { bumicertId } = await params;
  const id = decodeURIComponent(bumicertId);
  const parsed = id.includes("-") ? id.split("-") : null;
  if (!parsed) return { title: "Bumicert Not Found" };

  const [did, rkey] = parsed;
  const [response, error] = await getActivity(did, rkey);

  if (error || !response) return { title: "Bumicert Not Found" };

  const activity = response.value;
  return {
    title: `${activity.title} — Bumicerts`,
    description: activity.shortDescription ?? activity.description?.slice(0, 160) ?? "",
    openGraph: {
      title: `${activity.title} — Bumicerts`,
      description: activity.shortDescription ?? "",
      type: "article",
    },
  };
}

export default async function BumicertDetailPage({
  params,
}: {
  params: Promise<{ bumicertId: string }>;
}) {
  const { bumicertId } = await params;
  const id = decodeURIComponent(bumicertId);

  const parsed = id.includes("-") ? id.split("-") : null;
  if (!parsed) notFound();

  const [did, rkey] = parsed;
  const caller = gainforestSdk.getServerCaller();

  type OrgInfoResponse = Awaited<ReturnType<typeof caller.gainforest.organization.info.get>>;
  const [[activityResponse, activityError], [orgInfoResponse, orgInfoError]] = await Promise.all([
    getActivity(did, rkey),
    tryCatch<OrgInfoResponse>(caller.gainforest.organization.info.get({ did, pdsDomain })),
  ]);

  const fetchError = activityError ?? orgInfoError;
  if (fetchError) {
    if (
      fetchError instanceof TRPCError &&
      fetchError.code === "NOT_FOUND"
    ) {
      notFound();
    }
    console.error("Error fetching Bumicert", did, rkey, fetchError);
    throw new Error("Failed to load this bumicert. Please try again.");
  }

  const bumicert = buildBumicertData(
    did,
    rkey,
    activityResponse!.value,
    orgInfoResponse!.value
  );

  return (
    <div className="w-full">
      <BumicertDetailHeader bumicertId={id} />
      <BumicertHero bumicert={bumicert} />
      <BumicertBody bumicert={bumicert} />
    </div>
  );
}
