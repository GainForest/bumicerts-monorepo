"use client";

import { Building2Icon, UserIcon } from "lucide-react";
import { OnboardingRoleSelector } from "@/components/auth/OnboardingRoleSelector";

export function AccountSetupChoiceStep({
  onChooseUser,
  onChooseOrganization,
}: {
  onChooseUser: () => void;
  onChooseOrganization: () => void;
}) {
  return (
    <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center">
      <OnboardingRoleSelector
        className="w-full max-w-md"
        title="Choose your setup"
        description="Pick the kind of profile you want to create on Bumicerts."
        options={[
          {
            onClick: onChooseUser,
            Icon: UserIcon,
            optionName: "User",
            optionDescription:
              "Create a personal profile with your avatar, banner, name and bio.",
          },
          {
            onClick: onChooseOrganization,
            Icon: Building2Icon,
            optionName: "Organization",
            optionDescription:
              "Set up your organization profile and let Bumicerts prefill what it can from your website.",
          },
        ]}
      />
    </div>
  );
}
