import {
  BookImage,
  EarthLock,
  FlagTriangleRight,
  PenLine,
  ScanSearch,
} from "lucide-react";
import Step1 from "../_components/Steps/Step1";
import Step2 from "../_components/Steps/Step2";
import Step3 from "../_components/Steps/Step3";
import Step4 from "../_components/Steps/Step4";
import Step5 from "../_components/Steps/Step5";
import BiokoNeutralImage from "./assets/bioko-neutral.png";
import BiokoHoldingLoudspeakerImage from "./assets/bioko-holding-loudspeaker.png";
import BiokoHoldingEarthImage from "./assets/bioko-holding-earth.png";
import BiokoHoldingMagnifierImage from "./assets/bioko-holding-magnifier.png";
import BiokoHoldingConfettiImage from "./assets/bioko-holding-confetti.png";

type StepData = {
  title: string;
  description: string;
  Component: React.ComponentType;
  icon: React.ComponentType;
  tips: {
    pre?: string;
    bullets: string[];
    post?: string;
  };
  previewBumicertByDefault: boolean;
  _biokoImage: unknown;
  _biokoImageAlt: string;
};

export const STEPS: StepData[] = [
  {
    title: "Cover Details",
    description: "Tell us about your project.",
    Component: Step1,
    icon: BookImage,
    tips: {
      bullets: [
        "This part of your Bumicert shows the key details at a glance, so it’s important to make a strong impression.",
        "For the cover image, choose one that clearly shows your work in action. Photos with people are the best.",
        "Make your Bumicert title clear and descriptive of the impact.",
      ],
    },
    previewBumicertByDefault: true,
    _biokoImage: BiokoNeutralImage,
    _biokoImageAlt: "Bioko Neutral",
  },
  {
    title: "Impact Details",
    description: "Tell us about the impact of your project.",
    Component: Step2,
    icon: PenLine,
    tips: {
      pre: "When writing your impact story, use this STAR framework:",
      bullets: [
        "Situation — What was happening and who or what was affected?",
        "Task — What was the role of your organisation, group, or community? Who else was involved?",
        "Action — Describe what your organisation or community did.",
        "Result — What happened as a result? Include numbers if available, and mention both tangible and non-tangible outcomes. This will be supported by the impact data you provide later.",
      ],
      post: "Write freely. Longer stories are welcome.",
    },
    previewBumicertByDefault: false,
    _biokoImage: BiokoHoldingLoudspeakerImage,
    _biokoImageAlt: "Bioko Holding Loudspeaker",
  },
  {
    title: "Site Details",
    description: "Tell us about the site of your project.",
    Component: Step3,
    icon: EarthLock,
    tips: {
      bullets: [
        "When adding contributors, include your organisation first, then other contributors, and make sure everyone agrees to be included.",
        "When adding sites, make sure site boundaries are accurate, as this will be important for verification.",
      ],
    },
    previewBumicertByDefault: false,
    _biokoImage: BiokoHoldingEarthImage,
    _biokoImageAlt: "Bioko Holding Earth",
  },
  {
    title: "Review",
    description: "Review your project details.",
    Component: Step4,
    icon: ScanSearch,
    tips: {
      bullets: [
        "Make sure you have completed all the previous steps.",
        "Review the look of your bumicert before submitting.",
      ],
    },
    previewBumicertByDefault: false,
    _biokoImage: BiokoHoldingMagnifierImage,
    _biokoImageAlt: "Bioko Holding Magnifier",
  },
  {
    title: "Submit",
    description: "Submit your project details.",
    Component: Step5,
    icon: FlagTriangleRight,
    tips: {
      bullets: [
        "You have completed all the steps! No more tips for this section.",
      ],
    },
    previewBumicertByDefault: false,
    _biokoImage: BiokoHoldingConfettiImage,
    _biokoImageAlt: "Bioko Holding Confetti",
  },
] as const;
