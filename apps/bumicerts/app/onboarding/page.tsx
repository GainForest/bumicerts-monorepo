"use client";

import { useOnboardingStore } from "./store";
import { OnboardingProgress } from "./_components/OnboardingProgress";
import { StepIntro } from "./_components/StepIntro";
import { StepEmail } from "./_components/StepEmail";
import { StepOrgDetails } from "./_components/StepOrgDetails";
import { StepCredentials } from "./_components/StepCredentials";
import { StepComplete } from "./_components/StepComplete";
import { useAtprotoStore } from "@/components/stores/atproto";
import Link from "next/link";
import { ArrowRightIcon, Building2Icon, Loader2Icon } from "lucide-react";
import { links } from "@/lib/links";
import { useEffect } from "react";
import Image from "next/image";
import BumicertIcon from "@/icons/BumicertIcon";
import { useModal } from "@/components/ui/modal/context";
import dynamic from "next/dynamic";
const AuthModal = dynamic(
  () =>
    import("@/components/auth/AuthModal").then((m) => ({
      default: m.AuthModal,
    })),
  { ssr: false }
);

export default function OnboardingPage() {
  const { currentStep, data } = useOnboardingStore();
  const auth = useAtprotoStore((state) => state.auth);
  const { show, pushModal } = useModal();

  const handleSignInClick = () => {
    pushModal({
      id: "auth",
      content: <AuthModal />,
    }, true);
    show();
  };

  // Check if there's unsaved data in the form
  const hasUnsavedData =
    data.organizationName.trim().length > 0 ||
    data.email.trim().length > 0 ||
    data.country.length > 0 ||
    data.longDescription.trim().length > 0 ||
    data.handle.trim().length > 0;

  // Warn user before leaving if there's unsaved data
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedData && currentStep !== "complete") {
        e.preventDefault();
        // Modern browsers require returnValue to be set
        e.returnValue = "";
        return "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedData, currentStep]);

  // Show loading while checking auth status
  if (auth.status === "RESUMING") {
    return (
      <div className="min-h-screen w-full flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2Icon className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // If user is already authenticated, show options directly
  if (auth.authenticated && auth.user) {
    return (
      <div className="min-h-screen w-full flex flex-col">
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md mx-auto text-center">
            {/* Logo with glow */}
            <div className="flex items-center justify-center relative mb-4">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-16 w-16 bg-primary blur-2xl rounded-full animate-pulse" />
              </div>
              <Image
                src="/assets/media/images/app-icon.png"
                className="drop-shadow-lg"
                alt="Bumicerts"
                width={64}
                height={64}
              />
            </div>

            <div className="space-y-2 mb-8">
              <h1 className="text-3xl font-serif font-bold tracking-tight">
                Welcome back!
              </h1>
              <p className="text-muted-foreground">
                You&apos;re signed in as{" "}
                <span className="font-medium text-foreground">
                  @{auth.user.handle}
                </span>
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <Link
                href={links.organization.home(auth.user.did)}
                className="group flex items-center gap-4 p-4 rounded-lg bg-muted/40 hover:bg-accent/50 transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Building2Icon className="w-6 h-6 text-primary" />
                </div>
                <div className="text-left flex-1">
                  <div className="font-semibold">View My Organization</div>
                  <div className="text-sm text-muted-foreground">
                    Manage your organization profile
                  </div>
                </div>
                <ArrowRightIcon className="w-5 h-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </Link>

              <Link
                href={links.bumicert.create}
                className="group flex items-center gap-4 p-4 rounded-lg bg-muted/40 hover:bg-accent/50 transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <BumicertIcon className="w-6 h-6 text-primary" />
                </div>
                <div className="text-left flex-1">
                  <div className="font-semibold">Create New Bumicert</div>
                  <div className="text-sm text-muted-foreground">
                    Issue certificates for your projects
                  </div>
                </div>
                <ArrowRightIcon className="w-5 h-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </Link>
              
            </div>

            <Link
              href={links.home}
              className="inline-block mt-6 text-sm text-muted-foreground hover:text-foreground underline"
            >
              Go to homepage
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Render the appropriate step
  const renderStep = () => {
    switch (currentStep) {
      case "intro":
        return <StepIntro />;
      case "email":
        return <StepEmail />;
      case "org-details":
        return <StepOrgDetails />;
      case "credentials":
        return <StepCredentials />;
      case "complete":
        return <StepComplete />;
      default:
        return <StepIntro />;
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col">
      {/* Progress bar at top */}
      <OnboardingProgress currentStep={currentStep} />

      {/* Main content area */}
      <div className="flex-1 flex items-center justify-center p-4 pb-12">
        {renderStep()}
      </div>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-muted-foreground">
        <p>
          Already have an account?{" "}
          <button
            onClick={handleSignInClick}
            className="text-primary hover:underline"
          >
            Sign in here
          </button>
        </p>
      </footer>
    </div>
  );
}
