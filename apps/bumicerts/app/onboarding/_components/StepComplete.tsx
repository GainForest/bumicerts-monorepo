"use client";

import { Button } from "@/components/ui/button";
import { useOnboardingStore } from "../store";
import {
  ArrowLeftIcon,
  CheckCircle2Icon,
  Loader2Icon,
  LogInIcon,
  XCircleIcon,
} from "lucide-react";
import { useRef, useState } from "react";
import { defaultSignupPdsDomain } from "@/lib/config/pds";
import { motion } from "framer-motion";
import { links } from "@/lib/links";
import { useModal } from "@/components/ui/modal/context";
import dynamic from "next/dynamic";
import Link from "next/link";

const AuthModal = dynamic(
  () =>
    import("@/components/auth/AuthModal").then((m) => ({
      default: m.AuthModal,
    })),
  { ssr: false }
);

type CompletionState = "idle" | "creating" | "success" | "error";

export function StepComplete() {
  const { data, updateData, setError, error, prevStep } = useOnboardingStore();
  const [completionState, setCompletionState] = useState<CompletionState>(
    data.accountCreated ? "success" : "idle"
  );
  const { show, pushModal } = useModal();
  const isSubmittingRef = useRef(false);
  const isCreating = completionState === "creating";

  const createAccount = async () => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setCompletionState("creating");
    setError(null);

    try {
      // Build FormData for the combined onboard API
      const formData = new FormData();
      formData.append("email", data.email.trim().toLowerCase());
      formData.append("password", data.password);
      formData.append("handle", data.handle);
      formData.append("pdsDomain", data.selectedPdsDomain || defaultSignupPdsDomain);
      formData.append("displayName", data.organizationName);
      formData.append("shortDescription", data.shortDescription);
      formData.append("longDescription", data.longDescription);
      formData.append("country", data.country);

      if (data.website) {
        formData.append("website", data.website);
      }
      if (data.startDate) {
        formData.append("startDate", data.startDate);
      }
      if (data.logo) {
        formData.append("logo", data.logo);
      }
      // Ensure objectives is never empty - always send at least ["Other"]
      const objectives = data.objectives && data.objectives.length > 0
        ? data.objectives
        : ["Other"];
      formData.append("objectives", JSON.stringify(objectives));

      const response = await fetch(links.api.onboarding.onboard, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || errorData.error || "Failed to create account"
        );
      }

      const result = await response.json();
      const { did, organizationInitialized } = result;

      if (!did) {
        throw new Error("Your account was created but setup could not be completed. Please contact support.");
      }

      // Update store with success data
      updateData({
        did,
        accountCreated: true,
        organizationInitialized: organizationInitialized ?? false,
      });

      setCompletionState("success");

      // Clear sensitive data from store after successful account creation
      updateData({ password: "", confirmPassword: "" });
    } catch (err) {
      console.error("Account creation error:", err);
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
      setCompletionState("error");
      isSubmittingRef.current = false;
    }
  };

  const handleRetry = () => {
    setCompletionState("idle");
    setError(null);
  };

  const handleSignIn = () => {
    pushModal(
      {
        id: "auth",
        content: <AuthModal />,
      },
      true
    );
    show();
  };

  // Idle state - Show code of conduct and "Agree and Continue" button
  if (completionState === "idle") {
    return (
      <motion.div
        className="w-full max-w-md mx-auto text-center"
        initial={{ opacity: 0, filter: "blur(10px)", scale: 0.95 }}
        animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-16 w-16 bg-primary blur-2xl rounded-full animate-pulse" />
            </div>
            <CheckCircle2Icon className="w-16 h-16 text-primary" />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-serif font-bold">
              Almost There!
            </h1>
            <p className="text-sm text-muted-foreground">
              Review our Code of Conduct and create your account.
            </p>
          </div>

          <div className="w-full p-4 bg-muted/50 rounded-lg text-left">
            <p className="text-sm text-muted-foreground">
              By clicking &quot;Agree and Create Account&quot;, you agree to our{" "}
              <Link
                href="https://gainforest.notion.site/GainForest-Community-Code-of-Conduct-23094a2f76b380118bc0dfe560df4a2e"
                className="text-primary hover:underline font-medium"
                target="_blank"
                rel="noopener noreferrer"
              >
                Code of Conduct
              </Link>
              .
            </p>
          </div>

          <div className="w-full flex justify-between mt-2">
            <Button onClick={prevStep} variant="ghost">
              <ArrowLeftIcon className="mr-2" />
              Back
            </Button>
            <Button onClick={createAccount} disabled={isCreating}>
              Agree and Create Account
            </Button>
          </div>
        </div>
      </motion.div>
    );
  }

  // Creating state
  if (completionState === "creating") {
    return (
      <motion.div
        className="w-full max-w-md mx-auto text-center"
        initial={{ opacity: 0, filter: "blur(10px)", scale: 0.95 }}
        animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-16 w-16 bg-primary blur-2xl rounded-full animate-pulse" />
            </div>
            <Loader2Icon className="w-16 h-16 text-primary animate-spin" />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-serif font-bold">
              Creating Your Account
            </h1>
            <p className="text-sm text-muted-foreground">
              Please wait while we set up your account and organization...
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  // Error state
  if (completionState === "error") {
    return (
      <motion.div
        className="w-full max-w-md mx-auto text-center"
        initial={{ opacity: 0, filter: "blur(10px)", scale: 0.95 }}
        animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-16 w-16 bg-destructive blur-2xl rounded-full opacity-50" />
            </div>
            <XCircleIcon className="w-16 h-16 text-destructive" />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-serif font-bold">
              Something Went Wrong
            </h1>
            <p className="text-sm text-muted-foreground">
              We couldn&apos;t complete the account setup.
            </p>
          </div>
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg w-full">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
          <div className="flex gap-3 w-full">
            <Button onClick={prevStep} variant="ghost" className="flex-1">
              <ArrowLeftIcon className="mr-2" />
              Go Back
            </Button>
            <Button onClick={handleRetry} className="flex-1">
              Try Again
            </Button>
          </div>
        </div>
      </motion.div>
    );
  }

  // Success state
  return (
    <motion.div
      className="w-full max-w-md mx-auto text-center"
      initial={{ opacity: 0, filter: "blur(10px)", scale: 0.95 }}
      animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-16 w-16 bg-primary blur-2xl rounded-full animate-pulse" />
          </div>
          <CheckCircle2Icon className="w-16 h-16 text-primary" />
        </div>
        <div className="space-y-1">
          <h1 className="text-2xl font-serif font-bold">
            Welcome to GainForest!
          </h1>
          <p className="text-sm text-muted-foreground">
            Your account has been created. Sign in to get started.
          </p>
        </div>

        <Button onClick={handleSignIn} className="w-full mt-2">
          <LogInIcon className="mr-2" />
          Sign In
        </Button>
      </div>
    </motion.div>
  );
}
