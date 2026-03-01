"use client";
import Image from "next/image";
import React, { useState } from "react";
import BiokoNeutralImage from "@/app/(marketplace)/bumicert/create/[draftId]/_assets/bioko-neutral.png";
import BiokoHoldingLoudspeakerImage from "@/app/(marketplace)/bumicert/create/[draftId]/_assets/bioko-holding-loudspeaker.png";
import BiokoHoldingEarthImage from "@/app/(marketplace)/bumicert/create/[draftId]/_assets/bioko-holding-earth.png";
import BiokoHoldingMagnifierImage from "@/app/(marketplace)/bumicert/create/[draftId]/_assets/bioko-holding-magnifier.png";
import BiokoHoldingConfettiImage from "@/app/(marketplace)/bumicert/create/[draftId]/_assets/bioko-holding-confetti.png";
import { getStripedBackground } from "@/lib/getStripedBackground";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, EyeIcon, Lightbulb } from "lucide-react";
import useNewBumicertStore from "../store";
import BumicertPreviewCard, {
  BumicertArt,
} from "./Steps/Step4/BumicertPreviewCard";
import { useFormStore } from "../form-store";
import { trpcApi } from "@/components/providers/TrpcProvider";
import { allowedPDSDomains } from "@/lib/config/gainforest-sdk";
import { useAtprotoStore } from "@/components/stores/atproto";
import { getBlobUrl } from "gainforest-sdk/utilities/atproto";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const stepImages = [
  {
    image: BiokoNeutralImage,
    alt: "Bioko Neutral",
    tips: [
      "Use a short and descriptive name for your project.",
      "Include a website or social link to your project for easy access.",
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

  const { data: organizationInfoResponse, isPlaceholderData: isOlderData } =
    trpcApi.gainforest.organization.info.get.useQuery(
      {
        did: auth.user?.did ?? "",
        pdsDomain: allowedPDSDomains[0],
      },
      {
        enabled: !!auth.user?.did,
      }
    );
  const organizationInfo = organizationInfoResponse?.value;
  const logoFromData = isOlderData ? undefined : organizationInfo?.logo;
  const logoUrl = logoFromData
    ? getBlobUrl(auth.user?.did ?? "", logoFromData.image, allowedPDSDomains[0])
    : null;

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
