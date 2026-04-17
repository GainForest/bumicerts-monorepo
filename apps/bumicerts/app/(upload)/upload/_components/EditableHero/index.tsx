"use client";

/**
 * EditableHero — The org hero card with full in-place editing support.
 *
 * View mode  → mirrors OrgHero: cover, logo, name, short description, pills.
 *
 * Edit mode  → every field becomes directly editable:
 *   • Cover image   → "Change cover" button in the top-left action row
 *   • Logo          → pencil badge on the avatar
 *   • Name          → inline <input>
 *   • Short desc    → inline <input>
 *   • Country pill  → click → global CountrySelectorModal
 *   • Since pill    → click → StartDateSelectorModal
 *   • Website pill  → click → WebsiteEditorModal
 *   • Visibility    → shown as chip in edit mode
 *
 * Cover button design note:
 *   We deliberately avoid an absolute-inset overlay for the cover editor.
 *   The bottom content area is `flex-1` and fills the full hero height, so
 *   any overlay behind it (lower z) is unreachable. Instead the cover edit
 *   button lives in the top action row (same z-level, always reachable).
 *
 * Also exports EditBar — the save / cancel action row shown below the hero.
 */

import Image from "next/image";
import { useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarIcon,
  GlobeIcon,
  ImageIcon,
  LockIcon,
  MapPinIcon,
  PencilIcon,
  PlusCircleIcon,
  SaveIcon,
  XIcon,
} from "lucide-react";
import { useModal } from "@/components/ui/modal/context";
import { MODAL_IDS } from "@/components/global/modals/ids";
import { ImageEditorModal } from "../../_modals/ImageEditorModal";
import CountrySelectorModal from "@/components/modals/country-selector";
import { WebsiteEditorModal } from "../../_modals/WebsiteEditorModal";
import { StartDateSelectorModal } from "../../_modals/StartDateSelectorModal";
import { VisibilitySelectorModal } from "../../_modals/VisibilitySelectorModal";
import { useManageDashboardState } from "../store";
import { useManageMode } from "../../_hooks/useUploadMode";
import type { OrganizationData } from "@/lib/types";
import { cn } from "@/lib/utils";
import { BskyRichTextDisplay } from "@/components/ui/bsky-richtext-display";
import { BskyRichTextEditor } from "@/components/ui/bsky-richtext-editor";
import type { Facet } from "@gainforest/leaflet-react/richtext";
import type { app } from "@gainforest/generated";
import { countries } from "@/lib/countries";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatWebsite(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function formatSinceDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  try {
    // Parse as UTC to prevent timezone offset issues
    // Dates stored as YYYY-MM-DD should be treated as UTC midnight
    const date = new Date(`${dateStr}T00:00:00Z`);
    return date.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
  } catch {
    return null;
  }
}

// ── EditChip ──────────────────────────────────────────────────────────────────

interface EditChipProps {
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
  isEditing: boolean;
  isEmpty?: boolean;
}

function EditChip({
  onClick,
  className,
  children,
  isEditing,
  isEmpty = false,
}: EditChipProps) {
  if (!isEditing) {
    if (isEmpty) return null;
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.08em] text-foreground/60 bg-background/40 backdrop-blur-md border border-border/50 rounded-full px-2.5 py-1 font-medium",
          className,
        )}
      >
        {children}
      </span>
    );
  }

  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={cn(
        "inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.08em] rounded-full px-2.5 py-1 font-medium border cursor-pointer transition-colors",
        isEmpty
          ? "text-primary/70 bg-primary/5 border-primary/20 hover:bg-primary/10"
          : "text-foreground/60 bg-background/40 backdrop-blur-md border-border/50 hover:bg-background/60 hover:text-foreground/80",
        className,
      )}
    >
      {isEmpty && <PlusCircleIcon className="h-3 w-3 shrink-0" />}
      {!isEmpty && <PencilIcon className="h-3 w-3 shrink-0 opacity-60" />}
      {children}
    </motion.button>
  );
}

// ── EditableHero ──────────────────────────────────────────────────────────────

interface EditableHeroProps {
  organization: OrganizationData;
}

