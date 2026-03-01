"use client";

import { cn } from "@/lib/utils";
import { ONBOARDING_STEPS, OnboardingStep } from "../store";
import {
  Mail,
  Building2,
  KeyRound,
  PartyPopper,
  DoorOpen,
} from "lucide-react";

const STEP_ICONS: Record<OnboardingStep, React.ReactNode> = {
  intro: <DoorOpen className="w-4 h-4" />,
  email: <Mail className="w-4 h-4" />,
  "org-details": <Building2 className="w-4 h-4" />,
  credentials: <KeyRound className="w-4 h-4" />,
  complete: <PartyPopper className="w-4 h-4" />,
};

const STEP_LABELS: Record<OnboardingStep, string> = {
  intro: "Getting Started",
  email: "Verification",
  "org-details": "Organization",
  credentials: "Account",
  complete: "Finish",
};

interface OnboardingProgressProps {
  currentStep: OnboardingStep;
}

export function OnboardingProgress({
  currentStep,
}: OnboardingProgressProps) {
  const currentIndex = ONBOARDING_STEPS.indexOf(currentStep);

  return (
    <div
      className="w-full px-4 py-4"
      role="navigation"
      aria-label="Onboarding progress"
    >
      <div className="max-w-2xl mx-auto">
        {/* Progress bar */}
        <div className="relative">
          {/* Background line */}
          <div
            className="absolute top-4 left-0 right-0 h-0.5 bg-muted"
            aria-hidden="true"
          />

          {/* Progress line */}
          <div
            className="absolute top-4 left-0 h-0.5 bg-primary transition-all duration-500 ease-out"
            style={{
              width: `${(currentIndex / (ONBOARDING_STEPS.length - 1)) * 100}%`,
            }}
            aria-hidden="true"
          />

          {/* Steps */}
          <ol className="relative flex justify-between">
            {ONBOARDING_STEPS.map((step, index) => {
              const isCompleted = index < currentIndex;
              const isCurrent = index === currentIndex;

              return (
                <li
                  key={step}
                  className="flex flex-col items-center"
                  aria-current={isCurrent ? "step" : undefined}
                >
                  {/* Step indicator */}
                  <div
                    className={cn(
                      "relative flex items-center justify-center w-8 h-8 rounded-full border-2 bg-background transition-all duration-300",
                      isCompleted && "bg-primary border-primary",
                      isCurrent && "border-primary ring-4 ring-primary/20",
                      !isCompleted && !isCurrent && "border-muted"
                    )}
                    aria-hidden="true"
                  >
                    <span
                      className={cn(
                        isCompleted
                          ? "text-primary-foreground"
                          : isCurrent
                            ? "text-primary"
                            : "text-muted-foreground"
                      )}
                    >
                      {STEP_ICONS[step]}
                    </span>
                  </div>

                  {/* Step label */}
                  <span
                    className={cn(
                      "mt-2 text-xs font-medium hidden sm:block transition-colors duration-300",
                      isCurrent
                        ? "text-primary"
                        : isCompleted
                          ? "text-foreground"
                          : "text-muted-foreground"
                    )}
                  >
                    {STEP_LABELS[step]}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>

        {/* Current step label for mobile */}
        <div className="mt-3 text-center sm:hidden">
          <span className="text-sm font-medium text-primary">
            Step {currentIndex + 1} of {ONBOARDING_STEPS.length}:{" "}
            {STEP_LABELS[currentStep]}
          </span>
        </div>

        {/* Screen reader status */}
        <div className="sr-only" role="status" aria-live="polite">
          Step {currentIndex + 1} of {ONBOARDING_STEPS.length}:{" "}
          {STEP_LABELS[currentStep]}
        </div>
      </div>
    </div>
  );
}
