"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { AuthenticatedAccountState } from "@/lib/account";
import type { OrganizationData } from "@/lib/types";
import { useManageMode } from "../_hooks/useUploadMode";
import { AccountSetupChoiceStep } from "./onboarding/AccountSetupChoiceStep";
import { AccountSetupForm } from "./onboarding/AccountSetupForm";
import type { OnboardingKind } from "./onboarding/types";

type AccountSetupPageProps = {
  did: string;
  onCompleted: (
    nextAccount: AuthenticatedAccountState,
    nextOrganization: OrganizationData,
  ) => void;
};

function resolveOnboardingKind(
  mode: ReturnType<typeof useManageMode>[0],
): OnboardingKind | null {
  if (mode === "onboard-user") return "user";
  if (mode === "onboard-org") return "organization";
  return null;
}

export function AccountSetupPage({ did, onCompleted }: AccountSetupPageProps) {
  const [mode, setMode] = useManageMode();
  const onboardingKind = resolveOnboardingKind(mode);

  return (
    <motion.div
      className="mx-auto w-full max-w-xl"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <AnimatePresence mode="wait">
        {onboardingKind ? (
          <motion.div
            key={onboardingKind}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <AccountSetupForm
              did={did}
              kind={onboardingKind}
              onBack={() => setMode(null)}
              onCompleted={onCompleted}
            />
          </motion.div>
        ) : (
          <motion.div
            key="choice"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <AccountSetupChoiceStep
              onChooseUser={() => setMode("onboard-user")}
              onChooseOrganization={() => setMode("onboard-org")}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
