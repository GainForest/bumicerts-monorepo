"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { format, parseISO } from "date-fns";
import { motion } from "framer-motion";
import {
  ArrowRightIcon,
  Building2Icon,
  CalendarIcon,
  GlobeIcon,
  ImageIcon,
  Loader2Icon,
  SparklesIcon,
  UploadIcon,
  UserIcon,
} from "lucide-react";
import type { LeafletLinearDocument } from "@gainforest/leaflet-react";
import { $parse as parseLinearDocument } from "@gainforest/generated/pub/leaflet/pages/linearDocument.defs";
import type { AuthenticatedAccountState } from "@/lib/account";
import type { OrganizationData } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useModal } from "@/components/ui/modal/context";
import { CountrySelectorModalId } from "@/components/modals/country-selector";
import { ImageEditorModalId } from "@/components/modals/image-editor";
import { LeafletEditor } from "@/components/ui/leaflet-editor";
import { countries } from "@/lib/countries";
import { links } from "@/lib/links";
import { cn } from "@/lib/utils";
import { textToLinearDocument } from "@/lib/utils/linearDocument";
import { trpc } from "@/lib/trpc/client";
import { formatError } from "@/lib/utils/trpc-errors";
import { toSerializableFile } from "@gainforest/atproto-mutations-next";
import { hasMeaningfulOrganizationLongDescription } from "./organizationLongDescription";

const CountrySelectorModal = dynamic(
  () => import("@/components/modals/country-selector"),
  { ssr: false },
);

const ImageEditorModal = dynamic(
  () =>
    import("@/components/modals/image-editor").then((module) => ({
      default: module.ImageEditorModal,
    })),
  { ssr: false },
);

type OnboardingKind = "user" | "organization";

type BrandInfo = {
  found: boolean;
  name?: string;
  description?: string;
  logoUrl?: string;
  domain?: string;
  countryCode?: string;
  foundedYear?: number;
};

type FormState = {
  displayName: string;
  shortDescription: string;
  website: string;
  country: string;
  startDate: string | null;
  longDescription: LeafletLinearDocument;
  logo: File | undefined;
};

type AccountSetupPageProps = {
  did: string;
  onCompleted: (
    nextAccount: AuthenticatedAccountState,
    nextOrganization: OrganizationData,
  ) => void;
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
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    return parsed.hostname.includes(".");
  } catch {
    return false;
  }
}

function buildOrganizationPreviewData(options: {
  did: string;
  kind: OnboardingKind;
  form: FormState;
  logoPreviewUrl: string | null;
  profileCreatedAt: string;
  orgCreatedAt?: string;
}): OrganizationData {
  return {
    did: options.did,
    displayName: options.form.displayName,
    shortDescription: options.form.shortDescription,
    shortDescriptionFacets: [],
    longDescription:
      options.kind === "organization"
        ? options.form.longDescription
        : { blocks: [] },
    logoUrl: options.logoPreviewUrl,
    coverImageUrl: null,
    objectives: [],
    country: options.kind === "organization" ? options.form.country : "",
    website: options.form.website
      ? options.form.website.startsWith("http")
        ? options.form.website
        : `https://${options.form.website}`
      : null,
    startDate:
      options.kind === "organization" && options.form.startDate
        ? `${options.form.startDate}T00:00:00.000Z`
        : null,
    visibility: options.kind === "organization" ? "Public" : "Public",
    createdAt: options.orgCreatedAt ?? options.profileCreatedAt,
    bumicertCount: 0,
  };
}

