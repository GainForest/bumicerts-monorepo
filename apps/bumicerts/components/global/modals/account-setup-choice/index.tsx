"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { Building2Icon, HandHeartIcon } from "lucide-react";
import { OnboardingRoleSelector } from "@/components/auth/OnboardingRoleSelector";
import { useModal } from "@/components/ui/modal/context";
import {
  ModalContent,
  ModalDescription,
  ModalTitle,
} from "@/components/ui/modal/modal";
import { links } from "@/lib/links";

export function AccountSetupChoiceModal() {
  const router = useRouter();
  const { hide, popModal, stack } = useModal();

  const handleOptionClick = useCallback(
    async (href: string) => {
      if (stack.length === 1) {
        await hide();
      } else {
        popModal();
      }

      router.push(href);
    },
    [hide, popModal, router, stack.length],
  );

  return (
    <ModalContent className="-m-4 sm:-m-6">
      <ModalTitle className="sr-only">Choose how you will use Bumicerts</ModalTitle>
      <ModalDescription className="sr-only">
        Choose whether to continue onboarding as a funder or a nature steward.
      </ModalDescription>
      <OnboardingRoleSelector
        title="How will you use Bumicerts?"
        description="Choose your role to get started..."
        options={[
          {
            onClick: () => void handleOptionClick(links.manage.onboardUser),
            Icon: HandHeartIcon,
            optionName: "Funder",
            optionDescription:
              "Explore and fund impactful regenerative projects",
          },
          {
            onClick: () => void handleOptionClick(links.manage.onboardOrganization),
            Icon: Building2Icon,
            optionName: "Nature Steward",
            optionDescription:
              "Manage your organization, issue Bumicerts and upload supporting evidence",
          },
        ]}
      />
    </ModalContent>
  );
}
