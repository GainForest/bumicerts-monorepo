"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Image from "next/image";
import { format, parseISO } from "date-fns";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import QuickTooltip from "@/components/ui/quick-tooltip";
import { useModal } from "@/components/ui/modal/context";
import { CountrySelectorModalId } from "@/components/modals/country-selector";
import { ImageEditorModalId } from "@/components/modals/image-editor";
import { LeafletEditor } from "@/components/ui/leaflet-editor";
import dynamic from "next/dynamic";

import {
  ArrowRightIcon,
  CalendarIcon,
  GlobeIcon,
  Loader2Icon,
  ImageIcon,
  SparklesIcon,
  SparkleIcon,
  Trash2Icon,
  UploadIcon,
  BuildingIcon,
  Building2Icon,
  MapPinHouseIcon,
  CalendarPlusIcon,
  MapPinPlusIcon,
  CheckCircle2Icon,
} from "lucide-react";

import { countries } from "@/lib/countries";
import { cn } from "@/lib/utils";
import { links } from "@/lib/links";
import { textToLinearDocument } from "@/lib/utils/linearDocument";
import { extractTextFromLinearDocument } from "@/lib/adapters";
import type { LeafletLinearDocument } from "@gainforest/leaflet-react";
import type { LinearDocument } from "@gainforest/atproto-mutations-next";
import { trpc } from "@/lib/trpc/client";
import { indexerTrpc } from "@/lib/trpc/indexer/client";
import { formatError } from "@/lib/utils/trpc-errors";
import { toSerializableFile } from "@/lib/mutations-utils";

const CountrySelectorModal = dynamic(
  () => import("@/components/modals/country-selector"),
  { ssr: false },
);
const ImageEditorModal = dynamic(
  () =>
    import("@/components/modals/image-editor").then((m) => ({
      default: m.ImageEditorModal,
    })),
  { ssr: false },
);

type Objective =
  | "Conservation"
  | "Research"
  | "Education"
  | "Community"
  | "Other";

type BrandInfo = {
  found: boolean;
  name?: string;
  description?: string;
  logoUrl?: string;
  domain?: string;
  countryCode?: string;
  country?: string;
  foundedYear?: number;
};

function extractDomain(url: string): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function validateUrl(url: string): boolean {
  if (!url) return true;
  try {
    const urlToTest = url.startsWith("http") ? url : `https://${url}`;
    const parsed = new URL(urlToTest);
    return parsed.hostname.includes(".");
  } catch {
    return false;
  }
}

type FormState = {
  organizationName: string;
  website: string;
  country: string;
  startDate: string | null;
  longDescription: LeafletLinearDocument;
  logo: File | undefined;
};

