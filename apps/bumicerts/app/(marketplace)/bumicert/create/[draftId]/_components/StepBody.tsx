"use client";

import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, EyeIcon, Lightbulb } from "lucide-react";

import useNewBumicertStore from "../store";
import { BumicertArt } from "./Steps/Step4/BumicertPreviewCard";
import { useFormStore } from "../form-store";
import { useAtprotoStore } from "@/components/stores/atproto";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useNavbarContext } from "@/app/(marketplace)/_components/Navbar/context";
import { STEPS } from "../_data/steps";
import { trackStepViewed, trackStepCompleted, getStepName } from "@/lib/analytics/hotjar";
import { useParams } from "next/navigation";
import { useUnsavedChangesWarning } from "@/hooks/use-unsaved-changes-warning";
import { useQuery } from "@tanstack/react-query";
import { graphqlClient } from "@/lib/graphql/client";
import { graphql } from "@/lib/graphql/tada";
import { queryKeys } from "@/lib/query-keys";

// Query to get organization logo
const OrgLogoQuery = graphql(`
  query OrgLogoForPreview($did: String!) {
    gainforest {
      organization {
        infos(where: { did: $did }, limit: 1) {
          records {
            logo {
              uri
            }
          }
        }
      }
    }
  }
`);

const EMPTY_COVER_IMAGE = new File([], "cover-image.png");

const StepBody = () => {
  const { viewport, openState } = useNavbarContext();
  const { currentStepIndex: currentStep } = useNewBumicertStore();
  const CurrentStepComponent = STEPS[currentStep].Component;
  const params = useParams();
  const draftId = (params?.draftId as string) ?? "0";
  const previousStepRef = useRef<number | null>(null);
  
  // Get dirty state from form store for unsaved changes warning
  const isDirty = useFormStore((state) => state.isDirty);
  const isHydrated = useFormStore((state) => state.isHydrated);
  const updateErrorsAndCompletion = useFormStore(
    (state) => state.updateErrorsAndCompletion
  );
  
  // Show browser warning when user tries to leave with unsaved changes
  // Only enable after form is hydrated (to avoid false positives during initial load)
  useUnsavedChangesWarning(isDirty, isHydrated);

  // Track step views when the step changes, and run validation for the new step
  useEffect(() => {
    const stepName = getStepName(currentStep);

    // Track previous step as completed FIRST (if moving forward)
    // This must happen before trackStepViewed to capture accurate timing
    if (
      previousStepRef.current !== null &&
      currentStep > previousStepRef.current
    ) {
      const prevStepName = getStepName(previousStepRef.current);
      trackStepCompleted({
        stepIndex: previousStepRef.current,
        stepName: prevStepName,
        draftId,
      });
    }

    // Track step viewed (this resets the step start time)
    trackStepViewed({
      stepIndex: currentStep,
      stepName,
      draftId,
    });

    // Run validation when navigating to a new step
    updateErrorsAndCompletion();

    previousStepRef.current = currentStep;
  }, [currentStep, draftId]);

  return (
    <div
      className={cn(
        "grid gap-4 mt-4",
        viewport === "desktop"
          ? openState.desktop
            ? "grid-cols-1 lg:grid-cols-[1fr_1px_296px]"
            : "grid-cols-[1fr_1px_296px]"
          : "grid-cols-1"
      )}
    >
      <div className="flex flex-col">
        <CurrentStepComponent />
      </div>
      {viewport === "desktop" && (
        <>
          <div className="h-full border-l border-l-border"></div>
          <div className="flex flex-col items-center">
            <SecondaryContent key={currentStep} />
          </div>
        </>
      )}
    </div>
  );
};

const SecondaryContent = () => {
  const { currentStepIndex: currentStep } = useNewBumicertStore();
  const completionPercentages = useFormStore(
    (state) => state.formCompletionPercentages
  );
  const step1FormValues = useFormStore((state) => state.formValues[0]);
  const step1Progress = completionPercentages[0];
  const auth = useAtprotoStore((state) => state.auth);

  const [isBumicertPreviewOpen, setIsBumicertPreviewOpen] = useState(
    STEPS[currentStep].previewBumicertByDefault
  );

  const { data: orgLogoData, isPlaceholderData: isOlderData } = useQuery({
    queryKey: queryKeys.org.logo(auth.user?.did),
    queryFn: async () => {
      if (!auth.user?.did) return null;
      const response = await graphqlClient.request(OrgLogoQuery, {
        did: auth.user.did,
      });
      return response.gainforest?.organization?.infos?.records?.[0]?.logo?.uri ?? null;
    },
    enabled: !!auth.user?.did,
    staleTime: 60 * 1000,
  });

  const logoUrl = isOlderData ? null : (orgLogoData ?? null);

  return (
    <div className="w-full min-h-full flex flex-col bg-muted/50 rounded-xl">
      <div className="w-full p-2">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 text-lg font-medium text-muted-foreground">
            <EyeIcon className="size-5" />
            Preview Bumicert
          </span>
          <Button
            size={"icon"}
            variant={"ghost"}
            onClick={() => setIsBumicertPreviewOpen(prev => !prev)}
          >
            <ChevronDown
              className={cn(
                "size-5 transition-transform duration-200",
                isBumicertPreviewOpen ? "rotate-180" : ""
              )}
            />
          </Button>
        </div>
        <hr className="my-2" />
        <AnimatePresence mode="wait">
          {isBumicertPreviewOpen && (
            <motion.div
              initial={{
                opacity: 0,
                scale: 0.3,
                filter: "blur(10px)",
                height: 0,
              }}
              animate={{
                opacity: 1,
                scale: 1,
                filter: "blur(0px)",
                height: "auto",
              }}
              exit={{ opacity: 0, scale: 0.3, filter: "blur(10px)", height: 0 }}
            >
              {step1Progress === 100 ? (
                <div className="flex items-center justify-center">
                  <BumicertArt
                    logoUrl={logoUrl}
                    coverImage={
                      step1FormValues.coverImage ??
                      EMPTY_COVER_IMAGE
                    }
                    title={step1FormValues.projectName}
                    objectives={step1FormValues.workType}
                    startDate={step1FormValues.projectDateRange[0]}
                    endDate={step1FormValues.projectDateRange[1]}
                    className="w-min"
                  />
                </div>
              ) : (
                <div className="w-full flex items-center justify-center p-4">
                  <span className="font-medium text-muted-foreground text-center text-pretty">
                    Please complete the first step to generate the preview.
                  </span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="w-full p-2">
        <span className="flex items-center gap-1 text-lg font-medium text-muted-foreground">
          <Lightbulb className="size-5" />
          <motion.span layoutId="tips-text">Tips</motion.span> for this section
        </span>
        <hr className="my-2" />
        {STEPS[currentStep].tips.pre}
        <ul className="list-disc list-inside -indent-5 pl-5 mt-2 font-medium text-muted-foreground">
          {STEPS[currentStep].tips.bullets.map((tip, index) => (
            <li key={index}>{tip}</li>
          ))}
        </ul>
        {STEPS[currentStep].tips.post}
      </div>
    </div>
  );
};

export default StepBody;
