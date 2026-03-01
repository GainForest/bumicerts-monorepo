"use client";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import React, { useMemo } from "react";
import useNewBumicertStore from "../store";
import { STEPS as steps } from "../_data/steps";
import { useFormStore } from "../form-store";
import CircularProgressBar from "@/components/circular-progressbar";
import {
  BookImage,
  Check,
  ChevronRight,
  EarthLock,
  FlagTriangleRight,
  PenLine,
  ScanSearch,
} from "lucide-react";
import { useStep5Store } from "./Steps/Step5/store";

const StepHeader = () => {
  const { currentStepIndex, setCurrentStepIndex: setCurrentStep } =
    useNewBumicertStore();

  // Get completion percentage from form store
  const completionPercentages = useFormStore(
    (state) => state.formCompletionPercentages
  );
  const step1Progress = completionPercentages[0];
  const step2Progress = completionPercentages[1];
  const step3Progress = completionPercentages[2];
  const step4Progress = (step1Progress + step2Progress + step3Progress) / 3;
  const step5OverallStatus = useStep5Store((state) => state.overallStatus);

  const stepProgressesByIndex = [...completionPercentages, step4Progress, 0];

  const stepEnability = useMemo(() => {
    if (step5OverallStatus === "pending")
      return [false, false, false, false, false];
    const step1Enabled = true;
    const step2Enabled = true;
    const step3Enabled = true;
    const step4Enabled = true;
    const [p1, p2, p3] = completionPercentages;
    const step5Enabled = p1 === 100 && p2 === 100 && p3 === 100;
    return [
      step1Enabled,
      step2Enabled,
      step3Enabled,
      step4Enabled,
      step5Enabled,
    ];
  }, [currentStepIndex, completionPercentages, step5OverallStatus]);

  return (
    <div className="flex flex-col w-full">
      <div className="flex items-center gap-1 px-1 justify-center">
        {steps.map((step, index) => {
          const progress = stepProgressesByIndex[index];
          const Icon = progress >= 100 ? Check : step.icon;
          return (
            <React.Fragment key={index}>
              <motion.div className={cn("flex flex-col")} layout>
                <motion.button
                  className={cn(
                    "cursor-pointer rounded-md overflow-hidden transition-all hover:scale-105 disabled:hover:scale-100 hover:text-primary disabled:hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50",
                    currentStepIndex === index && "text-primary"
                  )}
                  onClick={() => setCurrentStep(index)}
                  disabled={!stepEnability[index]}
                >
                  <div className="p-1 flex items-center gap-2">
                    <motion.div layout>
                      <CircularProgressBar
                        value={Math.max(5, progress)}
                        size={28}
                        text={
                          <Icon
                            className={cn(
                              "size-6 text-primary",
                              currentStepIndex === index &&
                              "text-primary-foreground"
                            )}
                          />
                        }
                        textSize={0.8}
                        backgroundColor={
                          currentStepIndex === index
                            ? "var(--primary)"
                            : undefined
                        }
                        strokeColor={
                          currentStepIndex === index
                            ? "rgba(255, 255, 255, 0.6)"
                            : undefined
                        }
                        strokeWidth={currentStepIndex === index ? 12 : 9}
                      />
                    </motion.div>
                    {currentStepIndex === index && (
                      <motion.div
                        className="hidden md:flex flex-col items-start"
                        initial={{ opacity: 0, x: -20, filter: "blur(10px)" }}
                        animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                      >
                        <b className="font-medium text-nowrap">{step.title}</b>
                      </motion.div>
                    )}
                  </div>
                </motion.button>
              </motion.div>
              {index < steps.length - 1 && (
                <ChevronRight className="size-4 text-foreground/40" />
              )}
            </React.Fragment>
          );
        })}
      </div>
      <div className="w-full h-1.5 overflow-hidden mt-1 rounded-full bg-primary/30" style={{
        boxShadow: "0 20px 10px rgb(0 0 0 / 30)"
      }}>
        <div
          className="h-full bg-primary rounded-full transition-all duration-300"
          style={{ width: `${step4Progress}%` }}
        />
      </div>
    </div>
  );
};

export default StepHeader;
