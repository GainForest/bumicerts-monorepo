"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useOnboardingStore, generateHandle, type Objective } from "../store";
import {
  ArrowRightIcon,
  ArrowLeftIcon,
  CalendarIcon,
  GlobeIcon,
  Loader2Icon,
  ImageIcon,
  SparkleIcon,
  SparklesIcon,
  Trash2Icon,
  UploadIcon,
  BuildingIcon,
  MapPinHouseIcon,
  MapPinPlusIcon,
  CalendarPlusIcon,
} from "lucide-react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { countries } from "@/lib/countries";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useModal } from "@/components/ui/modal/context";
import { CountrySelectorModalId } from "@/components/modals/country-selector";
import { ImageEditorModalId } from "@/components/modals/image-editor";
import dynamic from "next/dynamic";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const CountrySelectorModal = dynamic(
  () => import("@/components/modals/country-selector"),
  { ssr: false }
);
const ImageEditorModal = dynamic(
  () =>
    import("@/components/modals/image-editor").then((m) => ({
      default: m.ImageEditorModal,
    })),
  { ssr: false }
);
import { format, parseISO } from "date-fns";
import { links } from "@/lib/links";
import Image from "next/image";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import QuickTooltip from "@/components/ui/quick-tooltip";

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

export function StepOrgDetails() {
  const { data, updateData, nextStep, prevStep, setError, error } =
    useOnboardingStore();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isFetchingBrandInfo, setIsFetchingBrandInfo] = useState(false);
  const [brandInfoFetched, setBrandInfoFetched] = useState(false);
  const [websiteError, setWebsiteError] = useState<string | null>(null);
  const { show, pushModal } = useModal();

  const selectedCountry = data.country ? countries[data.country] : null;

  // Check if we have a valid domain to fetch
  const domain = useMemo(() => extractDomain(data.website), [data.website]);
  const canFetchBrandInfo = !!domain && !isFetchingBrandInfo;

  const validateUrl = (url: string): boolean => {
    if (!url) return true; // Empty is valid (optional field)
    try {
      const urlToTest = url.startsWith("http") ? url : `https://${url}`;
      const parsed = new URL(urlToTest);
      // Must have a valid hostname with at least one dot (e.g., example.com)
      return parsed.hostname.includes(".");
    } catch {
      return false;
    }
  };

  // Validate website on mount if it's already set
  useEffect(() => {
    if (data.website && !validateUrl(data.website)) {
      setWebsiteError("Please enter a valid URL (e.g., https://example.com)");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // UI validation - doesn't require shortDescription (it's generated on Continue)
  const canContinue = useMemo(() => {
    return (
      data.organizationName.trim().length > 0 &&
      data.longDescription.trim().length >= 50 &&
      data.country.length === 2 &&
      data.country in countries &&
      !isGenerating
    );
  }, [data.organizationName, data.longDescription, data.country, isGenerating]);

  // Fetch logo from URL and convert to File
  const fetchLogoAsFile = async (logoUrl: string): Promise<File | null> => {
    try {
      const response = await fetch(logoUrl);
      if (!response.ok) return null;

      const blob = await response.blob();
      const extension = logoUrl.split('.').pop()?.split('?')[0] || 'png';
      const mimeType = blob.type || `image/${extension}`;
      return new File([blob], `logo.${extension}`, { type: mimeType });
    } catch {
      console.warn("Failed to fetch logo from URL:", logoUrl);
      return null;
    }
  };

  // Manual BrandFetch trigger
  const handleFetchBrandInfo = useCallback(async (isAutoFetch = false) => {
    const currentDomain = extractDomain(data.website);
    if (!currentDomain) {
      if (!isAutoFetch) {
        setError("Please enter a valid website URL first");
      }
      return;
    }

    setIsFetchingBrandInfo(true);
    setError(null);

    try {
      const response = await fetch(links.api.onboarding.fetchBrandInfo, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: currentDomain }),
      });

      const brandInfo: BrandInfo = await response.json();

      if (brandInfo.found) {
        const updates: Partial<typeof data> = {};

        // Always update fields with BrandFetch data (overwrite existing values)
        if (brandInfo.name) {
          updates.organizationName = brandInfo.name;
        }

        if (brandInfo.description) {
          updates.longDescription = brandInfo.description;
        }

        // Fill country if countryCode is valid
        if (brandInfo.countryCode && brandInfo.countryCode in countries) {
          updates.country = brandInfo.countryCode;
        }

        // Fill start date from foundedYear
        if (brandInfo.foundedYear) {
          updates.startDate = `${brandInfo.foundedYear}-01-01`;
        }

        // Fetch and set logo if logoUrl is available
        if (brandInfo.logoUrl) {
          const logoFile = await fetchLogoAsFile(brandInfo.logoUrl);
          if (logoFile) {
            updates.logo = logoFile;
          }
        }

        // Always record the fetched website, even if no fields were updated,
        // so re-mounting doesn't trigger another fetch for the same domain.
        updateData({ ...updates, lastBrandfetchedWebsite: data.website });

        setBrandInfoFetched(true);
      } else if (!isAutoFetch) {
        setError("Could not find information for this website");
      }
    } catch {
      if (!isAutoFetch) {
        setError("Failed to fetch website information");
      }
    } finally {
      setIsFetchingBrandInfo(false);
    }
  }, [data.website, setError, updateData]);

  // On mount only: auto-fetch brand info if the current website differs from
  // the last website we successfully brandfetched. This prevents re-fetching
  // (and overwriting user edits) when the user navigates away and comes back.
  useEffect(() => {
    const currentDomain = extractDomain(data.website);
    const lastDomain = extractDomain(data.lastBrandfetchedWebsite ?? "");
    if (currentDomain && currentDomain !== lastDomain) {
      handleFetchBrandInfo(true);
    }
    // Intentionally empty deps — this must only run on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Generate short description and objectives, then proceed to next step
  const handleContinue = async () => {
    if (!canContinue) return;

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch(
        links.api.onboarding.generateShortDescription,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            longDescription: data.longDescription,
            organizationName: data.organizationName,
            country: data.country,
          }),
        }
      );

      const result = await response.json();

      // Update store with generated data (ensure objectives is never empty)
      const objectives: Objective[] = (result.objectives && result.objectives.length > 0)
        ? result.objectives
        : ["Other"];

      const updates: { shortDescription: string; objectives: Objective[]; handle: string } = {
        shortDescription: result.shortDescription || `${data.organizationName} is an environmental organization working towards sustainability.`,
        objectives,
        handle: generateHandle(data.organizationName, data.country),
      };

      updateData(updates);
      nextStep();
    } catch (err) {
      // Even on error, provide fallback values and proceed
      console.error("Error generating description:", err);
      const countryName = countries[data.country]?.name;
      updateData({
        shortDescription: `${data.organizationName} is an environmental organization${countryName ? ` based in ${countryName}` : ""} working towards sustainability.`,
        objectives: ["Other"],
        handle: generateHandle(data.organizationName, data.country),
      });
      nextStep();
    } finally {
      setIsGenerating(false);
    }
  };

  const handleOpenCountrySelector = () => {
    pushModal(
      {
        id: CountrySelectorModalId,
        content: (
          <CountrySelectorModal
            initialCountryCode={data.country}
            onCountryChange={(country) => updateData({ country })}
          />
        ),
      },
      true
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
            initialImage={data.logo}
            onImageChange={(image) => {
              updateData({ logo: image });
            }}
          />
        ),
      },
      true
    );
    show();
  };

  const handleWebsiteChange = (value: string) => {
    updateData({ website: value });
    setBrandInfoFetched(false); // Reset when website changes
    if (value && !validateUrl(value)) {
      setWebsiteError("Please enter a valid URL");
    } else {
      setWebsiteError(null);
    }
  };

  const handleRemoveLogo = () => {
    updateData({ logo: undefined });
  };

  const selectedDate = data.startDate ? parseISO(data.startDate) : undefined;

  // Create object URL for logo preview
  const logoPreviewUrl = useMemo(() => {
    if (data.logo instanceof File) {
      return URL.createObjectURL(data.logo);
    }
    return null;
  }, [data.logo]);

  // Cleanup object URL on unmount
  useEffect(() => {
    return () => {
      if (logoPreviewUrl) {
        URL.revokeObjectURL(logoPreviewUrl);
      }
    };
  }, [logoPreviewUrl]);

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
          <h1 className="text-2xl font-serif font-bold">Organization Details</h1>
          <p className="text-sm text-muted-foreground">
            Tell us more about your organization.
          </p>
        </div>

        {/* Spacer */}
        <div className="w-full h-2"></div>

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
                value={data.website}
                onChange={(e) => handleWebsiteChange(e.target.value)}
                className={cn(
                  "h-9 text-sm",
                  websiteError &&
                  "border-destructive focus-visible:ring-destructive/50"
                )}
              />
            </InputGroup>
            <QuickTooltip asChild content={"Auto-fill based on your organization's website"}>
              <Button
                variant="secondary"
                onClick={() => handleFetchBrandInfo(false)}
                disabled={!canFetchBrandInfo}
              >
                {isFetchingBrandInfo ? (
                  <Loader2Icon className="animate-spin" />
                ) : (
                  <SparklesIcon className="fill-current" />
                )} Generate
              </Button>
            </QuickTooltip>
          </div>
          {websiteError && (
            <p className="text-xs text-destructive">{websiteError}</p>
          )}
        </div>

        {/* Form */}
        <div
          className={cn("w-full relative")}
        >
          {
            isFetchingBrandInfo && (
              <motion.div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                animate={{
                  rotate: isFetchingBrandInfo ? [0, 360] : 0,
                }}
                transition={{
                  rotate: {
                    duration: 2,
                    ease: "easeInOut",
                    repeat: isFetchingBrandInfo ? Infinity : 0,
                  },
                }}
              >
                <SparkleIcon
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-16 text-primary animate-pulse fill-current" />
              </motion.div>
            )}

          {/* Content */}
          <div className={cn("flex flex-col gap-3 w-full mt-2", isFetchingBrandInfo && "animate-pulse blur-xs pointer-events-none")}>
            {/* Logo and Organization Name row */}
            <div className="flex gap-3 items-stretch">
              {/* Logo upload - left side */}
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
                          onClick={handleRemoveLogo}
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
                    value={data.organizationName}
                    onChange={(e) => updateData({ organizationName: e.target.value })}
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
                          updateData({
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
            <div className="w-full relative mt-2">
              <Textarea
                id="long-description"
                placeholder="Describe your organization's mission and impact..."
                value={data.longDescription}
                onChange={(e) => updateData({ longDescription: e.target.value })}
                rows={2}
                className="resize-y text-sm"
              />
              <span
                className={cn(
                  "absolute right-0 -top-5 text-xs",
                  data.longDescription.length < 50
                    ? "text-destructive"
                    : "text-muted-foreground"
                )}
              >
                {data.longDescription.length}/50+
              </span>
            </div>
            {brandInfoFetched && (
              <p className="text-xs text-muted-foreground">
                Review and edit this AI-generated description to accurately represent your organisation before continuing.
              </p>
            )}

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
        </div>

        {/* Navigation */}
        <div className="w-full flex justify-between mt-1">
          <Button onClick={prevStep} variant="ghost" disabled={isGenerating}>
            <ArrowLeftIcon className="mr-2" />
            Back
          </Button>
          <Button onClick={handleContinue} disabled={!canContinue || isGenerating}>
            {isGenerating ? (
              <>
                <Loader2Icon className="mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                Continue
                <ArrowRightIcon className="ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
