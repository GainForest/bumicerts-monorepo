"use client";

import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDownIcon, LightbulbIcon } from "lucide-react";

import useNewBumicertStore from "../store";
import { useFormStore } from "../form-store";
import { cn } from "@/lib/utils";
import { useNavbarContext } from "@/app/(marketplace)/_components/Navbar/context";
import { STEPS } from "../_data/steps";
import { trackStepViewed, trackStepCompleted, getStepName } from "@/lib/analytics/hotjar";
import { useParams } from "next/navigation";
import { useUnsavedChangesWarning } from "@/hooks/use-unsaved-changes-warning";
import SecondaryContent from "./SecondaryContent";

const StepBody = () => {
  const { viewport, openState } = useNavbarContext();
  const { currentStepIndex: currentStep } = useNewBumicertStore();
  const CurrentStepComponent = STEPS[currentStep].Component;
  const showDesktopSidebar = viewport === "desktop" && currentStep !== 4;
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
        showDesktopSidebar
          ? openState.desktop
            ? "grid-cols-1 lg:grid-cols-[1fr_1px_296px]"
            : "grid-cols-[1fr_1px_296px]"
          : "grid-cols-1"
      )}
    >
      <div className="flex flex-col">
        <CurrentStepComponent />
      </div>
      {showDesktopSidebar && (
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

export default StepBody;