export function EditableHero({ organization }: EditableHeroProps) {
  const { pushModal, show } = useModal();
  const [mode] = useManageMode();
  const isEditing = mode === "edit";

  const edits = useManageDashboardState((s) => s.edits);
  const setEdit = useManageDashboardState((s) => s.setEdit);

  // Resolved display values — edit buffer takes priority over server data
  const displayName = edits.displayName ?? organization.displayName;
  const shortDescription =
    edits.shortDescription ?? organization.shortDescription;
  const shortDescriptionFacets =
    edits.shortDescriptionFacets ?? organization.shortDescriptionFacets;
  const country = edits.country ?? organization.country;
  const website = edits.website ?? organization.website;
  const startDate = edits.startDate ?? organization.startDate;
  const visibility = edits.visibility ?? organization.visibility;

  // Image sources — use object URL for newly selected files.
  // Memoized so the blob: URL is only (re-)created when the File reference changes,
  // not on every re-render (e.g. from typing in the name input). Without this,
  // URL.createObjectURL() returns a new string each call, which makes <Image>
  // treat it as a new src and unmount/remount the img — causing visible flicker.
  const coverObjectUrl = useMemo(
    () => (edits.coverImage ? URL.createObjectURL(edits.coverImage) : null),
    [edits.coverImage],
  );
  const logoObjectUrl = useMemo(
    () => (edits.logo ? URL.createObjectURL(edits.logo) : null),
    [edits.logo],
  );

  // Revoke blob URLs when the File changes or the component unmounts to avoid
  // memory leaks (each createObjectURL allocates a browser-side resource).
  useEffect(() => {
    return () => {
      if (coverObjectUrl) URL.revokeObjectURL(coverObjectUrl);
    };
  }, [coverObjectUrl]);
  useEffect(() => {
    return () => {
      if (logoObjectUrl) URL.revokeObjectURL(logoObjectUrl);
    };
  }, [logoObjectUrl]);

  const coverImageUrl = coverObjectUrl ?? organization.coverImageUrl;
  const logoUrl = logoObjectUrl ?? organization.logoUrl;

  const initial = displayName.charAt(0).toUpperCase();
  const sinceLabel = formatSinceDate(startDate);
  const countryName = country ? (countries[country]?.name ?? country) : null;
  const countryFlag = countries[country]?.emoji ?? "";

  const hasPillRow =
    isEditing ||
    sinceLabel !== null ||
    countryName !== null ||
    organization.objectives.length > 0 ||
    website !== null;

  // ── Modal openers ──────────────────────────────────────────────────────────

  const openCoverEditor = () => {
    pushModal(
      {
        id: MODAL_IDS.MANAGE_IMAGE_EDITOR,
        content: (
          <ImageEditorModal
            target="cover"
            onConfirm={(file) => setEdit("coverImage", file)}
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
        id: MODAL_IDS.MANAGE_IMAGE_EDITOR,
        content: (
          <ImageEditorModal
            target="logo"
            onConfirm={(file) => setEdit("logo", file)}
          />
        ),
      },
      true,
    );
    show();
  };

  const openCountry = () => {
    pushModal(
      {
        id: MODAL_IDS.MANAGE_COUNTRY_SELECTOR,
        content: (
          <CountrySelectorModal
            initialCountryCode={country ?? ""}
            onCountryChange={(code) => setEdit("country", code)}
          />
        ),
      },
      true,
    );
    show();
  };

  const openWebsite = () => {
    pushModal(
      {
        id: MODAL_IDS.MANAGE_WEBSITE_EDITOR,
        content: (
          <WebsiteEditorModal
            currentUrl={website}
            onConfirm={(url) => setEdit("website", url)}
          />
        ),
      },
      true,
    );
    show();
  };

  const openStartDate = () => {
    pushModal(
      {
        id: MODAL_IDS.MANAGE_START_DATE_SELECTOR,
        content: (
          <StartDateSelectorModal
            currentDate={startDate}
            onConfirm={(date) => setEdit("startDate", date)}
          />
        ),
      },
      true,
    );
    show();
  };

  const openVisibility = () => {
    pushModal(
      {
        id: MODAL_IDS.MANAGE_VISIBILITY_SELECTOR,
        content: (
          <VisibilitySelectorModal
            current={visibility ?? "Public"}
            onConfirm={(v) => setEdit("visibility", v)}
          />
        ),
      },
      true,
    );
    show();
  };

  return (
    <section className="relative min-h-[260px] md:min-h-[320px] flex flex-col overflow-hidden rounded-2xl border border-border">
      {/* ── Cover image (purely decorative layer, z-0) ── */}
      <div className="absolute inset-0 z-0">
        <motion.div
          initial={{ scale: 1.08, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.6, ease: [0.25, 0.1, 0.25, 1] }}
          className="absolute inset-0"
        >
          {coverImageUrl ? (
            <Image
              src={coverImageUrl}
              alt={`${displayName} cover image`}
              fill
              priority
              className="object-cover object-center"
              sizes="(max-width: 1152px) 100vw, 1152px"
            />
          ) : (
            <div
              className="absolute inset-0 bg-muted"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 30% 50%, oklch(0.5 0.07 157 / 0.08) 0%, transparent 60%), radial-gradient(circle at 75% 25%, oklch(0.5 0.07 157 / 0.05) 0%, transparent 50%)",
              }}
            />
          )}
          <div className="absolute inset-0 bg-linear-to-b from-background/0 via-background/75 to-background" />
        </motion.div>
      </div>

      {/* ── Bottom content (z-10, same level as top row — never blocks top row) ── */}
      <div className="relative z-10 flex-1 flex flex-col justify-end px-5 pb-6 pt-24">
        <div className="max-w-3xl">
          {/* Logo + name row */}
          <div className="flex items-center gap-3 mb-3">
            <div className="relative shrink-0">
              <div className="h-9 w-9 rounded-full overflow-hidden bg-muted border border-white/15 shadow-sm">
                {logoUrl ? (
                  <Image
                    src={logoUrl}
                    alt={displayName}
                    width={36}
                    height={36}
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-sm font-bold text-muted-foreground">
                    {initial}
                  </div>
                )}
              </div>
              {isEditing && (
                <button
                  type="button"
                  onClick={openLogoEditor}
                  className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-background border border-border flex items-center justify-center shadow-sm hover:bg-muted/60 transition-colors cursor-pointer"
                  aria-label="Change logo"
                >
                  <PencilIcon className="h-2.5 w-2.5" />
                </button>
              )}
            </div>

            {isEditing ? (
              <input
                type="text"
                value={displayName}
                onChange={(e) => setEdit("displayName", e.target.value || null)}
                placeholder="Organization name"
                className={cn(
                  "text-3xl sm:text-4xl md:text-5xl font-light tracking-[-0.02em] leading-none",
                  "bg-transparent border-b-2 border-white/40 focus:border-primary/60 outline-none",
                  "text-foreground placeholder:text-foreground/40 w-full max-w-lg transition-colors",
                )}
                style={{ fontFamily: "var(--font-garamond-var)" }}
              />
            ) : (
              <h1
                className="text-3xl sm:text-4xl md:text-5xl font-light tracking-[-0.02em] leading-none text-foreground"
                style={{ fontFamily: "var(--font-garamond-var)" }}
              >
                {displayName}
              </h1>
            )}
          </div>

          {/* Short description */}
          {isEditing ? (
            <BskyRichTextEditor
              initialValue={{
                text: shortDescription ?? "",
                // app.bsky.richtext.facet.Main and our Facet type are structurally
                // identical at runtime — this cast is safe and documented.
                facets:
                  shortDescriptionFacets as unknown as app.bsky.richtext.facet.Main[],
              }}
              onChange={(text, facets) => {
                setEdit("shortDescription", text || null);
                // Reverse cast: same structural identity in the other direction.
                setEdit(
                  "shortDescriptionFacets",
                  facets && facets.length > 0
                    ? (facets as unknown as Facet[])
                    : null,
                );
              }}
              placeholder="Short description…"
              className="text-sm md:text-base max-w-2xl"
            />
          ) : (
            shortDescription && (
              <BskyRichTextDisplay
                text={shortDescription}
                facets={shortDescriptionFacets}
                className="text-sm md:text-base text-foreground/75 max-w-2xl leading-relaxed"
              />
            )
          )}

          {/* Pills row */}
          {hasPillRow && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <EditChip
                onClick={openCountry}
                isEditing={isEditing}
                isEmpty={!countryName}
              >
                {countryFlag && (
                  <span className="text-sm leading-none" aria-hidden="true">
                    {countryFlag}
                  </span>
                )}
                {countryName ?? "Add country"}
              </EditChip>

              <EditChip
                onClick={openStartDate}
                isEditing={isEditing}
                isEmpty={!sinceLabel}
              >
                <CalendarIcon className="h-3 w-3 shrink-0" />
                {sinceLabel ? `Since ${sinceLabel}` : "Add start date"}
              </EditChip>

              <EditChip
                onClick={openWebsite}
                isEditing={isEditing}
                isEmpty={!website}
              >
                <GlobeIcon className="h-3 w-3 shrink-0" />
                {website ? formatWebsite(website) : "Add website"}
              </EditChip>

              {!isEditing &&
                organization.objectives.map((obj) => (
                  <span
                    key={obj}
                    className="text-[10px] uppercase tracking-[0.08em] text-foreground/60 bg-background/40 backdrop-blur-md border border-border/50 rounded-full px-2.5 py-1 font-medium"
                  >
                    {obj}
                  </span>
                ))}

              {(isEditing || visibility === "Unlisted") && (
                <EditChip
                  onClick={openVisibility}
                  isEditing={isEditing}
                  isEmpty={false}
                >
                  {visibility === "Unlisted" ? (
                    <LockIcon className="h-3 w-3 shrink-0" />
                  ) : (
                    <MapPinIcon className="h-3 w-3 shrink-0" />
                  )}
                  {visibility ?? "Public"}
                </EditChip>
              )}
            </div>
          )}
        </div>
      </div>

      {/*
        ── Top action row (z-10) ──
        Contains: cover-edit button (left, edit mode only) + editing badge / edit link (right)
        All controls here are above the cover image and never blocked by content.
      */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-start justify-between p-4">
        {/* Left: change cover button — only in edit mode */}
        <AnimatePresence>
          {isEditing && (
            <motion.button
              key="cover-btn"
              type="button"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              whileTap={{ scale: 0.96 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              onClick={openCoverEditor}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background/55 backdrop-blur-xl border border-white/20 shadow-lg hover:bg-background/70 transition-colors cursor-pointer"
              aria-label="Change cover image"
            >
              <ImageIcon className="h-3.5 w-3.5 text-foreground/80 shrink-0" />
              <span className="text-xs font-medium text-foreground/80">
                Change cover
              </span>
            </motion.button>
          )}
        </AnimatePresence>

        {/* Right: editing badge (edit mode) or nothing */}
        <div className="ml-auto">
          <AnimatePresence>
            {isEditing && (
              <motion.div
                key="editing-badge"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-primary/90 text-primary-foreground text-[10px] font-medium uppercase tracking-[0.08em]"
              >
                <PencilIcon className="h-2.5 w-2.5" />
                Editing
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

// ── EditBar ───────────────────────────────────────────────────────────────────

export function EditBar() {
  const [mode, setMode] = useManageMode();
  const isEditing = mode === "edit";
  const isSaving = useManageDashboardState((s) => s.isSaving);
  const saveError = useManageDashboardState((s) => s.saveError);
  const hasChanges = useManageDashboardState((s) => s.hasChanges);
  const cancelEditing = useManageDashboardState((s) => s.cancelEditing);

  if (!isEditing) return null;

  const handleCancel = () => {
    cancelEditing(); // reset edits in store
    setMode(null); // clear ?mode=edit from URL → view mode
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
      className="flex items-center justify-between gap-4 px-4 py-2.5 rounded-xl border border-primary/20 bg-primary/5"
    >
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {isSaving ? (
          <span className="text-primary text-sm font-medium">Saving…</span>
        ) : saveError ? (
          <span className="text-destructive text-xs">{saveError}</span>
        ) : (
          <span>
            {hasChanges() ? "You have unsaved changes." : "No changes yet."}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleCancel}
          disabled={isSaving}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer disabled:opacity-50"
        >
          <XIcon className="h-3.5 w-3.5" />
          Cancel
        </button>
        <button
          form="upload-dashboard-save-form"
          type="submit"
          disabled={isSaving || !hasChanges()}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-50"
        >
          <SaveIcon className="h-3.5 w-3.5" />
          Save
        </button>
      </div>
    </motion.div>
  );
}
