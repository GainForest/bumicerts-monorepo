"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useOnboardingStore,
  calculatePasswordStrength,
  PasswordStrength,
} from "../store";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  EyeIcon,
  EyeOffIcon,
  AlertCircleIcon,
  Loader2Icon,
  CheckIcon,
  XIcon,
  ChevronDownIcon,
} from "lucide-react";
import { useState, useMemo, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { signupPDSDomains } from "@/lib/config/pds";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/use-debounce";
import { queryKeys } from "@/lib/query-keys";
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

// ─── PDS Domain Picker ───────────────────────────────────────────────────────

function PdsDomainPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (domain: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 px-2 bg-muted border border-l-0 rounded-r-md text-xs text-muted-foreground h-9 shrink-0 hover:text-foreground transition-colors"
      >
        <span className="font-mono">.{value}</span>
        <ChevronDownIcon className={cn("w-3 h-3 transition-transform", open && "rotate-180")} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 top-full mt-1 z-50 min-w-[160px] bg-popover border border-border rounded-md shadow-md overflow-hidden"
          >
            {signupPDSDomains.map((domain) => (
              <button
                key={domain}
                type="button"
                onClick={() => { onChange(domain); setOpen(false); }}
                className={cn(
                  "w-full text-left px-3 py-2 text-xs hover:bg-accent transition-colors",
                  value === domain && "bg-accent text-accent-foreground font-medium"
                )}
              >
                {domain}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── StepCredentials ─────────────────────────────────────────────────────────

export function StepCredentials() {
  const { data, updateData, nextStep, prevStep, error, setError } =
    useOnboardingStore();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const isDev = process.env.NODE_ENV !== "production";

  // Ensure selectedPdsDomain is initialised
  useEffect(() => {
    if (!data.selectedPdsDomain) {
      updateData({ selectedPdsDomain: signupPDSDomains[0] });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedDomain = data.selectedPdsDomain || signupPDSDomains[0];
  const isMultiDomain = signupPDSDomains.length > 1;

  const passwordAnalysis = useMemo(
    () => calculatePasswordStrength(data.password),
    [data.password]
  );

  // Debounce handle for availability check
  const debouncedHandle = useDebounce(data.handle, 500);
  const fullHandle = `${debouncedHandle}.${selectedDomain}`;

  // Check handle availability
  const { data: handleCheckResult, isLoading: isCheckingHandle } = useQuery({
    queryKey: queryKeys.handle.availability(debouncedHandle + "@" + selectedDomain),
    queryFn: async () => {
      if (!debouncedHandle || debouncedHandle.length < 3) return { available: true, checked: false };
      const res = await fetch(links.api.searchActors(fullHandle, 1));
      if (!res.ok) return { available: true, checked: true };
      const result = await res.json();
      const exactMatch = result.actors?.some(
        (actor: { handle: string }) => actor.handle.toLowerCase() === fullHandle.toLowerCase()
      );
      return { available: !exactMatch, checked: true };
    },
    enabled: debouncedHandle.length >= 3,
    staleTime: 30 * 1_000,
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
              {isMultiDomain ? (
                <PdsDomainPicker
                  value={selectedDomain}
                  onChange={(d) => updateData({ selectedPdsDomain: d })}
                />
              ) : (
                <div className="flex items-center px-2 bg-muted border border-l-0 rounded-r-md text-xs text-muted-foreground h-9 shrink-0">
                  .{selectedDomain}
                </div>
              )}
            </div>

            {/* Handle availability indicator */}
            <div className="flex items-center justify-between">
              <p id="handle-hint" className="text-xs text-muted-foreground">
                Your handle:{" "}
                <span className="font-medium text-foreground font-mono">
                  @{data.handle || "handle"}.{selectedDomain}
                </span>
              </p>

              {data.handle.length >= 3 && (
                <div className="flex items-center gap-1 text-xs">
                  {handleAvailability === "checking" && (
                    <>
                      <Loader2Icon className="w-3 h-3 animate-spin text-muted-foreground" />
                      <span className="text-muted-foreground">Checking...</span>
                    </>
                  )}
                  {handleAvailability === "available" && (
                    <>
                      <CheckIcon className="w-3 h-3 text-primary" />
                      <span className="text-primary">Available</span>
                    </>
                  )}
                  {handleAvailability === "taken" && (
                    <>
                      <XIcon className="w-3 h-3 text-destructive" />
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
                  <EyeOffIcon className="w-4 h-4" />
                ) : (
                  <EyeIcon className="w-4 h-4" />
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
                  <EyeOffIcon className="w-4 h-4" />
                ) : (
                  <EyeIcon className="w-4 h-4" />
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
                    <AlertCircleIcon className="w-3 h-3" />
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
            <ArrowLeftIcon className="mr-2" />
            Back
          </Button>
          <Button onClick={handleContinue} disabled={!canContinue}>
            Continue
            <ArrowRightIcon className="ml-2" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
