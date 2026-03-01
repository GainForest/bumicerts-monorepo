"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useOnboardingStore,
  calculatePasswordStrength,
  PasswordStrength,
} from "../store";
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  Check,
  X,
} from "lucide-react";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { allowedPDSDomains } from "@/lib/config/gainforest-sdk";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/use-debounce";
import { links } from "@/lib/links";

const STRENGTH_COLORS: Record<PasswordStrength, string> = {
  weak: "bg-red-500",
  fair: "bg-orange-500",
  good: "bg-yellow-500",
  strong: "bg-primary",
};

const STRENGTH_LABELS: Record<PasswordStrength, string> = {
  weak: "Weak",
  fair: "Fair",
  good: "Good",
  strong: "Strong",
};

const STRENGTH_WIDTH: Record<PasswordStrength, string> = {
  weak: "w-1/4",
  fair: "w-2/4",
  good: "w-3/4",
  strong: "w-full",
};

type HandleAvailability = "checking" | "available" | "taken" | "idle";

export function StepCredentials() {
  const { data, updateData, nextStep, prevStep, error, setError } =
    useOnboardingStore();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const isDev = process.env.NODE_ENV !== "production";

  const passwordAnalysis = useMemo(
    () => calculatePasswordStrength(data.password),
    [data.password]
  );

  // Debounce handle for availability check
  const debouncedHandle = useDebounce(data.handle, 500);
  const fullHandle = `${debouncedHandle}.${allowedPDSDomains[0]}`;

  // Check handle availability
  const { data: handleCheckResult, isLoading: isCheckingHandle } = useQuery({
    queryKey: ["handleAvailability", debouncedHandle],
    queryFn: async () => {
      if (!debouncedHandle || debouncedHandle.length < 3) {
        return { available: true, checked: false };
      }

      const response = await fetch(links.api.searchActors(fullHandle, 1));
      if (!response.ok) {
        // On error, assume available (don't block user)
        return { available: true, checked: true };
      }

      const result = await response.json();
      // Check if any actor has an exact handle match
      const exactMatch = result.actors?.some(
        (actor: { handle: string }) =>
          actor.handle.toLowerCase() === fullHandle.toLowerCase()
      );

      return { available: !exactMatch, checked: true };
    },
    enabled: debouncedHandle.length >= 3,
    staleTime: 30 * 1000, // Cache for 30 seconds
  });

  const handleAvailability: HandleAvailability = useMemo(() => {
    if (data.handle.length < 3) return "idle";
    if (data.handle !== debouncedHandle || isCheckingHandle) return "checking";
    if (!handleCheckResult?.checked) return "idle";
    return handleCheckResult.available ? "available" : "taken";
  }, [data.handle, debouncedHandle, isCheckingHandle, handleCheckResult]);

  const passwordsMatch =
    data.password.length > 0 && data.password === data.confirmPassword;
  const passwordsDontMatch =
    data.confirmPassword.length > 0 && data.password !== data.confirmPassword;

  // In dev mode, only require password to not be empty (no strength/length requirements)
  const isPasswordValid = isDev
    ? data.password.length > 0
    : passwordAnalysis.strength !== "weak" && data.password.length >= 8;

  const canContinue =
    data.handle.trim().length >= 3 &&
    isPasswordValid &&
    passwordsMatch &&
    handleAvailability !== "taken" &&
    handleAvailability !== "checking";

  const handleContinue = () => {
    // Clean trailing hyphens before validation
    const cleanHandle = data.handle.replace(/-+$/, "");
    if (cleanHandle !== data.handle) {
      updateData({ handle: cleanHandle });
    }

    if (!canContinue) {
      if (!data.handle.trim() || data.handle.trim().length < 3) {
        setError("Handle must be at least 3 characters");
      } else if (handleAvailability === "taken") {
        setError("This handle is already taken");
      } else if (!isPasswordValid) {
        setError("Please choose a stronger password");
      } else if (!passwordsMatch) {
        setError("Passwords do not match");
      }
      return;
    }
    setError(null);
    nextStep();
  };

  const handleHandleChange = (value: string) => {
    // Normalize handle: lowercase, remove special chars except hyphens, no leading hyphens
    // Note: trailing hyphens are cleaned on continue/blur to allow typing "my-org-name"
    const normalized = value
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "")
      .replace(/^-+/, "")
      .replace(/-{2,}/g, "-");
    updateData({ handle: normalized });
    if (error) setError(null);
  };

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
          <h1 className="text-2xl font-serif font-bold">Create Your Account</h1>
          <p className="text-sm text-muted-foreground">
            Choose your handle and set a secure password.
          </p>
        </div>

        {/* Form */}
        <div className="w-full space-y-4">
          {/* Handle */}
          <div className="space-y-1.5">
            <label
              htmlFor="handle"
              className="text-sm font-medium leading-none"
            >
              Handle <span className="text-destructive">*</span>
            </label>
            <div className="flex">
              <Input
                id="handle"
                type="text"
                placeholder="your-organization"
                value={data.handle}
                onChange={(e) => handleHandleChange(e.target.value)}
                className={cn(
                  "rounded-r-none h-9",
                  handleAvailability === "taken" &&
                    "border-destructive focus-visible:ring-destructive/50",
                  handleAvailability === "available" &&
                    "border-primary focus-visible:ring-primary/50"
                )}
                aria-describedby="handle-hint"
              />
              <div className="flex items-center px-2 bg-muted border border-l-0 rounded-r-md text-xs text-muted-foreground">
                .{allowedPDSDomains[0]}
              </div>
            </div>

            {/* Handle availability indicator */}
            <div className="flex items-center justify-between">
              <p id="handle-hint" className="text-xs text-muted-foreground">
                Your handle:{" "}
                <span className="font-medium text-foreground">
                  @{data.handle || "handle"}.{allowedPDSDomains[0]}
                </span>
              </p>

              {data.handle.length >= 3 && (
                <div className="flex items-center gap-1 text-xs">
                  {handleAvailability === "checking" && (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                      <span className="text-muted-foreground">Checking...</span>
                    </>
                  )}
                  {handleAvailability === "available" && (
                    <>
                      <Check className="w-3 h-3 text-primary" />
                      <span className="text-primary">Available</span>
                    </>
                  )}
                  {handleAvailability === "taken" && (
                    <>
                      <X className="w-3 h-3 text-destructive" />
                      <span className="text-destructive">Taken</span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label
              htmlFor="password"
              className="text-sm font-medium leading-none"
            >
              Password <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter a secure password"
                value={data.password}
                onChange={(e) => {
                  updateData({ password: e.target.value });
                  if (error) setError(null);
                }}
                className="pr-10 h-9"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* Password strength indicator */}
            {data.password.length > 0 && (
              <div className="space-y-1.5">
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full transition-all duration-300",
                      STRENGTH_COLORS[passwordAnalysis.strength],
                      STRENGTH_WIDTH[passwordAnalysis.strength]
                    )}
                  />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span
                    className={cn(
                      "font-medium",
                      passwordAnalysis.strength === "weak" && "text-red-500",
                      passwordAnalysis.strength === "fair" && "text-orange-500",
                      passwordAnalysis.strength === "good" && "text-yellow-600",
                      passwordAnalysis.strength === "strong" && "text-primary"
                    )}
                  >
                    {STRENGTH_LABELS[passwordAnalysis.strength]}
                  </span>
                  {isDev && (
                    <span className="text-muted-foreground italic text-[10px]">
                      (Check disabled in dev)
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5">
            <label
              htmlFor="confirm-password"
              className="text-sm font-medium leading-none"
            >
              Confirm Password <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <Input
                id="confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Repeat your password"
                value={data.confirmPassword}
                onChange={(e) => {
                  updateData({ confirmPassword: e.target.value });
                  if (error) setError(null);
                }}
                className={cn(
                  "pr-10 h-9",
                  passwordsMatch &&
                    "border-primary focus-visible:ring-primary/50",
                  passwordsDontMatch &&
                    "border-destructive focus-visible:ring-destructive/50"
                )}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={
                  showConfirmPassword ? "Hide password" : "Show password"
                }
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* Password match indicator */}
            {data.confirmPassword.length > 0 && (
              <p
                className={cn(
                  "text-xs flex items-center gap-1",
                  passwordsMatch ? "text-primary" : "text-destructive"
                )}
              >
                {passwordsMatch ? (
                  <>Passwords match</>
                ) : (
                  <>
                    <AlertCircle className="w-3 h-3" />
                    Passwords do not match
                  </>
                )}
              </p>
            )}
          </div>

          {/* Error display */}
          {error && (
            <div
              className="p-2 bg-destructive/10 border border-destructive/20 rounded-lg"
              role="alert"
            >
              <p className="text-xs text-destructive">{error}</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="w-full flex justify-between mt-1">
          <Button onClick={prevStep} variant="ghost">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Button onClick={handleContinue} disabled={!canContinue}>
            Continue
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
