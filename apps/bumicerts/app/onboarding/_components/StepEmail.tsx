"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useOnboardingStore } from "../store";
import { ArrowLeftIcon, ArrowRightIcon, Loader2Icon, MailIcon, RefreshCwIcon, KeyRoundIcon } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { links } from "@/lib/links";
import { defaultPdsDomain } from "@/lib/config/pds";

type Phase = "email" | "code";

export function StepEmail() {
  const { data, updateData, nextStep, prevStep, setError, error } =
    useOnboardingStore();
  const [phase, setPhase] = useState<Phase>(data.inviteCode ? "code" : "email");
  const [isLoading, setIsLoading] = useState(false);
  const [retryAfter, setRetryAfter] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState<number>(0);
  const [hasExistingCode, setHasExistingCode] = useState(false);
  const isSubmittingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email);
  const isValidCode = data.inviteCode.trim().length > 0;

  // Countdown timer for rate limit
  useEffect(() => {
    if (!retryAfter) {
      setCountdown(0);
      return;
    }

    const updateCountdown = () => {
      const now = new Date();
      const diff = Math.max(0, Math.ceil((retryAfter.getTime() - now.getTime()) / 1000));
      setCountdown(diff);

      if (diff === 0) {
        setRetryAfter(null);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [retryAfter]);

  const handleSendCode = async () => {
    if (!isValidEmail) {
      setError("Please enter a valid email address");
      return;
    }

    // Fix 1: Synchronous guard to prevent concurrent submissions
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    // Fix 3: Cancel any in-flight request before starting a new one
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();
    const { signal } = abortControllerRef.current;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(links.api.onboarding.sendInviteEmail, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.email.trim().toLowerCase(),
          pdsDomain: defaultPdsDomain,
        }),
        signal,
      });

      // Fix 3: Ignore stale responses if a newer request has already been initiated
      if (signal.aborted) return;

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 429 && result.retryAfter) {
          // Rate limited
          setRetryAfter(new Date(result.retryAfter));
          setError(result.message || "Please wait before requesting another code");
        } else {
          setError(result.message || "Failed to send verification code");
        }
        return;
      }

      // Success - move to code entry phase
      setPhase("code");
      setError(null);
      // Fix 2: Apply 60-second cooldown after successful send
      setRetryAfter(new Date(Date.now() + 60_000));
    } catch (err) {
      // Ignore abort errors — they are intentional cancellations
      if (err instanceof Error && err.name === "AbortError") return;
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
      // Fix 1: Release the submission guard
      isSubmittingRef.current = false;
    }
  };

  const handleVerifyCode = async () => {
    if (!isValidCode) {
      setError("Please enter the verification code");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(links.api.onboarding.verifyInviteCode, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.email.trim().toLowerCase(),
          inviteCode: data.inviteCode.trim(),
          pdsDomain: defaultPdsDomain,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.message || "Invalid verification code");
        return;
      }

      // Success - advance to next step
      nextStep();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangeEmail = () => {
    setPhase("email");
    updateData({ inviteCode: "" });
    setError(null);
    setHasExistingCode(false);
  };

  const handleHaveCode = () => {
    if (!isValidEmail) {
      setError("Please enter your email address first");
      return;
    }
    setHasExistingCode(true);
    setPhase("code");
    setError(null);
  };

  const handleResendCode = async () => {
    if (countdown > 0) return;
    setHasExistingCode(false); // Reset since we're sending a new code
    await handleSendCode();
  };

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  // Phase 1: Email input
  if (phase === "email") {
    return (
      <motion.div
        className="w-full max-w-md mx-auto"
        initial={{ opacity: 0, filter: "blur(10px)", scale: 0.95 }}
        animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
        exit={{ opacity: 0, filter: "blur(10px)", scale: 0.95 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex flex-col items-center gap-4">
          {/* Header */}
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-serif font-bold">Verify Your Email</h1>
            <p className="text-sm text-muted-foreground">
              We&apos;ll send a verification code to your email.
            </p>
          </div>

          {/* Form */}
          <div className="w-full space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium leading-none">
                Email Address
              </label>
              <Input
                id="email"
                type="email"
                placeholder="you@organization.com"
                value={data.email}
                onChange={(e) => {
                  updateData({ email: e.target.value });
                  setError(null);
                }}
                disabled={isLoading}
                aria-describedby="email-hint"
              />
              <p id="email-hint" className="text-xs text-muted-foreground">
                This email will be associated with your organization account
              </p>
            </div>

            {/* Error display */}
            {error && (
              <div
                className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg"
                role="alert"
              >
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {/* Already have a code link */}
            <div className="flex items-center justify-end -mb-2">
              <button
                type="button"
                onClick={handleHaveCode}
                disabled={isLoading}
                className="text-sm text-primary hover:text-foreground inline-flex items-center gap-1.5 underline underline-offset-2"
              >
                <KeyRoundIcon className="w-3.5 h-3.5" />
                Already have a code?
              </button>
            </div>
          </div>

          {/* Navigation */}
          <div className="w-full flex justify-between mt-2">
            <Button onClick={prevStep} variant="ghost" disabled={isLoading}>
              <ArrowLeftIcon className="mr-2" />
              Back
            </Button>
            <Button
              onClick={handleSendCode}
              disabled={!isValidEmail || isLoading || countdown > 0}
            >
              {isLoading ? (
                <>
                  <Loader2Icon className="mr-2 animate-spin" />
                  Sending...
                </>
              ) : countdown > 0 ? (
                <>
                  Wait {formatCountdown(countdown)}
                </>
              ) : (
                <>
                  <MailIcon className="mr-2" />
                  Send Code
                </>
              )}
            </Button>
          </div>
        </div>
      </motion.div>
    );
  }

  // Phase 2: Code verification
  return (
    <motion.div
      className="w-full max-w-md mx-auto"
      initial={{ opacity: 0, filter: "blur(10px)", scale: 0.95 }}
      animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
      exit={{ opacity: 0, filter: "blur(10px)", scale: 0.95 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex flex-col items-center gap-4">
        {/* Header */}
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-serif font-bold">Enter Verification Code</h1>
          <p className="text-sm text-muted-foreground">
            {hasExistingCode ? (
              <>
                Enter the code you received for{" "}
                <span className="font-medium text-foreground">{data.email}</span>
              </>
            ) : (
              <>
                We sent a code to{" "}
                <span className="font-medium text-foreground">{data.email}</span>
              </>
            )}
          </p>
        </div>

        {/* Form */}
        <div className="w-full space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="invite-code" className="text-sm font-medium leading-none">
              Verification Code
            </label>
            <Input
              id="invite-code"
              type="text"
              placeholder="Enter the code from your email"
              value={data.inviteCode}
              onChange={(e) => {
                updateData({ inviteCode: e.target.value });
                setError(null);
              }}
              disabled={isLoading}
              autoComplete="one-time-code"
            />
          </div>

          {/* Action links */}
          <div className="flex items-center justify-between text-sm">
            <button
              type="button"
              onClick={handleChangeEmail}
              className="text-muted-foreground hover:text-foreground underline underline-offset-2"
              disabled={isLoading}
            >
              Change email
            </button>
            <button
              type="button"
              onClick={handleResendCode}
              disabled={isLoading || countdown > 0}
              className="text-primary hover:text-primary/80 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <RefreshCwIcon className="w-3 h-3" />
              {countdown > 0
                ? `Resend in ${formatCountdown(countdown)}`
                : hasExistingCode
                  ? "Send new code"
                  : "Resend code"}
            </button>
          </div>

          {/* Error display */}
          {error && (
            <div
              className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg"
              role="alert"
            >
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="w-full flex justify-between mt-2">
          <Button onClick={handleChangeEmail} variant="ghost" disabled={isLoading}>
            <ArrowLeftIcon className="mr-2" />
            Back
          </Button>
          <Button onClick={handleVerifyCode} disabled={!isValidCode || isLoading}>
            {isLoading ? (
              <>
                <Loader2Icon className="mr-2 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                Verify
                <ArrowRightIcon className="ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
