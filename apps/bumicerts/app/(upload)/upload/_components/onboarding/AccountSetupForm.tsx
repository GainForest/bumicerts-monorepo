"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import { toSerializableFile } from "@gainforest/atproto-mutations-next";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  GlobeIcon,
  Loader2Icon,
  SparklesIcon,
} from "lucide-react";
import { z } from "zod";
import type { AuthenticatedAccountState } from "@/lib/account";
import { HeaderContent } from "@/app/(marketplace)/_components/Header/HeaderContent";
import { useAtprotoStore } from "@/components/stores/atproto";
import { countries } from "@/lib/countries";
import { links } from "@/lib/links";
import type { OrganizationData } from "@/lib/types";
import { resolveAccountMediaUrl } from "@/lib/account/media";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  normalizeLinearDocumentForRecord,
  textToLinearDocument,
} from "@/lib/utils/linearDocument";
import { indexerTrpc } from "@/lib/trpc/indexer/client";
import { trpc } from "@/lib/trpc/client";
import { formatError } from "@/lib/utils/trpc-errors";
import { cn } from "@/lib/utils";
import {
  hasAnyOrganizationLongDescriptionContent,
  hasMeaningfulOrganizationLongDescription,
} from "../organizationLongDescription";
import { useAccountSetupStep } from "../../_hooks/useAccountSetupStep";
import { OnboardingMediaField } from "./OnboardingMediaField";
import { OrganizationSetupDetailsPanel } from "./OrganizationSetupDetailsPanel";
import {
  EMPTY_ACCOUNT_SETUP_FORM,
  type AccountSetupFieldErrors,
  type AccountSetupFieldName,
  type AccountSetupFormState,
  type BrandInfo,
  type OnboardingKind,
} from "./types";
import { useObjectUrl } from "./useObjectUrl";

const displayNameSchema = z
  .string()
  .trim()
  .min(1, "Name is required.")
  .max(64, "Name must be 64 characters or fewer.");

const shortDescriptionSchema = z
  .string()
  .trim()
  .min(1, "Bio is required.")
  .max(2560, "Bio is too long.");

const websiteSchema = z
  .string()
  .trim()
  .refine(
    (value) => value.length === 0 || validateUrl(value),
    "Enter a valid website URL.",
  );

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

function isCountryCode(value: string): value is keyof typeof countries {
  return value in countries;
}

function normalizeWebsiteUri(url: string): `${string}:${string}` | undefined {
  if (!url.trim()) return undefined;
  return (
    url.startsWith("http") ? url : `https://${url}`
  ) as `${string}:${string}`;
}

function formatStartDate(
  date: string,
): `${string}-${string}-${string}T${string}:${string}:${string}.${string}Z` {
  return `${date}T00:00:00.000Z` as `${string}-${string}-${string}T${string}:${string}:${string}.${string}Z`;
}

function isUriString(value: string): value is `${string}:${string}` {
  return value.includes(":");
}

function toOptimisticMediaUri(url: string | null) {
  if (!url || !isUriString(url)) return undefined;

  return {
    $type: "org.hypercerts.defs#uri" as const,
    uri: url,
  };
}

const organizationStepVariants = {
  enter: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? 24 : -24,
  }),
  center: {
    opacity: 1,
    x: 0,
  },
  exit: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? -24 : 24,
  }),
} satisfies Variants;

function buildFieldErrors(
  kind: OnboardingKind,
  form: AccountSetupFormState,
): AccountSetupFieldErrors {
  const errors: AccountSetupFieldErrors = {};

  const displayNameResult = displayNameSchema.safeParse(form.displayName);
  if (!displayNameResult.success) {
    errors.displayName = displayNameResult.error.issues[0]?.message;
  }

  const shortDescriptionResult = shortDescriptionSchema.safeParse(
    form.shortDescription,
  );
  if (!shortDescriptionResult.success) {
    errors.shortDescription = shortDescriptionResult.error.issues[0]?.message;
  }

  if (kind === "organization") {
    const websiteResult = websiteSchema.safeParse(form.website);
    if (!websiteResult.success) {
      errors.website = websiteResult.error.issues[0]?.message;
    }
  }

  return errors;
}

