"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRightIcon,
  CircleAlertIcon,
  CircleCheckIcon,
  HandIcon,
  Loader2Icon,
  LucideIcon,
  PartyPopperIcon,
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
import { toSerializableFile, parseAtUri, toStrongRefs } from "@/lib/mutations-utils";
import type { SerializableFile } from "@/lib/mutations-utils";
import { createBumicertAction } from "@/lib/actions/bumicerts";
import { queryKeys } from "@/lib/query-keys"; // drafts key only
import { usePathname } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { trackBumicertPublished, getFlowDurationSeconds } from "@/lib/analytics/hotjar";
import {
  MutationError,
  formatMutationErrorMessage,
} from "@gainforest/atproto-mutations-next";
import { claimActivityLabels } from "@/lib/config/fieldLabels";
import dynamic from "next/dynamic";
const FeedbackModal = dynamic(() => import("./FeedbackModal"), { ssr: false });

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
        status === "success" && "items-center"
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
            status === "error" && "bg-destructive"
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
          status === "input" && "bg-background border-border"
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
            status === "input" && "text-foreground"
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

interface CreateBumicertResponse {
  uri: string;
  cid: string;
}

const Step5 = () => {
  const auth = useAtprotoStore((state) => state.auth);
  const pathname = usePathname();
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

  const setOverallStatus = useStep5Store((state) => state.setOverallStatus);

  const [createdBumicertResponse, setCreatedBumicertResponse] =
    useState<CreateBumicertResponse | null>(null);
  const [createBumicertError, setCreateBumicertError] = useState<string | null>(
    null
  );
  const [
    isBumicertCreationMutationInFlight,
    setIsBumicertCreationMutationInFlight,
  ] = useState(false);
  const [hasClickedPublish, setHasClickedPublish] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  const createBumicertStatus: "pending" | "success" | "error" | "input" =
    createBumicertError
      ? "error"
      : createdBumicertResponse === null
        ? isBumicertCreationMutationInFlight
          ? "pending"
          : "input"
        : "success";

  const { mutate: createBumicert } = useMutation({
    mutationFn: async (data: {
      title: string;
      shortDescription: string;
      description: string;
      descriptionFacets?: unknown[];
      workScopes: string[];
      startDate: string;
      endDate: string;
      contributors: { identity: string }[];
      locations: { cid: string; uri: string }[];
      image: File;
    }) => {
      // Convert file to serializable format
      const imageFile = await toSerializableFile(data.image);

      // Transform description string + facets into a LinearDocument
      // The new lexicon expects description to be a pub.leaflet.pages.linearDocument
      // Structure: { blocks: [ { block: { $type: "pub.leaflet.blocks.text", plaintext, facets } } ] }
      // Note: We use type assertion because bsky-richtext-react outputs app.bsky.richtext.facet
      // while the lexicon now expects pub.leaflet.richtext.facet. The structures are compatible.
      const descriptionAsLinearDocument = {
        $type: "pub.leaflet.pages.linearDocument" as const,
        blocks: [
          {
            $type: "pub.leaflet.pages.linearDocument#block" as const,
            block: {
              $type: "pub.leaflet.blocks.text" as const,
              plaintext: data.description,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              facets: (data.descriptionFacets ?? []) as any,
            },
          },
        ],
      };

      // Call the mutation with properly typed inputs
      const result = await createBumicertAction({
        title: data.title,
        shortDescription: data.shortDescription,
        description: descriptionAsLinearDocument,
        workScope: {
          $type: "org.hypercerts.claim.activity#workScopeString" as const,
          scope: data.workScopes.join(", "),
        },
        startDate: data.startDate as `${string}-${string}-${string}T${string}:${string}:${string}Z`,
        endDate: data.endDate as `${string}-${string}-${string}T${string}:${string}:${string}Z`,
        contributors: data.contributors.map((c) => ({
          contributorIdentity: {
            $type: "org.hypercerts.claim.activity#contributorIdentity" as const,
            identity: c.identity,
          },
        })),
        // locations are strongRefs to app.certified.location records
        // The URIs come from certified location records already in the correct format
        locations: toStrongRefs(data.locations),
        image: {
          $type: "org.hypercerts.defs#smallImage" as const,
          image: imageFile,
        },
      });

      return result;
    },
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

      // Clear localStorage backup after successful publish
      clearPersistedFormState();
      
      // Track successful bumicert publication
      const duration = getFlowDurationSeconds() ?? 0;
      trackBumicertPublished({
        draftId: data.cid ?? "unknown",
        totalDurationSeconds: duration,
      });

      // Show feedback modal after successful publication
      setShowFeedbackModal(true);
      setOverallStatus("success");
    },
    onError: (error) => {
      console.error("Failed to publish bumicert:", error);

      if (MutationError.is(error)) {
        console.error(
          "[dev] MutationError code:", error.code,
          "| issues:", error.issues ?? error.message
        );
        setCreateBumicertError(formatMutationErrorMessage(error, claimActivityLabels));
      } else {
        setCreateBumicertError(error instanceof Error ? error.message : "An error occurred");
      }

      setHasClickedPublish(false);
    },
    onMutate: () => {
      setIsBumicertCreationMutationInFlight(true);
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

    if (!step1FormValues.coverImage) {
      setCreateBumicertError("Cover image is required");
      return;
    }

    if (!auth.user?.did) {
      setCreateBumicertError("You must be signed in to publish.");
      return;
    }

    try {
      const data = {
        title: step1FormValues.projectName,
        shortDescription: step2FormValues.shortDescription,
        description: step2FormValues.description,
        descriptionFacets: step2FormValues.descriptionFacets,
        workScopes: step1FormValues.workType,
        startDate: step1FormValues.projectDateRange[0].toISOString(),
        endDate: step1FormValues.projectDateRange[1].toISOString(),
        contributors: step3FormValues.contributors.map((contributor) => ({ identity: contributor.name })),
        locations: step3FormValues.siteBoundaries.map((sb) => ({
          cid: sb.cid,
          uri: sb.uri,
        })),
        image: step1FormValues.coverImage,
      };

      if (authStatus === "success") {
        setHasClickedPublish(true);
        createBumicert(data);
      } else {
        setCreateBumicertError("You must be signed in to publish.");
      }
    } catch (error) {
      console.error(error);
      setCreateBumicertError(
        error instanceof Error
          ? error.message
          : "Failed to prepare publish data."
      );
    }
  };

  return (
    <div>
      <FeedbackModal
        open={showFeedbackModal}
        onOpenChange={setShowFeedbackModal}
      />
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
              : createBumicertStatus === "success"
                ? "Published!"
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
          {createBumicertStatus !== "success" && (
            <Button
              onClick={handlePublishClick}
              disabled={isBumicertCreationMutationInFlight}
            >
              Publish Bumicert <ArrowRightIcon className="ml-2" />
            </Button>
          )}
        </ProgressItem>
      )}
      {createBumicertStatus === "success" &&
        createdBumicertResponse?.cid && (
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
            className="mt-4 flex flex-col items-center border border-border rounded-lg p-6">
            <PartyPopperIcon className="size-10 text-primary" />
            <span className="mt-1">
              Your bumicert was published successfully!
            </span>
            <Button className="mt-2" asChild>
              <Link
                href={links.bumicert.view(
                  `${parseAtUri(createdBumicertResponse.uri).did}-${parseAtUri(createdBumicertResponse.uri).rkey
                  }`
                )}
              >
                View bumicert <ArrowRightIcon />
              </Link>
            </Button>
          </motion.div>
        )}
    </div>
  );
};

export default Step5;
