"use client";
import { Button } from "@/components/ui/button";
import { ChevronLeftIcon, ChevronRightIcon, LightbulbIcon, XIcon } from "lucide-react";
import React, { useEffect, useEffectEvent, useMemo, useState } from "react";
import useNewBumicertStore from "../store";
import { STEPS, STEPS as steps } from "../_data/steps";
import { useFormStore } from "../form-store";
import { useStep5Store } from "./Steps/Step5/store";
import { ProgressiveBlur } from "@/components/ui/progressive-blur";
import { useNavbarContext } from "@/app/(marketplace)/_components/Navbar/context";
import { AnimatePresence, motion } from "framer-motion";

const StepFooter = () => {
  const { currentStepIndex, setCurrentStepIndex } = useNewBumicertStore();
  const { viewport } = useNavbarContext();
  const showTipButton = viewport === "mobile";
  const [showTips, setShowTips] = useState(false);

  // Hide the tips each time the viewport changes to mobile.
  const hideTipsOnViewportChangeToMobile = useEffectEvent(
    (v: typeof viewport) => {
      if (v === "mobile") {
        setShowTips(false);
      }
    }
  );
  useEffect(() => {
    hideTipsOnViewportChangeToMobile(viewport);
  }, [viewport]);

  const completionPercentages = useFormStore(
    (state) => state.formCompletionPercentages
  );
  const step1Progress = completionPercentages[0];
  const step2Progress = completionPercentages[1];
  const step3Progress = completionPercentages[2];

  const overallStatusForStep5 = useStep5Store((state) => state.overallStatus);

  const allowUserToMoveForward = useMemo(() => {
    // For steps 1, 2 and 3.
    if (currentStepIndex < 3) return true;
    // For step 4.
    if (currentStepIndex === 3) {
      return (
        step1Progress === 100 && step2Progress === 100 && step3Progress === 100
      );
    }
    // For step 5.
    return false;
  }, [currentStepIndex]);

  return (
    <AnimatePresence>
      {showTipButton && showTips && (
        <TipsPopup onClose={() => setShowTips(false)} key={"tips-popup"} />
      )}
      <div className="w-full sticky bottom-0 bg-linear-to-t from-black/20 to-black/0 z-7">
        <ProgressiveBlur
          className="w-full h-full z-7"
          height="100%"
        ></ProgressiveBlur>
        <div className="relative inset-0 flex items-center justify-between p-4 z-8">
          <div className="flex items-center flex-1 gap-1">
            {currentStepIndex > 0 && (
              <Button
                onClick={() => setCurrentStepIndex(currentStepIndex - 1)}
                variant="outline"
                disabled={
                  currentStepIndex === 4 && overallStatusForStep5 === "pending"
                }
              >
                <ChevronLeftIcon />
                {showTipButton ? "" : steps[currentStepIndex - 1].title}
              </Button>
            )}
            <AnimatePresence>
              {showTipButton && !showTips && (
                <Button
                  variant={"outline"}
                  initial={{ opacity: 0, scale: 0.5, filter: "blur(10px)" }}
                  animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                  exit={{ opacity: 0, scale: 0.5, filter: "blur(10px)" }}
                  layoutId="tips-popup"
                  layoutRoot={true}
                  onClick={() => setShowTips(true)}
                >
                  <motion.span layoutId="tips-icon">
                    <LightbulbIcon />
                  </motion.span>
                  <motion.span layoutId="tips-text">Tips</motion.span>
                </Button>
              )}
            </AnimatePresence>
          </div>
          <div className="flex items-center gap-2">
            <Button variant={"outline"} className="hidden">
              <LightbulbIcon />
            </Button>
            {currentStepIndex < 4 && (
              <Button
                onClick={() => setCurrentStepIndex(currentStepIndex + 1)}
                disabled={!allowUserToMoveForward}
                className="disabled:opacity-100 disabled:saturate-40 disabled:text-primary-foreground/50"
              >
                Continue <ChevronRightIcon />
              </Button>
            )}
          </div>
        </div>
      </div>
    </AnimatePresence>
    // <div className="flex items-center justify-between p-2 mt-6 mb-4 bg-muted rounded-2xl">
    // </div>
  );
};

const TipsPopup = ({ onClose }: { onClose: () => void }) => {
  const { currentStepIndex } = useNewBumicertStore();
  return (
    <>
      <div className="fixed z-100 inset-0 bg-black/50"></div>
      <motion.div
        layoutId="tips-popup"
        className="fixed bottom-4 left-4 right-4 z-110 bg-background border border-border rounded-lg p-4 shadow-lg"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-xl">
            <motion.span layoutId="tips-icon">
              <LightbulbIcon className="size-5" />
            </motion.span>
            <motion.span layoutId="tips-text">Tips</motion.span>
          </div>
          <Button
            onClick={onClose}
            variant={"outline"}
            size={"icon"}
            className="rounded-full"
          >
            <XIcon />
          </Button>
        </div>
        <div className="mt-2">
          {STEPS[currentStepIndex].tips.pre}
          <ul className="list-disc list-inside -indent-5 pl-5 mt-2 font-medium text-muted-foreground">
            {STEPS[currentStepIndex].tips.bullets.map((tip, index) => (
              <li key={index}>{tip}</li>
            ))}
          </ul>
          {STEPS[currentStepIndex].tips.post}
        </div>
      </motion.div>
    </>
  );
};

export default StepFooter;
