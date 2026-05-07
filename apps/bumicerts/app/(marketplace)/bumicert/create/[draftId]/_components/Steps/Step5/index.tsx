"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRightIcon,
  ArrowUpRightIcon,
  CircleAlertIcon,
  CircleCheckIcon,
  HandIcon,
  Loader2Icon,
  LucideIcon,
  MessageSquareHeartIcon,
  PartyPopperIcon,
  SettingsIcon,
  ShieldCheckIcon,
  ShieldXIcon,
} from "lucide-react";

import { useAtprotoStore } from "@/components/stores/atproto";
import { cn } from "@/lib/utils";
import { useFormStore, clearPersistedFormState } from "../../../form-store";
import { useStep5Store } from "./store";
import { links } from "@/lib/links";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  toSerializableFile,
  parseAtUri,
  toStrongRefs,
} from "@/lib/mutations-utils";
import { queryKeys } from "@/lib/query-keys"; // drafts key only
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  trackBumicertPublished,
  getFlowDurationSeconds,
} from "@/lib/analytics/hotjar";
import { trpc } from "@/lib/trpc/client";
import { formatError } from "@/lib/utils/trpc-errors";
import type { LinearDocument } from "@gainforest/atproto-mutations-next";
import { useModal } from "@/components/ui/modal/context";
import useNewBumicertStore from "../../../store";
import { MODAL_IDS } from "@/components/global/modals/ids";
import { FundingConfigModal } from "@/components/global/modals/funding/config";
import { indexerTrpc } from "@/lib/trpc/indexer/client";
import { BumicertCardVisual } from "@/app/(marketplace)/explore/_components/BumicertCard";
import {
  BUMICERT_COVER_IMAGE_MAX_SIZE_BYTES,
  BUMICERT_COVER_IMAGE_MAX_SIZE_MB,
  BUMICERT_COVER_IMAGE_SUPPORTED_TYPES,
} from "../../../constants";

const FEEDBACK_FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSfCTtRzKzfwmnpJoPFYyOeGokTlRcKkvpb-Urme84gpBrCCPA/viewform";

const ProgressItem = ({
  iconset,
  title,
  description,
  status,
  isLastStep = false,
  children,
}: {
  iconset: {
    Error: LucideIcon;
    Success: LucideIcon;
    Input?: LucideIcon;
  };
  title: string;
  description: string;
  status: "pending" | "success" | "error" | "input";
  isLastStep?: boolean;
  children?: React.ReactNode;
}) => {
  return (
    <motion.div
      className={cn(
        "flex items-start gap-4 p-4 relative",
        status === "success" && "items-center",
      )}
      initial={{
        opacity: 0,
        filter: "blur(10px)",
        scale: 0.6,
        y: 10,
      }}
      animate={{
        opacity: 1,
        filter: "blur(0px)",
        scale: 1,
        y: 0,
      }}
    >
      {!isLastStep && (
        <motion.div
          className={cn(
            "absolute z-0 top-8 left-8 w-4 rounded-full bg-primary transition-colors",
            status === "error" && "bg-destructive",
          )}
          animate={{
            bottom: status === "success" ? "-2rem" : "unset",
          }}
        ></motion.div>
      )}

      <div
        className={cn(
          "relative h-12 w-12 z-5 bg-primary rounded-full border border-transparent flex items-center justify-center",
          status === "error" && "bg-destructive",
          status === "pending" && "bg-background border-border",
          status === "input" && "bg-background border-border",
        )}
      >
        {status === "error" ? (
          <iconset.Error className="size-8 text-white" />
        ) : status === "success" ? (
          <iconset.Success className="size-8 text-primary-foreground" />
        ) : status === "input" ? (
          iconset.Input ? (
            <iconset.Input className="size-8 text-muted-foreground animate-pulse" />
          ) : (
            <HandIcon className="size-8 text-muted-foreground animate-pulse" />
          )
        ) : (
          <Loader2Icon className="size-8 animate-spin text-primary" />
        )}
      </div>

      <div className="flex-1">
        <h3
          className={cn(
            "text-xl font-medium",
            status === "error" && "text-destructive",
            status === "success" && "text-primary",
            status === "input" && "text-foreground",
          )}
        >
          {title}
        </h3>
        {status !== "success" && (
          <p className="text-base text-muted-foreground">{description}</p>
        )}
        {children && <div className="mt-3">{children}</div>}
      </div>
    </motion.div>
  );
};

