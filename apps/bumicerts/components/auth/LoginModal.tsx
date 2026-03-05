"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRightIcon, LoaderIcon, ChevronDownIcon, CheckIcon } from "lucide-react";
import { authorize } from "@/components/actions/oauth";
import { loginPDSDomains, isValidPdsDomain } from "@/lib/config/pds";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";

interface LoginModalProps {
  onClose: () => void;
}

// ─── Pill Toggle ──────────────────────────────────────────────────────────────

function PillToggle({
  active,
  onChange,
}: {
  active: "handle" | "email";
  onChange: (tab: "handle" | "email") => void;
}) {
  return (
    <div className="flex w-full rounded-full bg-muted p-1">
      <button
        type="button"
        onClick={() => onChange("email")}
        className={cn(
          "flex-1 rounded-full px-4 py-1.5 text-sm font-medium transition-all",
          active === "email"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        Email
      </button>
      <button
        type="button"
        onClick={() => onChange("handle")}
        className={cn(
          "flex-1 rounded-full px-4 py-1.5 text-sm font-medium transition-all",
          active === "handle"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        Handle
      </button>
    </div>
  );
}

// ─── PDS Domain Dropdown ──────────────────────────────────────────────────────

const CUSTOM_SENTINEL = "__custom__";

function PdsDomainDropdown({
  value,
  customValue,
  onChange,
  onCustomChange,
}: {
  value: string;
  customValue: string;
  onChange: (domain: string) => void;
  onCustomChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const isCustom = value === CUSTOM_SENTINEL;

  const displayLabel = isCustom ? (customValue || "custom PDS") : value;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1 h-9 px-2 bg-muted border-y border-r border-input rounded-r-md text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0 max-w-[160px]"
        >
          <span className="truncate font-mono">.{displayLabel}</span>
          <ChevronDownIcon className={cn("w-3 h-3 shrink-0 transition-transform", open && "rotate-180")} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-48 p-1">
        {loginPDSDomains.map((domain) => (
          <button
            key={domain}
            type="button"
            onClick={() => { onChange(domain); setOpen(false); }}
            className={cn(
              "w-full text-left flex items-center justify-between px-3 py-2 text-xs rounded-sm hover:bg-accent transition-colors",
              value === domain && "bg-accent/60"
            )}
          >
            <span className="font-mono">{domain}</span>
            {value === domain && <CheckIcon className="w-3 h-3 shrink-0 text-primary" />}
          </button>
        ))}

        <div className="h-px bg-border mx-2 my-1" />

        <button
          type="button"
          onClick={() => { onChange(CUSTOM_SENTINEL); setOpen(false); }}
          className={cn(
            "w-full text-left flex items-center justify-between px-3 py-2 text-xs rounded-sm hover:bg-accent transition-colors",
            isCustom && "bg-accent/60"
          )}
        >
          <span className="text-muted-foreground">Custom PDS…</span>
          {isCustom && <CheckIcon className="w-3 h-3 shrink-0 text-primary" />}
        </button>
      </PopoverContent>
    </Popover>
  );
}

// ─── Email Form ───────────────────────────────────────────────────────────────

function EmailForm() {
  const [email, setEmail] = useState("");
  const [isRedirecting, setIsRedirecting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsRedirecting(true);
    setTimeout(() => setIsRedirecting(false), 10_000);
    const url = email
      ? `/api/oauth/epds/login?email=${encodeURIComponent(email)}`
      : "/api/oauth/epds/login";
    window.location.href = url;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="login-email" className="text-sm font-medium">
          Email
        </label>
        <Input
          id="login-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          autoFocus
          disabled={isRedirecting}
        />
        <p className="text-xs text-muted-foreground">
          We&apos;ll send you a verification code
        </p>
      </div>

      <Button type="submit" disabled={isRedirecting || !email.trim()} className="w-full">
        {isRedirecting ? (
          <>
            <LoaderIcon className="animate-spin" />
            Redirecting…
          </>
        ) : (
          <>
            Continue
            <ArrowRightIcon />
          </>
        )}
      </Button>
    </form>
  );
}

// ─── Handle Form ──────────────────────────────────────────────────────────────

function HandleForm() {
  const [handle, setHandle] = useState("");
  const [selectedDomain, setSelectedDomain] = useState<string>(loginPDSDomains[0]);
  const [customDomain, setCustomDomain] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isCustom = selectedDomain === CUSTOM_SENTINEL;
  // The effective PDS domain — either a preset or the custom input
  const effectiveDomain = isCustom ? customDomain.trim() : selectedDomain;

  // If the user typed a full handle (contains "."), use it as-is.
  // Otherwise, append the effective PDS domain.
  const fullHandle = handle.includes(".")
    ? handle.trim()
    : handle.trim() && effectiveDomain
    ? `${handle.trim()}.${effectiveDomain}`
    : "";

  const customDomainError =
    isCustom && customDomain && !isValidPdsDomain(customDomain)
      ? "Enter a valid PDS domain (e.g. pds.example.com)"
      : null;

  const handleError =
    handle && /[^a-zA-Z0-9\-.]/.test(handle)
      ? "Only letters, numbers, hyphens and dots are allowed."
      : null;

  const canSubmit =
    handle.trim() &&
    !handleError &&
    effectiveDomain &&
    !customDomainError &&
    (!isCustom || isValidPdsDomain(customDomain));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    startTransition(async () => {
      try {
        const { authorizationUrl } = await authorize(fullHandle || handle.trim());
        window.location.href = authorizationUrl;
      } catch (err) {
        setError("Unable to start sign-in. Please try again.");
        console.error(err);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="login-handle" className="text-sm font-medium">
          Username
        </label>
        <div className="flex rounded-md border border-input">
          <Input
            id="login-handle"
            type="text"
            value={handle}
            onChange={(e) => { setHandle(e.target.value); setError(null); }}
            placeholder="your-handle"
            autoComplete="username"
            autoFocus
            disabled={isPending}
            className="flex-1 rounded-l-md rounded-r-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          <PdsDomainDropdown
            value={selectedDomain}
            customValue={customDomain}
            onChange={setSelectedDomain}
            onCustomChange={setCustomDomain}
          />
        </div>

        {/* Custom PDS input — revealed when "Custom PDS…" is selected */}
        <AnimatePresence>
          {isCustom && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.15 }}
            >
              <Input
                type="text"
                value={customDomain}
                onChange={(e) => setCustomDomain(e.target.value.toLowerCase().trim())}
                placeholder="pds.example.com"
                autoFocus
                disabled={isPending}
                className={cn(
                  "mt-1.5 h-8 text-xs font-mono",
                  customDomainError && "border-destructive focus-visible:ring-destructive/50"
                )}
              />
              {customDomainError && (
                <p className="text-xs text-destructive mt-1">{customDomainError}</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Handle preview / error */}
        <AnimatePresence mode="wait">
          {handleError ? (
            <motion.p
              key="herr"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="text-xs text-destructive"
            >
              {handleError}
            </motion.p>
          ) : fullHandle ? (
            <motion.p
              key="hpreview"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="text-xs text-muted-foreground"
            >
              Signing in as{" "}
              <span className="font-mono text-foreground">{fullHandle}</span>
            </motion.p>
          ) : null}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-xs text-destructive"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      <Button
        type="submit"
        disabled={!canSubmit || isPending}
        className="w-full"
      >
        {isPending ? (
          <>
            <LoaderIcon className="animate-spin" />
            Redirecting…
          </>
        ) : (
          <>
            Continue
            <ArrowRightIcon />
          </>
        )}
      </Button>
    </form>
  );
}

// ─── Login Modal ──────────────────────────────────────────────────────────────

export function LoginModal({ onClose }: LoginModalProps) {
  const [activeTab, setActiveTab] = useState<"handle" | "email">("email");
  const hasEpds = !!process.env.NEXT_PUBLIC_EPDS_URL;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97, y: 8 }}
      transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
      className="w-full"
    >
      {/* Logo */}
      <div className="flex justify-center mb-4">
        <Image
          src="/assets/media/images/logo.svg"
          alt="GainForest"
          width={40}
          height={40}
          className="dark:invert"
        />
      </div>

      {/* Headline */}
      <div className="text-center mb-6">
        <h2
          className="text-3xl font-light tracking-[-0.02em] text-foreground mb-2"
          style={{ fontFamily: "var(--font-garamond-var)" }}
        >
          Welcome back
        </h2>
        <p className="text-sm text-muted-foreground">
          Sign in to your ATProto account
        </p>
      </div>

      {/* Tab toggle — always show since both methods are available */}
      <div className="mb-6">
        <PillToggle active={activeTab} onChange={setActiveTab} />
      </div>

      {/* Form */}
      <AnimatePresence mode="wait">
        {hasEpds && activeTab === "email" ? (
          <motion.div
            key="email"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 8 }}
            transition={{ duration: 0.2 }}
          >
            <EmailForm />
          </motion.div>
        ) : (
          <motion.div
            key="handle"
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.2 }}
          >
            <HandleForm />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-3 my-4">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground">or</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link
          href="/onboarding"
          onClick={onClose}
          className="text-primary font-medium hover:underline"
        >
          Sign up as an organization
        </Link>
      </p>
    </motion.div>
  );
}