export function OrgSetupPage({ did }: { did: string }) {
  const router = useRouter();
  const { show, pushModal } = useModal();

  const [form, setForm] = useState<FormState>({
    organizationName: "",
    website: "",
    country: "",
    startDate: null,
    longDescription: { $type: "pub.leaflet.pages.linearDocument", blocks: [] },
    logo: undefined,
  });

  const [websiteError, setWebsiteError] = useState<string | null>(null);
  const [isFetchingBrandInfo, setIsFetchingBrandInfo] = useState(false);
  const [brandInfoFetched, setBrandInfoFetched] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Saved!");

  const upsertOrgInfo = trpc.organization.info.upsert.useMutation();
  const indexerUtils = indexerTrpc.useUtils();
  const pollingRef = useRef(false);

  const updateForm = (patch: Partial<FormState>) =>
    setForm((prev) => ({ ...prev, ...patch }));

  const selectedCountry = form.country ? countries[form.country] : null;
  const domain = useMemo(() => extractDomain(form.website), [form.website]);
  const canFetchBrandInfo = !!domain && !isFetchingBrandInfo;

  const longDescriptionText = extractTextFromLinearDocument(
    form.longDescription,
  );

  const canSubmit =
    form.organizationName.trim().length > 0 &&
    longDescriptionText.trim().length >= 50 &&
    form.country.length === 2 &&
    form.country in countries &&
    !isSubmitting;

  // ── Logo helpers ────────────────────────────────────────────────────────────

  const fetchLogoAsFile = async (logoUrl: string): Promise<File | null> => {
    try {
      const response = await fetch(logoUrl);
      if (!response.ok) return null;
      const blob = await response.blob();
      const extension = logoUrl.split(".").pop()?.split("?")[0] ?? "png";
      const mimeType = blob.type || `image/${extension}`;
      return new File([blob], `logo.${extension}`, { type: mimeType });
    } catch {
      return null;
    }
  };

  const logoPreviewUrl = useMemo(() => {
    if (form.logo instanceof File) {
      return URL.createObjectURL(form.logo);
    }
    return null;
  }, [form.logo]);

  useEffect(() => {
    return () => {
      if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl);
    };
  }, [logoPreviewUrl]);

  // ── Poll indexer after save, then refresh ───────────────────────────────────

  useEffect(() => {
    if (!saveSuccess || pollingRef.current) return;
    pollingRef.current = true;

    const MAX_ATTEMPTS = 20;
    const POLL_INTERVAL = 1_500; // ms
    let attempt = 0;
    let cancelled = false;

    async function poll() {
      while (!cancelled && attempt < MAX_ATTEMPTS) {
        attempt++;
        setStatusMessage(`Waiting for indexer\u2026 (${attempt}/${MAX_ATTEMPTS})`);
        try {
          const result = await indexerUtils.organization.byDid.fetch({ did });
          if (result?.org) {
            setStatusMessage("Indexed! Refreshing\u2026");
            router.refresh();
            return;
          }
        } catch {
          // indexer not ready yet, keep polling
        }
        await new Promise((r) => setTimeout(r, POLL_INTERVAL));
      }
      // Exhausted attempts — refresh anyway (indexer may be slow but page
      // will at least re-render; user can also manually reload)
      if (!cancelled) {
        setStatusMessage("Refreshing\u2026");
        router.refresh();
      }
    }

    void poll();
    return () => { cancelled = true; };
  }, [saveSuccess, did, router, indexerUtils]);

  // ── BrandFetch ──────────────────────────────────────────────────────────────

  const handleFetchBrandInfo = useCallback(async () => {
    const currentDomain = extractDomain(form.website);
    if (!currentDomain) return;

    setIsFetchingBrandInfo(true);
    setSubmitError(null);

    try {
      const response = await fetch(links.api.onboarding.fetchBrandInfo, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: currentDomain }),
      });

      const brandInfo: BrandInfo = await response.json();

      if (brandInfo.found) {
        const updates: Partial<FormState> = {};
        if (brandInfo.name) updates.organizationName = brandInfo.name;
        if (brandInfo.description)
          updates.longDescription = textToLinearDocument(brandInfo.description);
        if (brandInfo.countryCode && brandInfo.countryCode in countries)
          updates.country = brandInfo.countryCode;
        if (brandInfo.foundedYear)
          updates.startDate = `${brandInfo.foundedYear}-01-01`;
        if (brandInfo.logoUrl) {
          const logoFile = await fetchLogoAsFile(brandInfo.logoUrl);
          if (logoFile) updates.logo = logoFile;
        }
        if (Object.keys(updates).length > 0) updateForm(updates);
        setBrandInfoFetched(true);
      } else {
        setSubmitError("Could not find information for this website.");
      }
    } catch {
      setSubmitError("Failed to fetch website information.");
    } finally {
      setIsFetchingBrandInfo(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.website]);

  // ── Modals ──────────────────────────────────────────────────────────────────

  const handleOpenCountrySelector = () => {
    pushModal(
      {
        id: CountrySelectorModalId,
        content: (
          <CountrySelectorModal
            initialCountryCode={form.country}
            onCountryChange={(country) => updateForm({ country })}
          />
        ),
      },
      true,
    );
    show();
  };

  const handleOpenLogoEditor = () => {
    pushModal(
      {
        id: ImageEditorModalId,
        content: (
          <ImageEditorModal
            title="Upload Logo"
            description="Upload a logo for your organization"
            initialImage={form.logo}
            onImageChange={(image) => updateForm({ logo: image })}
          />
        ),
      },
      true,
    );
    show();
  };

  // ── Submit ──────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Step 1: Generate short description + objectives via AI
      let shortDescription = `${form.organizationName} is an environmental organization working towards sustainability.`;
      let objectives: Objective[] = ["Other"];

      try {
        const genRes = await fetch(
          links.api.onboarding.generateShortDescription,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              longDescription: longDescriptionText,
              organizationName: form.organizationName,
              country: form.country,
            }),
          },
        );
        const genData = await genRes.json();
        if (genData.shortDescription)
          shortDescription = genData.shortDescription;
        if (genData.objectives?.length > 0) objectives = genData.objectives;
      } catch {
        // Keep fallback values — don't block the user
      }

      // Step 2: Build website URI (ensure it has a protocol)
      const websiteUri =
        form.website && !form.website.startsWith("http")
          ? `https://${form.website}`
          : form.website || undefined;

      // Step 3: Serialize logo if present
      const logoInput = form.logo
        ? { image: await toSerializableFile(form.logo) }
        : undefined;

      // Step 4: Upsert org info via tRPC
      await upsertOrgInfo.mutateAsync({
        displayName: form.organizationName,
        shortDescription: { text: shortDescription },
        // LeafletLinearDocument is structurally compatible with the generated
        // LinearDocument type at runtime; the cast is required because the generated
        // type uses CID class instances for image blobs, which TypeScript sees as
        // incompatible.
        longDescription: form.longDescription as unknown as LinearDocument,
        objectives,
        country: form.country,
        visibility: "Public",
        website: websiteUri as `${string}:${string}` | undefined,
        startDate: form.startDate
          ? (`${form.startDate}T00:00:00.000Z` as `${string}-${string}-${string}T${string}:${string}:${string}Z`)
          : undefined,
        logo: logoInput,
      });

      // Step 5: Show success state with countdown, then refresh.
      setIsSubmitting(false);
      setSaveSuccess(true);
    } catch (caughtError) {
      console.error("Failed to save org info:", caughtError);
      setSubmitError(formatError(caughtError));
      setIsSubmitting(false);
    }
  };

  // ── Website field ───────────────────────────────────────────────────────────

  const handleWebsiteChange = (value: string) => {
    updateForm({ website: value });
    setBrandInfoFetched(false);
    if (value && !validateUrl(value)) {
      setWebsiteError("Please enter a valid URL");
    } else {
      setWebsiteError(null);
    }
  };

  const selectedDate = form.startDate ? parseISO(form.startDate) : undefined;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <motion.div
      className="w-full max-w-md mx-auto py-10"
      initial={{ opacity: 0, filter: "blur(10px)", scale: 0.97 }}
      animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
      transition={{ duration: 0.35 }}
    >
      <div className="flex flex-col items-center gap-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center rounded-full bg-primary/10 p-3 mb-1">
            <Building2Icon className="size-6 text-primary" />
          </div>
          <h1 className="font-serif text-4xl font-light tracking-[-0.02em]">
            Set up your organization
          </h1>
          <p className="text-sm text-muted-foreground">
            Your organization profile isn&apos;t set up yet. Let&apos;s fix
            that.
          </p>
        </div>

        {/* Gradient separator */}
        <div className="w-full h-px bg-gradient-to-r from-transparent via-border to-transparent" />

        {/* Website + BrandFetch row */}
        <div className="flex flex-col gap-1.5 w-full">
          <div className="flex items-center gap-2">
            <InputGroup>
              <InputGroupAddon>
                <GlobeIcon />
              </InputGroupAddon>
              <InputGroupInput
                id="website"
                type="url"
                placeholder="Your organization's website"
                value={form.website}
                onChange={(e) => handleWebsiteChange(e.target.value)}
                className={cn(
                  "h-9 text-sm",
                  websiteError &&
                    "border-destructive focus-visible:ring-destructive/50",
                )}
              />
            </InputGroup>
            <QuickTooltip
              asChild
              content="Auto-fill based on your organization's website"
            >
              <Button
                variant="secondary"
                onClick={() => handleFetchBrandInfo()}
                disabled={!canFetchBrandInfo}
              >
                {isFetchingBrandInfo ? (
                  <Loader2Icon className="animate-spin" />
                ) : (
                  <SparklesIcon className="fill-current" />
                )}{" "}
                Generate
              </Button>
            </QuickTooltip>
          </div>
          {websiteError && (
            <p className="text-xs text-destructive">{websiteError}</p>
          )}
        </div>

        {/* Form fields */}
        <div className="w-full relative mt-4">
          {/* BrandFetch loading overlay */}
          {isFetchingBrandInfo && (
            <motion.div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10"
              animate={{ rotate: [0, 360] }}
              transition={{
                rotate: { duration: 2, ease: "easeInOut", repeat: Infinity },
              }}
            >
              <SparkleIcon className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-16 text-primary animate-pulse fill-current" />
            </motion.div>
          )}

          <div
            className={cn(
              "flex flex-col gap-3 w-full",
              isFetchingBrandInfo &&
                "animate-pulse blur-xs pointer-events-none",
            )}
          >
            {/* Logo + org name row */}
            <div className="flex gap-3 items-stretch">
              {/* Logo upload */}
              <div className="space-y-1.5">
                <div className="flex flex-col items-center gap-2">
                  {logoPreviewUrl ? (
                    <div className="w-16 h-16 rounded-full overflow-hidden border bg-muted">
                      <Image
                        src={logoPreviewUrl}
                        alt="Logo preview"
                        width={64}
                        height={64}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div
                      className="w-16 h-16 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={handleOpenLogoEditor}
                    >
                      <ImageIcon className="w-6 h-6 text-muted-foreground/50" />
                    </div>
                  )}
                  <div className="flex items-center border border-border rounded-full overflow-hidden">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleOpenLogoEditor}
                      className="px-2!"
                    >
                      <UploadIcon />
                    </Button>
                    {logoPreviewUrl && (
                      <>
                        <div className="h-4 w-px bg-border" />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => updateForm({ logo: undefined })}
                          className="px-2!"
                        >
                          <Trash2Icon className="text-destructive" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Org name + country + date */}
              <div className="flex flex-col gap-2 w-full">
                <InputGroup>
                  <InputGroupAddon>
                    <BuildingIcon />
                  </InputGroupAddon>
                  <InputGroupInput
                    id="org-name"
                    type="text"
                    placeholder="e.g., Green Forest Initiative"
                    value={form.organizationName}
                    onChange={(e) =>
                      updateForm({ organizationName: e.target.value })
                    }
                    className="h-9 text-sm"
                  />
                </InputGroup>

                <div className="flex-1 grid grid-cols-2 gap-2 w-full">
                  <button
                    className="relative h-full bg-background hover:bg-muted border-2 border-dashed rounded-lg px-2 py-1"
                    onClick={handleOpenCountrySelector}
                  >
                    {selectedCountry ? (
                      <div className="h-full flex flex-col justify-between items-start">
                        <span className="flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPinHouseIcon className="size-3" />
                          <span>
                            Based in<span className="text-destructive">*</span>
                          </span>
                        </span>
                        <span className="absolute top-0 right-2 text-2xl">
                          {selectedCountry.emoji}
                        </span>
                        <span className="text-sm font-medium">
                          {selectedCountry.name.length > 22
                            ? `${selectedCountry.name.slice(0, 20)}...`
                            : selectedCountry.name}
                        </span>
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <MapPinPlusIcon className="size-3.5" />
                        <span className="text-sm">
                          Country
                          <span className="text-destructive">*</span>
                        </span>
                      </span>
                    )}
                  </button>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="relative h-full bg-background hover:bg-muted border-2 border-dashed rounded-lg px-2 py-1">
                        {selectedDate ? (
                          <div className="h-full flex flex-col justify-between items-start">
                            <span className="flex items-center gap-1 text-sm text-muted-foreground">
                              <CalendarIcon className="size-3" />
                              <span>Founded</span>
                            </span>
                            <span className="self-end text-sm font-medium">
                              {format(selectedDate, "d MMMM,")}
                              <span className="text-lg md:text-2xl ml-1 font-bold opacity-40">
                                {format(selectedDate, "yyyy")}
                              </span>
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-muted-foreground">
                            <CalendarPlusIcon className="size-3.5" />
                            <span className="text-sm">Founding Date</span>
                          </span>
                        )}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) =>
                          updateForm({
                            startDate: date ? format(date, "yyyy-MM-dd") : null,
                          })
                        }
                        disabled={(date) => date > new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>

            {/* Long description */}
            <div className="w-full mt-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground font-medium">
                  About your organization
                </span>
                <span
                  className={cn(
                    "text-xs",
                    longDescriptionText.trim().length < 50
                      ? "text-destructive"
                      : "text-muted-foreground",
                  )}
                >
                  {longDescriptionText.length}/50+ chars
                </span>
              </div>
              {/*<div className="rounded-xl border border-border overflow-hidden">*/}
              <LeafletEditor
                content={form.longDescription}
                onChange={(doc) => updateForm({ longDescription: doc })}
                ownerDid={did}
                placeholder="Describe your organization's mission and impact..."
                className="h-80 resize-y"
              />
              {/*</div>*/}
              {brandInfoFetched && (
                <p className="text-xs text-muted-foreground mt-1.5">
                  Review and edit this AI-generated description to accurately
                  represent your organisation before continuing.
                </p>
              )}
            </div>

            {/* Error */}
            {submitError && (
              <div
                className="p-2 bg-destructive/10 border border-destructive/20 rounded-lg"
                role="alert"
              >
                <p className="text-xs text-destructive">{submitError}</p>
              </div>
            )}
          </div>
        </div>

        {/* Gradient separator */}
        <div className="w-full h-px bg-gradient-to-r from-transparent via-border to-transparent" />

        {/* Submit / Success */}
        <div className="w-full flex justify-center">
          {saveSuccess ? (
            <div className="flex items-center gap-2 text-sm text-primary">
              <CheckCircle2Icon className="size-4" />
              <Loader2Icon className="size-4 animate-spin" />
              <span>{statusMessage}</span>
            </div>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2Icon className="mr-2 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  Save &amp; Continue
                  <ArrowRightIcon className="ml-2" />
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