export function AccountSetupPage({ did, onCompleted }: AccountSetupPageProps) {
  const { show, pushModal } = useModal();

  const [selectedKind, setSelectedKind] = useState<OnboardingKind | null>(null);
  const [form, setForm] = useState<FormState>({
    displayName: "",
    shortDescription: "",
    website: "",
    country: "",
    startDate: null,
    longDescription: { $type: "pub.leaflet.pages.linearDocument", blocks: [] },
    logo: undefined,
  });
  const [websiteError, setWebsiteError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isFetchingBrandInfo, setIsFetchingBrandInfo] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const logoObjectUrlRef = useRef<string | null>(null);

  const upsertProfile = trpc.certified.actor.profile.upsert.useMutation();
  const upsertOrganization =
    trpc.certified.actor.organization.upsert.useMutation();

  const updateForm = (patch: Partial<FormState>) => {
    setForm((previous) => ({ ...previous, ...patch }));
  };

  const logoPreviewUrl = useMemo(() => {
    if (!form.logo) return null;
    return URL.createObjectURL(form.logo);
  }, [form.logo]);

  useEffect(() => {
    if (logoObjectUrlRef.current && logoObjectUrlRef.current !== logoPreviewUrl) {
      URL.revokeObjectURL(logoObjectUrlRef.current);
    }
    logoObjectUrlRef.current = logoPreviewUrl;

    return () => {
      if (logoObjectUrlRef.current) {
        URL.revokeObjectURL(logoObjectUrlRef.current);
        logoObjectUrlRef.current = null;
      }
    };
  }, [logoPreviewUrl]);

  const selectedCountry = form.country ? countries[form.country] : null;
  const domain = useMemo(() => extractDomain(form.website), [form.website]);
  const isWebsiteValid = validateUrl(form.website);
  const canFetchBrandInfo = isWebsiteValid && Boolean(domain) && !isFetchingBrandInfo;
  const organizationFieldsRequired = selectedKind === "organization";
  const canSubmit =
    selectedKind !== null &&
    form.displayName.trim().length > 0 &&
    form.shortDescription.trim().length > 0 &&
    isWebsiteValid &&
    (!organizationFieldsRequired ||
      (form.country.length === 2 &&
        form.country in countries &&
        hasMeaningfulOrganizationLongDescription(form.longDescription))) &&
    !isSubmitting;

  const handleWebsiteChange = (value: string) => {
    updateForm({ website: value });
    if (value && !validateUrl(value)) {
      setWebsiteError("Please enter a valid URL");
      return;
    }
    setWebsiteError(null);
  };

  const fetchLogoAsFile = useCallback(async (logoUrl: string): Promise<File | null> => {
    try {
      const response = await fetch(logoUrl);
      if (!response.ok) return null;
      const blob = await response.blob();
      const extension = logoUrl.split(".").pop()?.split("?")[0] ?? "png";
      return new File([blob], `logo.${extension}`, {
        type: blob.type || `image/${extension}`,
      });
    } catch {
      return null;
    }
  }, []);

  const handleFetchBrandInfo = useCallback(async () => {
    if (!isWebsiteValid) {
      setWebsiteError("Please enter a valid URL");
      return;
    }

    if (!domain) return;

    setWebsiteError(null);
    setIsFetchingBrandInfo(true);
    setSubmitError(null);

    try {
      const response = await fetch(links.api.brand.fetchInfo, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain }),
      });

      const brandInfo = (await response.json()) as BrandInfo;

      if (!brandInfo.found) {
        setSubmitError("Could not find information for this website.");
        return;
      }

      const updates: Partial<FormState> = {};
      if (brandInfo.name) updates.displayName = brandInfo.name;
      if (brandInfo.description) {
        updates.shortDescription = brandInfo.description.slice(0, 160);
        if (selectedKind === "organization") {
          updates.longDescription = textToLinearDocument(brandInfo.description);
        }
      }
      if (
        selectedKind === "organization" &&
        brandInfo.countryCode &&
        brandInfo.countryCode in countries
      ) {
        updates.country = brandInfo.countryCode;
      }
      if (selectedKind === "organization" && brandInfo.foundedYear) {
        updates.startDate = `${brandInfo.foundedYear}-01-01`;
      }
      if (brandInfo.logoUrl) {
        const logoFile = await fetchLogoAsFile(brandInfo.logoUrl);
        if (logoFile) updates.logo = logoFile;
      }
      updateForm(updates);
    } catch {
      setSubmitError("Failed to fetch website information.");
    } finally {
      setIsFetchingBrandInfo(false);
    }
  }, [domain, fetchLogoAsFile, isWebsiteValid, selectedKind]);

  const openCountrySelector = () => {
    pushModal(
      {
        id: CountrySelectorModalId,
        content: (
          <CountrySelectorModal
            initialCountryCode={form.country}
            onCountryChange={(countryCode) => updateForm({ country: countryCode })}
          />
        ),
      },
      true,
    );
    show();
  };

  const openLogoEditor = () => {
    pushModal(
      {
        id: ImageEditorModalId,
        content: (
          <ImageEditorModal
            title="Upload logo"
            description="Upload a logo for your account"
            initialImage={form.logo}
            onImageChange={(image) => updateForm({ logo: image })}
          />
        ),
      },
      true,
    );
    show();
  };

  const selectedDate = form.startDate ? parseISO(form.startDate) : undefined;

  const handleSubmit = async () => {
    if (!isWebsiteValid) {
      setWebsiteError("Please enter a valid URL");
      return;
    }

    if (!canSubmit || !selectedKind) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const websiteUri = form.website
        ? (form.website.startsWith("http")
            ? form.website
            : `https://${form.website}`) as `${string}:${string}`
        : undefined;

      const avatar = form.logo
        ? { image: await toSerializableFile(form.logo) }
        : undefined;

      const profileResult = await upsertProfile.mutateAsync({
        displayName: form.displayName,
        description: form.shortDescription,
        website: websiteUri,
        avatar,
      });

      if (selectedKind === "user") {
        const nextAccount: AuthenticatedAccountState = {
          kind: "user",
          did,
          profile: profileResult.record,
          organization: null,
        };

        onCompleted(
          nextAccount,
          buildOrganizationPreviewData({
            did,
            kind: "user",
            form,
            logoPreviewUrl,
            profileCreatedAt: profileResult.record.createdAt,
          }),
        );
        return;
      }

      const country = countries[form.country];
      if (!country) {
        throw new Error("Country is required for organization onboarding.");
      }

      const organizationResult = await upsertOrganization.mutateAsync({
        location: {
          uri: country.uri,
          cid: country.cid,
        },
        foundedDate: form.startDate
          ? (`${form.startDate}T00:00:00.000Z` as `${string}-${string}-${string}T${string}:${string}:${string}.${string}Z`)
          : undefined,
        longDescription: parseLinearDocument(form.longDescription),
        visibility: "public",
      });

      const nextAccount: AuthenticatedAccountState = {
        kind: "organization",
        did,
        profile: profileResult.record,
        organization: organizationResult.record,
      };

      onCompleted(
        nextAccount,
        buildOrganizationPreviewData({
          did,
          kind: "organization",
          form,
          logoPreviewUrl,
          profileCreatedAt: profileResult.record.createdAt,
          orgCreatedAt: organizationResult.record.createdAt,
        }),
      );
    } catch (error) {
      setSubmitError(formatError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      className="w-full max-w-md mx-auto py-10"
      initial={{ opacity: 0, filter: "blur(10px)", scale: 0.97 }}
      animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
      transition={{ duration: 0.35 }}
    >
      <div className="flex flex-col items-center gap-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center rounded-full bg-primary/10 p-3 mb-1">
            {selectedKind === "user" ? (
              <UserIcon className="size-6 text-primary" />
            ) : (
              <Building2Icon className="size-6 text-primary" />
            )}
          </div>
          <h1 className="font-serif text-4xl font-light tracking-[-0.02em]">
            Set up your account
          </h1>
          <p className="text-sm text-muted-foreground">
            Choose how you want to use Bumicerts, then complete the setup.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 w-full">
          <Button
            type="button"
            variant={selectedKind === "user" ? "default" : "outline"}
            className="h-auto py-4"
            onClick={() => setSelectedKind("user")}
          >
            <span className="flex flex-col items-center gap-1">
              <UserIcon />
              User
            </span>
          </Button>
          <Button
            type="button"
            variant={selectedKind === "organization" ? "default" : "outline"}
            className="h-auto py-4"
            onClick={() => setSelectedKind("organization")}
          >
            <span className="flex flex-col items-center gap-1">
              <Building2Icon />
              Organization
            </span>
          </Button>
        </div>

        <div className="w-full h-px bg-gradient-to-r from-transparent via-border to-transparent" />

        <div className="flex flex-col gap-1.5 w-full">
          <div className="flex items-center gap-2">
            <InputGroup>
              <InputGroupAddon>
                <GlobeIcon />
              </InputGroupAddon>
              <InputGroupInput
                id="website"
                type="url"
                placeholder={
                  selectedKind === "organization"
                    ? "Your organization's website"
                    : "Your website"
                }
                value={form.website}
                onChange={(event) => handleWebsiteChange(event.target.value)}
                className={cn(
                  "h-9 text-sm",
                  websiteError &&
                    "border-destructive focus-visible:ring-destructive/50",
                )}
              />
            </InputGroup>
            <Button
              type="button"
              variant="secondary"
              onClick={() => void handleFetchBrandInfo()}
              disabled={!canFetchBrandInfo}
            >
              {isFetchingBrandInfo ? (
                <Loader2Icon className="animate-spin" />
              ) : (
                <SparklesIcon className="fill-current" />
              )}
              Generate
            </Button>
          </div>
          {websiteError && (
            <p className="text-xs text-destructive">{websiteError}</p>
          )}
        </div>

        <div className="w-full flex flex-col gap-3 mt-2">
          <div className="flex gap-3 items-start">
            <div className="space-y-1.5">
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
                  onClick={openLogoEditor}
                >
                  <ImageIcon className="w-6 h-6 text-muted-foreground/50" />
                </div>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={openLogoEditor}
              >
                <UploadIcon />
                Logo
              </Button>
            </div>

            <div className="flex-1 flex flex-col gap-3">
              <InputGroup>
                <InputGroupAddon>
                  {selectedKind === "organization" ? <Building2Icon /> : <UserIcon />}
                </InputGroupAddon>
                <InputGroupInput
                  value={form.displayName}
                  onChange={(event) =>
                    updateForm({ displayName: event.target.value })
                  }
                  placeholder={
                    selectedKind === "organization"
                      ? "Organization name"
                      : "Display name"
                  }
                />
              </InputGroup>

              <textarea
                value={form.shortDescription}
                onChange={(event) =>
                  updateForm({ shortDescription: event.target.value })
                }
                placeholder="Short description"
                className="min-h-24 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          {selectedKind === "organization" && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="justify-start"
                  onClick={openCountrySelector}
                >
                  <span>{selectedCountry?.emoji ?? "🌍"}</span>
                  {selectedCountry?.name ?? "Select country"}
                </Button>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="outline" className="justify-start">
                      <CalendarIcon />
                      {form.startDate
                        ? format(parseISO(form.startDate), "MMM d, yyyy")
                        : "Select founded date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => {
                        updateForm({
                          startDate: date ? format(date, "yyyy-MM-dd") : null,
                        });
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="rounded-xl border border-border overflow-hidden">
                <LeafletEditor
                  content={form.longDescription}
                  onChange={(document) => updateForm({ longDescription: document })}
                  ownerDid={did}
                  placeholder="Tell the world about your organization — its mission, history, and the work you do…"
                />
              </div>
            </>
          )}
        </div>

        {submitError && (
          <p className="w-full text-sm text-destructive text-center">
            {submitError}
          </p>
        )}

        <Button
          className="w-full"
          disabled={!canSubmit}
          onClick={() => void handleSubmit()}
        >
          {isSubmitting ? (
            <Loader2Icon className="animate-spin" />
          ) : (
            <ArrowRightIcon />
          )}
          {selectedKind === "organization"
            ? "Create organization account"
            : "Create account"}
        </Button>
      </div>
    </motion.div>
  );
}