function buildOrganizationPreviewData(options: {
  did: string;
  kind: OnboardingKind;
  form: AccountSetupFormState;
  primaryPreviewUrl: string | null;
  bannerPreviewUrl: string | null;
  profileCreatedAt: string;
  orgCreatedAt?: string;
}): OrganizationData {
  return {
    did: options.did,
    displayName: options.form.displayName.trim(),
    shortDescription: options.form.shortDescription.trim(),
    shortDescriptionFacets: [],
    longDescription:
      options.kind === "organization" &&
      hasMeaningfulOrganizationLongDescription(options.form.longDescription)
        ? options.form.longDescription
        : { blocks: [] },
    logoUrl: options.primaryPreviewUrl,
    coverImageUrl: options.bannerPreviewUrl,
    objectives: [],
    country:
      options.kind === "organization" && isCountryCode(options.form.country)
        ? options.form.country
        : "",
    website:
      options.kind === "organization"
        ? (normalizeWebsiteUri(options.form.website) ?? null)
        : null,
    startDate:
      options.kind === "organization" && options.form.startDate
        ? formatStartDate(options.form.startDate)
        : null,
    visibility: "Public",
    createdAt: options.orgCreatedAt ?? options.profileCreatedAt,
    bumicertCount: 0,
  };
}

function FieldError({ error }: { error?: string }) {
  if (!error) return null;

  return <p className="text-xs text-destructive">{error}</p>;
}

