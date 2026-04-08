"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useOnboardingStore } from "../store";
import { ArrowRightIcon } from "lucide-react";
import { motion } from "framer-motion";
import Image from "next/image";

function isValidUrl(url: string): boolean {
  if (!url) return true; // Empty is valid
  try {
    const urlToTest = url.startsWith("http") ? url : `https://${url}`;
    const parsed = new URL(urlToTest);
    // Must have a valid hostname with at least one dot (e.g., example.com)
    return parsed.hostname.includes(".");
  } catch {
    return false;
  }
}

export function StepIntro() {
  const { data, updateData, nextStep } = useOnboardingStore();

  const hasWebsite = data.website.trim().length > 0;
  const websiteValid = isValidUrl(data.website);
  const canContinueWithWebsite = hasWebsite && websiteValid;

  const handleContinue = () => {
    if (canContinueWithWebsite) {
      nextStep();
    }
  };

  const handleSkip = () => {
    updateData({ website: "" });
    nextStep();
  };

  return (
    <motion.div
      className="w-full max-w-md mx-auto"
      initial={{ opacity: 0, filter: "blur(10px)", scale: 0.95 }}
      animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
      exit={{ opacity: 0, filter: "blur(10px)", scale: 0.95 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex flex-col items-center gap-3">
        {/* Icon with glow */}
        <div className="flex items-center justify-center relative">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-16 w-16 bg-primary blur-2xl rounded-full animate-pulse" />
          </div>
          <Image src="/assets/media/images/logo.svg" className="brightness-50" alt="GainForest Logo" width={64} height={64} />
        </div>

        {/* Title */}
        <h1 className="text-3xl font-serif font-bold">Join GainForest</h1>
        <p className="text-muted-foreground text-center text-pretty max-w-sm">
          Create your organization account and start publishing bumicerts.
        </p>

        {/* Form */}
        <form
          className="w-full space-y-4 mt-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (canContinueWithWebsite) handleContinue();
          }}
        >
          <div>
            <label
              htmlFor="website"
              className="text-sm font-medium leading-none"
            >
              Website
            </label>
            <Input
              id="website"
              type="text"
              inputMode="url"
              autoComplete="url"
              placeholder="https://your-organization.org"
              value={data.website}
              className="mt-1"
              onChange={(e) => updateData({ website: e.target.value })}
              autoFocus
            />
            {hasWebsite && !websiteValid && (
              <p className="text-xs text-destructive mt-1">
                Please enter a valid URL (e.g., https://example.com)
              </p>
            )}
          </div>

          {/* Buttons */}
          <div className="w-full flex flex-col gap-2 mt-2">
            <Button
              type="submit"
              disabled={!canContinueWithWebsite}
              className="w-full"
            >
              Continue
              <ArrowRightIcon className="ml-2" />
            </Button>
            <Button
              type="button"
              onClick={handleSkip}
              variant="ghost"
              className="w-full text-muted-foreground"
            >
              Skip
            </Button>
          </div>
        </form>
      </div>
    </motion.div>
  );
}
