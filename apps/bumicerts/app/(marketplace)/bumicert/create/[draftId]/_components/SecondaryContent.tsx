"use client";
import React, { useState } from "react";
import BiokoNeutralImage from "@/app/(marketplace)/bumicert/create/[draftId]/_assets/bioko-neutral.png";
import BiokoHoldingLoudspeakerImage from "@/app/(marketplace)/bumicert/create/[draftId]/_assets/bioko-holding-loudspeaker.png";
import BiokoHoldingEarthImage from "@/app/(marketplace)/bumicert/create/[draftId]/_assets/bioko-holding-earth.png";
import BiokoHoldingMagnifierImage from "@/app/(marketplace)/bumicert/create/[draftId]/_assets/bioko-holding-magnifier.png";
import BiokoHoldingConfettiImage from "@/app/(marketplace)/bumicert/create/[draftId]/_assets/bioko-holding-confetti.png";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDownIcon, EyeIcon, LightbulbIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import useNewBumicertStore from "../store";
import BumicertPreviewCard from "./Steps/Step4/BumicertPreviewCard";
import { BumicertCardVisual } from "@/app/(marketplace)/explore/_components/BumicertCard";
import { useFormStore } from "../form-store";
import { useAtprotoStore } from "@/components/stores/atproto";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { queries } from "@/lib/graphql/queries/index";

const stepImages = [
  {
    image: BiokoNeutralImage,
    alt: "Bioko Neutral",
    tips: [
      "Use a short and descriptive name for your bumicert.",
      "Include a website or social link to your bumicert for easy access.",
    ],
    previewBumicertByDefault: true,
  },
  {
    image: BiokoHoldingLoudspeakerImage,
    alt: "Bioko Holding Loudspeaker",
    tips: [
      "Tell your story in your own words. Explain what the problem was and what you did to solve it.",
      "Share who was involved, such as your group, partners, or local community.",
      "Describe how your work is helping and what has changed because of it.",
      "Write freely. Longer stories are welcome.",
    ],
    previewBumicertByDefault: false,
  },
  {
    image: BiokoHoldingEarthImage,
    alt: "Bioko Holding Earth",
    tips: [
      "Add your own community or organization first, then other people or groups who joined.",
      "Make sure everyone agrees to be included.",
      "Upload your site boundary in GeoJSON format so it shows on the map.",
    ],
    previewBumicertByDefault: false,
  },
  {
    image: BiokoHoldingMagnifierImage,
    alt: "Bioko Holding Magnifier",
    tips: [
      "Make sure you have completed all the previous steps.",
      "Review the look of your bumicert before submitting.",
    ],
    previewBumicertByDefault: false,
  },
  {
    image: BiokoHoldingConfettiImage,
    alt: "Bioko Holding Confetti",
    tips: ["You have completed all the steps! No more tips for this section."],
    previewBumicertByDefault: false,
  },
];

const EMPTY_COVER_IMAGE = new File([], "cover-image.png");

const SecondaryContent = () => {
  const { currentStepIndex: currentStep } = useNewBumicertStore();
  const completionPercentages = useFormStore(
    (state) => state.formCompletionPercentages
  );
  const step1FormValues = useFormStore((state) => state.formValues[0]);
  const step1Progress = completionPercentages[0];
  const auth = useAtprotoStore((state) => state.auth);

  const [isBumicertPreviewOpen, setIsBumicertPreviewOpen] = useState(
    stepImages[currentStep].previewBumicertByDefault
  );

  const did = auth.user?.did ?? "";

  // Fetch the full single-org record — this shares the cache with UploadDashboardClient
  // (same queryFn + key) so no extra network request when coming from the org upload page.
  const { data: orgSingleData, isPlaceholderData: isOlderData } = useQuery({
    queryKey: ["org-dashboard", did],
    queryFn: () => queries.organization.fetch({ did }),
    enabled: !!did,
    staleTime: 60 * 1_000,
  });

  // Narrow to the single-org variant (vs list variant) before accessing .org
  const org = orgSingleData && "org" in orgSingleData ? orgSingleData.org : null;
  const logoUrl = isOlderData ? null : (org?.record?.logo?.uri ?? null);
  const organizationName = org?.record?.displayName ?? "";

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
            <ChevronDownIcon
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
                <div className="w-full flex items-center justify-center">
                  <BumicertCardVisual
                    logoUrl={logoUrl}
                    coverImage={
                      step1FormValues.coverImage ??
                      EMPTY_COVER_IMAGE
                    }
                    title={step1FormValues.projectName}
                    organizationName={organizationName}
                    objectives={step1FormValues.workType}
                    className="max-w-2xs"
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
          <LightbulbIcon className="size-5" />
          Tips for this section
        </span>
        <hr className="my-2" />
        <ul className="list-disc list-inside -indent-5 pl-5 mt-2 font-medium text-muted-foreground">
          {stepImages[currentStep].tips.map((tip, index) => (
            <li key={index}>{tip}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default SecondaryContent;