const Step5 = () => {
  const auth = useAtprotoStore((state) => state.auth);
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const authStatus =
    auth.status === "RESUMING"
      ? "pending"
      : auth.status === "AUTHENTICATED"
        ? "success"
        : "error";

  const formValues = useFormStore((state) => state.formValues);
  const step1FormValues = formValues[0];
  const step2FormValues = formValues[1];
  const step3FormValues = formValues[2];

  const overallStatus = useStep5Store((state) => state.overallStatus);
  const setOverallStatus = useStep5Store((state) => state.setOverallStatus);
  const createdBumicertResponse = useStep5Store(
    (state) => state.createdBumicertResponse,
  );
  const setCreatedBumicertResponse = useStep5Store(
    (state) => state.setCreatedBumicertResponse,
  );
  const publishedPreview = useStep5Store((state) => state.publishedPreview);
  const setPublishedPreview = useStep5Store((state) => state.setPublishedPreview);
  const resetSuccessState = useStep5Store((state) => state.resetSuccessState);
  const resetStep5Store = useStep5Store((state) => state.resetAll);
  const resetFormStore = useFormStore((state) => state.reset);
  const { setCurrentStepIndex, reset: resetWizardStore } = useNewBumicertStore();

  const [createBumicertError, setCreateBumicertError] = useState<string | null>(
    null,
  );
  const [
    isBumicertCreationMutationInFlight,
    setIsBumicertCreationMutationInFlight,
  ] = useState(false);
  const [hasClickedPublish, setHasClickedPublish] = useState(false);
  const { data: orgData } = indexerTrpc.organization.byDid.useQuery(
    { did: auth.user?.did ?? "" },
    { enabled: !!auth.user?.did },
  );

  const organizationName = orgData?.org?.record?.displayName ?? "";
  const organizationLogoUrl = orgData?.org?.record?.logo?.uri ?? null;

  const { pushModal, show } = useModal();

  const createBumicertStatus: "pending" | "success" | "error" | "input" =
    createBumicertError
      ? "error"
      : overallStatus === "success"
        ? "success"
      : createdBumicertResponse === null
        ? isBumicertCreationMutationInFlight
          ? "pending"
          : "input"
        : "success";

  const { mutate: createBumicert } = trpc.claim.activity.create.useMutation({
    onSuccess: async (data) => {
      setCreatedBumicertResponse({
        uri: data.uri,
        cid: data.cid,
      });

      // Delete draft if it exists (non-zero draftId in URL)
      const draftIdMatch = pathname.match(/\/create\/(\d+)$/);
      const draftId = draftIdMatch ? parseInt(draftIdMatch[1], 10) : null;

      if (draftId && draftId !== 0 && !isNaN(draftId)) {
        try {
          await fetch(links.api.drafts.bumicert.delete, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ draftIds: [draftId] }),
          });

          // Invalidate drafts query to refresh the list
          if (auth.user?.did) {
            queryClient.invalidateQueries({
              queryKey: queryKeys.drafts.byDid(auth.user.did),
            });
          }
        } catch (error) {
          // Silently fail - draft deletion is not critical
          console.error("Failed to delete draft after publishing:", error);
        }
      }

      // Clear localStorage and reset in-memory store so a future visit to
      // /bumicert/create starts fresh rather than replaying the old form state.
      clearPersistedFormState();
      resetFormStore();

      // Track successful bumicert publication
      const duration = getFlowDurationSeconds() ?? 0;
      trackBumicertPublished({
        draftId: data.cid ?? "unknown",
        totalDurationSeconds: duration,
      });

      setOverallStatus("success");
    },
    onError: (error) => {
      console.error("Failed to publish bumicert:", error);
      setCreateBumicertError(formatError(error));
      setHasClickedPublish(false);
      resetSuccessState();
      // Reset to idle so step navigation (back/edit) is re-enabled after a failure
      setOverallStatus("idle");
    },
    onMutate: () => {
      setIsBumicertCreationMutationInFlight(true);
      resetSuccessState();
      setOverallStatus("pending");
    },
    onSettled: () => {
      setIsBumicertCreationMutationInFlight(false);
    },
  });

  const handlePublishClick = async () => {
    if (
      hasClickedPublish ||
      isBumicertCreationMutationInFlight ||
      createBumicertStatus === "success"
    ) {
      return;
    }

    setCreateBumicertError(null);

    if (!step1FormValues.coverImage || step1FormValues.coverImage.size === 0) {
      setCreateBumicertError("Cover image is required");
      return;
    }

    if (step1FormValues.coverImage.size > BUMICERT_COVER_IMAGE_MAX_SIZE_BYTES) {
      setCreateBumicertError(
        `Cover image must be ${BUMICERT_COVER_IMAGE_MAX_SIZE_MB}MB or smaller`,
      );
      return;
    }

    if (
      !BUMICERT_COVER_IMAGE_SUPPORTED_TYPES.some(
        (type) => type === step1FormValues.coverImage.type,
      )
    ) {
      setCreateBumicertError("Cover image must be JPG, PNG, or WebP");
      return;
    }

    if (!auth.user?.did) {
      setCreateBumicertError("You must be signed in to publish.");
      return;
    }

    if (authStatus !== "success") {
      setCreateBumicertError("You must be signed in to publish.");
      return;
    }

    try {
      // Convert file to serializable format (base64 + metadata)
      const imageFile = await toSerializableFile(step1FormValues.coverImage);

      // description is a LeafletLinearDocument from the editor.
      // The mutations package expects the generated LinearDocument type from
      // @gainforest/generated, which differs structurally only in its image block
      // (CID class vs plain { $link } object). Since we serialize to JSON before
      // sending to the PDS, these are runtime-compatible. We cast through the
      // generated LinearDocument type at this boundary.
      const descriptionForMutation =
        step2FormValues.description as unknown as LinearDocument;
      setPublishedPreview({
        coverImage: step1FormValues.coverImage,
        title: step1FormValues.projectName,
        description:
          step2FormValues.shortDescription.length > 0
            ? step2FormValues.shortDescription
            : undefined,
        objectives: [...step1FormValues.workType],
        organizationName,
        logoUrl: organizationLogoUrl,
      });
      setHasClickedPublish(true);
      createBumicert({
        title: step1FormValues.projectName,
        shortDescription: step2FormValues.shortDescription,
        description: descriptionForMutation,
        workScope: {
          $type: "org.hypercerts.claim.activity#workScopeString" as const,
          scope: step1FormValues.workType.join(", "),
        },
        startDate:
          step1FormValues.projectDateRange[0].toISOString() as `${string}-${string}-${string}T${string}:${string}:${string}Z`,
        // endDate is null when the work is ongoing — omit it from the mutation
        ...(step1FormValues.projectDateRange[1] !== null && {
          endDate:
            step1FormValues.projectDateRange[1].toISOString() as `${string}-${string}-${string}T${string}:${string}:${string}Z`,
        }),
        contributors: step3FormValues.contributors.map((contributor) => ({
          contributorIdentity: {
            $type: "org.hypercerts.claim.activity#contributorIdentity" as const,
            identity: contributor.name,
          },
        })),
        locations: toStrongRefs(
          step3FormValues.siteBoundaries.map((sb) => ({
            uri: sb.uri,
            cid: sb.cid,
          })),
        ),
        image: {
          $type: "org.hypercerts.defs#smallImage" as const,
          image: imageFile,
        },
      });
    } catch (error) {
      console.error(error);
      setCreateBumicertError(
        error instanceof Error
          ? error.message
          : "Failed to prepare publish data.",
      );
    }
  };

  // Handler for opening the funding config modal
  const handleOpenFundingConfig = () => {
    if (!createdBumicertResponse || !auth.user?.did) return;
    const { did, rkey } = parseAtUri(createdBumicertResponse.uri);

    pushModal(
      {
        id: MODAL_IDS.FUNDING_CONFIG,
        content: (
          <FundingConfigModal
            ownerDid={did}
            bumicertRkey={rkey}
            existingConfig={null}
            onSaved={() => {
              // Could show a success toast here
            }}
          />
        ),
      },
      true,
    );
    show();
  };

  const handleCreateAnotherBumicert = () => {
    resetFormStore();
    resetWizardStore();
    resetStep5Store();
    router.push(links.bumicert.create);
  };

  return (
    <div>
      {createBumicertStatus !== "success" && (
        <>
          <ProgressItem
            iconset={{
              Error: ShieldXIcon,
              Success: ShieldCheckIcon,
            }}
            title="Authenticated"
            description={
              authStatus === "pending"
                ? "We are checking if you are authenticated."
                : "You are not signed in. Please sign in to continue."
            }
            status={authStatus}
          />
          {authStatus === "success" && (
            <ProgressItem
              iconset={{
                Error: CircleAlertIcon,
                Success: CircleCheckIcon,
                Input: HandIcon,
              }}
              title={
                createBumicertError
                  ? "Failed to publish."
                  : createBumicertStatus === "pending"
                    ? "Publishing your bumicert"
                    : "Ready to publish your bumicert"
              }
              description={
                createBumicertError
                  ? createBumicertError
                  : isBumicertCreationMutationInFlight
                    ? "We are publishing your bumicert."
                    : "Please click the button below to publish your bumicert."
              }
              status={createBumicertStatus}
              isLastStep={true}
            >
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={handlePublishClick}
                  disabled={isBumicertCreationMutationInFlight}
                >
                  {createBumicertError ? "Retry" : "Publish Bumicert"}{" "}
                  <ArrowRightIcon />
                </Button>
                {createBumicertError && (
                  <Button
                    variant="outline"
                    onClick={() => setCurrentStepIndex(3)}
                  >
                    Edit details
                  </Button>
                )}
              </div>
            </ProgressItem>
          )}
        </>
      )}
      {createBumicertStatus === "success" && createdBumicertResponse?.cid && (
        <motion.div
          initial={{
            opacity: 0,
            scale: 0.5,
            y: 10,
            filter: "blur(10px)",
          }}
          animate={{
            opacity: 1,
            scale: 1,
            y: 0,
            filter: "blur(0px)",
          }}
        >
          <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-center md:items-stretch">
            {publishedPreview && (
              <div className="w-full max-w-xs aspect-3/4 shrink-0">
                <BumicertCardVisual
                  logoUrl={publishedPreview.logoUrl}
                  coverImage={publishedPreview.coverImage}
                  title={publishedPreview.title}
                  description={publishedPreview.description}
                  organizationName={publishedPreview.organizationName}
                  objectives={publishedPreview.objectives}
                  className="h-full"
                />
              </div>
            )}

            <div className="w-full md:flex-1 flex flex-col justify-center items-center">
              <div className="h-12 w-12 relative">
                <PartyPopperIcon className="text-primary size-12" />
                <div className="absolute inset-0 bg-primary/50 blur-xl animate-pulse"></div>
              </div>
              <span className="text-center font-medium text-xl mt-6">
                Your Bumicert was published successfully!
              </span>

              {/* Action buttons */}
              <div className="mt-4 flex flex-col gap-2 w-full items-center">
                {/* Primary: View Bumicert */}
                <Button className="w-full md:w-fit" asChild>
                  <Link
                    href={links.bumicert.view(
                      `${parseAtUri(createdBumicertResponse.uri).did}-${parseAtUri(createdBumicertResponse.uri).rkey}`,
                    )}
                  >
                    View Bumicert <ArrowRightIcon />
                  </Link>
                </Button>

                {/* Secondary: Set Up Donations */}
                <Button
                  variant="outline"
                  className="w-full md:w-fit"
                  onClick={handleOpenFundingConfig}
                >
                  <SettingsIcon />
                  Set Up Donations
                </Button>

                {/* Tertiary: Share Feedback (external link) */}
                <Button variant="ghost" className="w-full md:w-fit" asChild>
                  <a
                    href={FEEDBACK_FORM_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MessageSquareHeartIcon />
                    Share Feedback
                    <ArrowUpRightIcon className="ml-auto" />
                  </a>
                </Button>

                <Button
                  variant="secondary"
                  className="w-full md:w-fit"
                  onClick={handleCreateAnotherBumicert}
                >
                  Create another bumicert
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default Step5;