export function AccountSetupForm({
  did,
  kind,
  onBack,
  onCompleted,
}: {
  did: string;
  kind: OnboardingKind;
  onBack: () => void;
  onCompleted: (
    nextAccount: AuthenticatedAccountState,
    nextOrganization: OrganizationData,
  ) => void;
}) {
  const [form, setForm] = useState(EMPTY_ACCOUNT_SETUP_FORM);
  const [touchedFields, setTouchedFields] = useState<
    Partial<Record<AccountSetupFieldName, boolean>>
  >({});
  const [brandfetchFeedback, setBrandfetchFeedback] = useState<{
    tone: "neutral" | "success" | "destructive";
    message: string;
  } | null>(null);
  const [hasAcceptedCodeOfConduct, setHasAcceptedCodeOfConduct] =
    useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isFetchingBrandInfo, setIsFetchingBrandInfo] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [onboardingStep, setOnboardingStep] = useAccountSetupStep();
  const [stepDirection, setStepDirection] = useState<1 | -1>(1);
  const auth = useAtprotoStore((state) => state.auth);
  const setAuth = useAtprotoStore((state) => state.setAuth);
  const indexerUtils = indexerTrpc.useUtils();

  const upsertProfile = trpc.certified.actor.profile.upsert.useMutation();
  const upsertOrganization =
    trpc.certified.actor.organization.upsert.useMutation();

  const fieldErrors = useMemo(() => buildFieldErrors(kind, form), [kind, form]);
  const primaryPreviewUrl = useObjectUrl(form.primaryImage);
  const bannerPreviewUrl = useObjectUrl(form.bannerImage);
  const domain = useMemo(() => extractDomain(form.website), [form.website]);

  const canFetchBrandInfo =
    kind === "organization" &&
    form.website.trim().length > 0 &&
    fieldErrors.website === undefined &&
    domain !== null &&
    !isFetchingBrandInfo;
  const canSubmit = Object.keys(fieldErrors).length === 0 && !isSubmitting;
  const isOrganizationFlow = kind === "organization";
  const isOrganizationDetailsStep =
    isOrganizationFlow && onboardingStep === 1;
  const hasSuccessfulPrefill = brandfetchFeedback?.tone === "success";
  const isOrganizationOptionalStepEmpty = useMemo(
    () =>
      form.country.trim().length === 0 &&
      form.startDate === null &&
      !hasAnyOrganizationLongDescriptionContent(form.longDescription),
    [form.country, form.longDescription, form.startDate],
  );

  const updateForm = useCallback(
    <K extends keyof AccountSetupFormState>(
      key: K,
      value: AccountSetupFormState[K],
    ) => {
      setForm((current) => ({ ...current, [key]: value }));

      if (
        key === "displayName" ||
        key === "shortDescription" ||
        key === "website"
      ) {
        setTouchedFields((current) => ({ ...current, [key]: true }));
      }

      if (key === "website") {
        setBrandfetchFeedback(null);
      }

      setSubmitError(null);
    },
    [],
  );

  const fetchLogoAsFile = useCallback(
    async (logoUrl: string): Promise<File | null> => {
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
    },
    [],
  );

  const handleFetchBrandInfo = useCallback(async () => {
    setTouchedFields((current) => ({ ...current, website: true }));
    setBrandfetchFeedback(null);
    setSubmitError(null);

    if (!canFetchBrandInfo || !domain) {
      return;
    }

    setIsFetchingBrandInfo(true);

    try {
      const response = await fetch(links.api.brand.fetchInfo, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain }),
      });

      if (!response.ok) {
        throw new Error("Unable to fetch website information right now.");
      }

      const brandInfo = (await response.json()) as BrandInfo;

      if (!brandInfo.found) {
        setBrandfetchFeedback({
          tone: "destructive",
          message: "No brand data found.",
        });
        return;
      }

      const nextForm: Partial<AccountSetupFormState> = {};

      if (brandInfo.name) {
        nextForm.displayName = brandInfo.name;
      }

      if (brandInfo.description) {
        nextForm.shortDescription = brandInfo.description.slice(0, 160);
        nextForm.longDescription = textToLinearDocument(brandInfo.description);
      }

      if (brandInfo.countryCode && isCountryCode(brandInfo.countryCode)) {
        nextForm.country = brandInfo.countryCode;
      }

      if (brandInfo.foundedYear) {
        nextForm.startDate = `${brandInfo.foundedYear}-01-01`;
      }

      if (brandInfo.logoUrl) {
        const logoFile = await fetchLogoAsFile(brandInfo.logoUrl);
        if (logoFile) {
          nextForm.primaryImage = logoFile;
        }
      }

      setForm((current) => ({ ...current, ...nextForm }));
      setTouchedFields((current) => ({
        ...current,
        displayName: true,
        shortDescription: true,
        website: true,
      }));
      setBrandfetchFeedback({
        tone: "success",
        message: "Prefilled what we found.",
      });
    } catch {
      setBrandfetchFeedback({
        tone: "destructive",
        message: "Couldn’t prefill right now.",
      });
    } finally {
      setIsFetchingBrandInfo(false);
    }
  }, [canFetchBrandInfo, domain, fetchLogoAsFile]);

  const handleSubmit = useCallback(async () => {
    setTouchedFields({
      displayName: true,
      shortDescription: true,
      ...(kind === "organization" ? { website: true } : {}),
    });

    if (Object.keys(fieldErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const trimmedDisplayName = form.displayName.trim();
      const trimmedShortDescription = form.shortDescription.trim();
      const websiteUri =
        kind === "organization" ? normalizeWebsiteUri(form.website) : undefined;
      const avatar = form.primaryImage
        ? {
            $type: "org.hypercerts.defs#smallImage" as const,
            image: await toSerializableFile(form.primaryImage),
          }
        : undefined;
      const banner = form.bannerImage
        ? {
            $type: "org.hypercerts.defs#largeImage" as const,
            image: await toSerializableFile(form.bannerImage),
          }
        : undefined;

      const profileResult = await upsertProfile.mutateAsync({
        displayName: trimmedDisplayName,
        description: trimmedShortDescription,
        ...(websiteUri ? { website: websiteUri } : {}),
        ...(avatar ? { avatar } : {}),
        ...(banner ? { banner } : {}),
      });
      const optimisticAvatar = toOptimisticMediaUri(primaryPreviewUrl);
      const optimisticBanner = toOptimisticMediaUri(bannerPreviewUrl);
      const nextProfileRecord = {
        ...profileResult.record,
        ...(optimisticAvatar ? { avatar: optimisticAvatar } : {}),
        ...(optimisticBanner ? { banner: optimisticBanner } : {}),
      };

      if (kind === "user") {
        const nextAccount: AuthenticatedAccountState = {
          kind: "user",
          did,
          profile: nextProfileRecord,
          organization: null,
        };

        await Promise.all([
          indexerUtils.account.current.cancel(),
          indexerUtils.account.byDid.cancel({ did }),
        ]);
        indexerUtils.account.current.setData(undefined, nextAccount);
        indexerUtils.account.byDid.setData({ did }, nextAccount);

        if (auth.status === "AUTHENTICATED") {
          setAuth({
            ...auth.user,
            displayName: nextProfileRecord.displayName ?? auth.user.displayName,
            avatar:
              primaryPreviewUrl ??
              resolveAccountMediaUrl(nextProfileRecord.avatar) ??
              auth.user.avatar,
          });
        }

        setOnboardingStep(0);
        onCompleted(
          nextAccount,
          buildOrganizationPreviewData({
            did,
            kind,
            form,
            primaryPreviewUrl,
            bannerPreviewUrl,
            profileCreatedAt: profileResult.record.createdAt,
          }),
        );
        return;
      }

      const locationRecord = isCountryCode(form.country)
        ? countries[form.country]
        : null;
      const shouldIncludeLongDescription =
        hasMeaningfulOrganizationLongDescription(form.longDescription);

      const organizationResult = await upsertOrganization.mutateAsync({
        ...(locationRecord
          ? {
              location: {
                uri: locationRecord.uri,
                cid: locationRecord.cid,
              },
            }
          : {}),
        ...(form.startDate
          ? { foundedDate: formatStartDate(form.startDate) }
          : {}),
        ...(shouldIncludeLongDescription
          ? {
              longDescription: normalizeLinearDocumentForRecord(
                form.longDescription,
              ),
            }
          : {}),
        visibility: "public",
      });

      const nextAccount: AuthenticatedAccountState = {
        kind: "organization",
        did,
        profile: nextProfileRecord,
        organization: organizationResult.record,
      };

      await Promise.all([
        indexerUtils.account.current.cancel(),
        indexerUtils.account.byDid.cancel({ did }),
      ]);
      indexerUtils.account.current.setData(undefined, nextAccount);
      indexerUtils.account.byDid.setData({ did }, nextAccount);

      if (auth.status === "AUTHENTICATED") {
        setAuth({
          ...auth.user,
          displayName: nextProfileRecord.displayName ?? auth.user.displayName,
          avatar:
            primaryPreviewUrl ??
            resolveAccountMediaUrl(nextProfileRecord.avatar) ??
            auth.user.avatar,
        });
      }

      setOnboardingStep(0);
      onCompleted(
        nextAccount,
        buildOrganizationPreviewData({
          did,
          kind,
          form,
          primaryPreviewUrl,
          bannerPreviewUrl,
          profileCreatedAt: profileResult.record.createdAt,
          orgCreatedAt: organizationResult.record.createdAt,
        }),
      );
    } catch (error) {
      setSubmitError(formatError(error));
    } finally {
      setIsSubmitting(false);
    }
  }, [
    bannerPreviewUrl,
    did,
    fieldErrors,
    form,
    kind,
    auth,
    indexerUtils.account,
    onCompleted,
    primaryPreviewUrl,
    setAuth,
    setOnboardingStep,
    upsertOrganization,
    upsertProfile,
  ]);

  const handleOrganizationStepAdvance = useCallback(() => {
    setTouchedFields({
      displayName: true,
      shortDescription: true,
      website: true,
    });

    if (Object.keys(fieldErrors).length > 0) {
      return;
    }

    if (!hasAcceptedCodeOfConduct) {
      return;
    }

    setSubmitError(null);
    setStepDirection(1);
    setOnboardingStep(1);
  }, [fieldErrors, hasAcceptedCodeOfConduct, setOnboardingStep]);

  const handleBackClick = useCallback(() => {
    if (isOrganizationDetailsStep) {
      setStepDirection(-1);
      setOnboardingStep(0);
      return;
    }

    setOnboardingStep(0);
    onBack();
  }, [isOrganizationDetailsStep, onBack, setOnboardingStep]);

  const visibleWebsiteError =
    kind === "organization" && touchedFields.website
      ? fieldErrors.website
      : undefined;
  const visibleDisplayNameError = touchedFields.displayName
    ? fieldErrors.displayName
    : undefined;
  const visibleShortDescriptionError = touchedFields.shortDescription
    ? fieldErrors.shortDescription
    : undefined;

  const mainFormFields = (
    <>
      {kind === "organization" && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Website</label>

          <InputGroup className="rounded-full">
            <InputGroupAddon>
              <GlobeIcon />
            </InputGroupAddon>
            <InputGroupInput
              type="url"
              value={form.website}
              onChange={(event) => updateForm("website", event.target.value)}
              placeholder="https://your-organization.org"
              aria-invalid={visibleWebsiteError ? true : undefined}
            />
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                type="button"
                variant="secondary"
                size="xs"
                className="rounded-full"
                onClick={() => void handleFetchBrandInfo()}
                disabled={!canFetchBrandInfo}
              >
                {isFetchingBrandInfo ? (
                  <Loader2Icon className="animate-spin" />
                ) : (
                  <SparklesIcon />
                )}
                Prefill
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>

          <div className="mt-3 space-y-2">
            <FieldError error={visibleWebsiteError} />
            {brandfetchFeedback && (
              <p
                className={cn("text-xs", {
                  "text-primary": brandfetchFeedback.tone === "success",
                  "text-muted-foreground": brandfetchFeedback.tone === "neutral",
                  "text-destructive": brandfetchFeedback.tone === "destructive",
                })}
              >
                {brandfetchFeedback.message}
              </p>
            )}
          </div>
        </div>
      )}

      <OnboardingMediaField
        kind={kind}
        primaryImage={form.primaryImage}
        bannerImage={form.bannerImage}
        displayName={form.displayName}
        displayNamePlaceholder={
          kind === "organization" ? "Organization name" : "Your name"
        }
        displayNameError={visibleDisplayNameError}
        onPrimaryImageChange={(image) => updateForm("primaryImage", image)}
        onBannerImageChange={(image) => updateForm("bannerImage", image)}
        onDisplayNameChange={(value) => updateForm("displayName", value)}
      />

      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Bio</label>
        <Textarea
          value={form.shortDescription}
          onChange={(event) =>
            updateForm("shortDescription", event.target.value)
          }
          placeholder={
            kind === "organization"
              ? "A short introduction to your organization and the work you do."
              : "A short introduction to who you are."
          }
          rows={4}
          aria-invalid={visibleShortDescriptionError ? true : undefined}
        />
        <div>
          <FieldError error={visibleShortDescriptionError} />
        </div>
      </div>
    </>
  );

  return (
    <>
      <HeaderContent
        left={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleBackClick}
          >
            <ArrowLeftIcon />
            Back
          </Button>
        }
      />

      <motion.form
        className="mx-auto flex min-h-[calc(100vh-10rem)] w-full flex-col justify-center gap-5 py-8"
        initial={{ opacity: 0, y: 18, filter: "blur(10px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
        onSubmit={(event) => {
          event.preventDefault();

          if (kind === "organization" && onboardingStep === 0) {
            handleOrganizationStepAdvance();
            return;
          }

          void handleSubmit();
        }}
      >
        <div className="space-y-1 text-center">
          <h1
            className="text-4xl text-foreground"
            style={{
              fontFamily: "var(--font-instrument-serif-var)",
              fontStyle: "italic",
            }}
          >
            {kind === "organization" ? "Organization" : "User"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {kind === "organization"
              ? "Add the basics and we’ll prefill what we can."
              : "A few basics and you’re in."}
          </p>
        </div>

        {kind === "organization" ? (
          <AnimatePresence custom={stepDirection} mode="wait" initial={false}>
            <motion.div
              key={
                isOrganizationDetailsStep
                  ? "organization-step-1"
                  : "organization-step-0"
              }
              custom={stepDirection}
              variants={organizationStepVariants}
              className="mx-auto w-full max-w-xl space-y-5"
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
            >
              {isOrganizationDetailsStep ? (
                <OrganizationSetupDetailsPanel
                  did={did}
                  form={form}
                  canSubmit={canSubmit}
                  showAiGeneratedReviewNotice={hasSuccessfulPrefill}
                  isSubmitting={isSubmitting}
                  submitLabel={
                    isOrganizationOptionalStepEmpty
                      ? "Skip and Continue"
                      : "Continue"
                  }
                  submitError={submitError}
                  onBack={() => {
                    setStepDirection(-1);
                    setOnboardingStep(0);
                  }}
                  onCountryChange={(value) => updateForm("country", value)}
                  onStartDateChange={(value) => updateForm("startDate", value)}
                  onLongDescriptionChange={(value) =>
                    updateForm("longDescription", value)
                  }
                />
              ) : (
                <>
                  {mainFormFields}

                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="organization-code-of-conduct"
                      checked={hasAcceptedCodeOfConduct}
                      onCheckedChange={(checked) =>
                        setHasAcceptedCodeOfConduct(checked === true)
                      }
                      className="mt-0.5 bg-background"
                    />
                    <label
                      htmlFor="organization-code-of-conduct"
                      className="text-sm text-muted-foreground"
                    >
                      I have reviewed and agree to the{" "}
                      <Link
                        href={links.external.codeOfConduct}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-foreground underline underline-offset-4"
                      >
                        Code of Conduct
                      </Link>
                      .
                    </label>
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full"
                    disabled={!canSubmit || !hasAcceptedCodeOfConduct}
                  >
                    Continue
                    <ArrowRightIcon />
                  </Button>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        ) : (
          <>
            {mainFormFields}

            {submitError && (
              <p className="text-sm text-destructive">{submitError}</p>
            )}

            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={!canSubmit}
            >
              Continue
              {isSubmitting ? (
                <Loader2Icon className="animate-spin" />
              ) : (
                <ArrowRightIcon />
              )}
            </Button>
          </>
        )}
      </motion.form>
    </>
  );
}
