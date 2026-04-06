"use client";

/**
 * OrgHero — Contained card hero.
 *
 * SEO-critical content (h1, description, pills) → CSS animations.
 * Decorative visuals (cover image scale-in, share/edit button feedback) → Framer Motion.
 *
 * Bottom layout:
 *   [Logo]  Organization Name
 *   Short description...
 *   [Since Jan 2024] [🇮🇩 Indonesia] [OBJECTIVE]  🌐 website.org
 *
 * Top-right: frosted glass share button (copies current URL, shows "Copied!" briefly).
 *            When showEditButton is true, an Edit pill link is also shown beside Share.
 */

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  GlobeIcon,
  CalendarIcon,
  Share2Icon,
  CheckIcon,
  PencilIcon,
} from "lucide-react";
import type { OrganizationData } from "@/lib/types";
import { links } from "@/lib/links";
import { BskyRichTextDisplay } from "@/components/ui/bsky-richtext-display";

interface OrgHeroProps {
  organization: OrganizationData;
  /** When true, renders an Edit button that links to /upload?mode=edit */
  showEditButton?: boolean;
}

function formatWebsite(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function formatSinceDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
  } catch {
    return null;
  }
}

/**
 * Convert ISO 3166-1 alpha-2 code to a flag emoji.
 * Each letter maps to a Regional Indicator Symbol (U+1F1E6–U+1F1FF).
 */
function countryCodeToFlag(code: string): string {
  if (!code || code.length !== 2) return "";
  const base = 0x1f1e6 - 0x41; // offset from 'A'
  return (
    String.fromCodePoint(code.toUpperCase().charCodeAt(0) + base) +
    String.fromCodePoint(code.toUpperCase().charCodeAt(1) + base)
  );
}

// ISO 3166-1 alpha-2 → display name
const COUNTRY_NAMES: Record<string, string> = {
  AF: "Afghanistan",
  AL: "Albania",
  DZ: "Algeria",
  AR: "Argentina",
  AU: "Australia",
  AT: "Austria",
  BD: "Bangladesh",
  BE: "Belgium",
  BO: "Bolivia",
  BR: "Brazil",
  KH: "Cambodia",
  CM: "Cameroon",
  CA: "Canada",
  CL: "Chile",
  CN: "China",
  CO: "Colombia",
  CD: "Congo (DRC)",
  CR: "Costa Rica",
  HR: "Croatia",
  CU: "Cuba",
  CZ: "Czech Republic",
  DK: "Denmark",
  DO: "Dominican Republic",
  EC: "Ecuador",
  EG: "Egypt",
  SV: "El Salvador",
  ET: "Ethiopia",
  FI: "Finland",
  FR: "France",
  GA: "Gabon",
  GH: "Ghana",
  DE: "Germany",
  GT: "Guatemala",
  HN: "Honduras",
  HU: "Hungary",
  IN: "India",
  ID: "Indonesia",
  IR: "Iran",
  IQ: "Iraq",
  IE: "Ireland",
  IL: "Israel",
  IT: "Italy",
  JM: "Jamaica",
  JP: "Japan",
  JO: "Jordan",
  KZ: "Kazakhstan",
  KE: "Kenya",
  KR: "South Korea",
  KW: "Kuwait",
  LA: "Laos",
  LB: "Lebanon",
  LR: "Liberia",
  LY: "Libya",
  MG: "Madagascar",
  MW: "Malawi",
  MY: "Malaysia",
  MV: "Maldives",
  ML: "Mali",
  MX: "Mexico",
  MA: "Morocco",
  MZ: "Mozambique",
  MM: "Myanmar",
  NA: "Namibia",
  NP: "Nepal",
  NL: "Netherlands",
  NZ: "New Zealand",
  NI: "Nicaragua",
  NE: "Niger",
  NG: "Nigeria",
  NO: "Norway",
  PK: "Pakistan",
  PA: "Panama",
  PG: "Papua New Guinea",
  PY: "Paraguay",
  PE: "Peru",
  PH: "Philippines",
  PL: "Poland",
  PT: "Portugal",
  QA: "Qatar",
  RO: "Romania",
  RU: "Russia",
  RW: "Rwanda",
  SA: "Saudi Arabia",
  SN: "Senegal",
  SL: "Sierra Leone",
  SG: "Singapore",
  SO: "Somalia",
  ZA: "South Africa",
  SS: "South Sudan",
  ES: "Spain",
  LK: "Sri Lanka",
  SD: "Sudan",
  SE: "Sweden",
  CH: "Switzerland",
  SY: "Syria",
  TW: "Taiwan",
  TZ: "Tanzania",
  TH: "Thailand",
  TG: "Togo",
  TT: "Trinidad and Tobago",
  TN: "Tunisia",
  TR: "Turkey",
  UG: "Uganda",
  UA: "Ukraine",
  AE: "United Arab Emirates",
  GB: "United Kingdom",
  US: "United States",
  UY: "Uruguay",
  UZ: "Uzbekistan",
  VE: "Venezuela",
  VN: "Vietnam",
  YE: "Yemen",
  ZM: "Zambia",
  ZW: "Zimbabwe",
};

export function OrgHero({
  organization,
  showEditButton = false,
}: OrgHeroProps) {
  const [copied, setCopied] = useState(false);

  const initial = organization.displayName.charAt(0).toUpperCase();
  const sinceLabel = formatSinceDate(organization.startDate);
  const countryName =
    COUNTRY_NAMES[organization.country] ?? organization.country ?? null;
  const countryFlag = organization.country
    ? countryCodeToFlag(organization.country)
    : "";
  const hasPillRow =
    sinceLabel ||
    countryName ||
    organization.objectives.length > 0 ||
    organization.website;

  function handleShare() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <section className="relative min-h-[260px] md:min-h-[320px] flex flex-col overflow-hidden rounded-2xl border border-border">
      {/* ── Cover image (Framer Motion — decorative) ── */}
      <div className="absolute inset-0">
        <motion.div
          initial={{ scale: 1.08, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.6, ease: [0.25, 0.1, 0.25, 1] }}
          className="absolute inset-0"
        >
          {organization.coverImageUrl ? (
            <Image
              src={organization.coverImageUrl}
              alt={`${organization.displayName} cover image`}
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

      {/* ── Top-right action buttons ── */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        {/* Share button — Framer Motion for tap feedback */}
        <motion.button
          onClick={handleShare}
          whileTap={{ scale: 0.94 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background/55 backdrop-blur-xl border border-white/20 shadow-lg cursor-pointer hover:bg-background/70 transition-colors"
          aria-label="Copy link"
        >
          <AnimatePresence mode="wait" initial={false}>
            {copied ? (
              <motion.span
                key="check"
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.7 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-1.5"
              >
                <CheckIcon className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="text-xs font-medium text-primary">
                  Copied!
                </span>
              </motion.span>
            ) : (
              <motion.span
                key="share"
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.7 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-1.5"
              >
                <Share2Icon className="h-3.5 w-3.5 text-foreground/80 shrink-0" />
                <span className="text-xs font-medium text-foreground/80">
                  Share
                </span>
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>

        {/* Edit button — only rendered when viewer is the owner */}
        {showEditButton && (
          <Link
            href={links.upload.edit}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-primary-foreground border border-primary/20 shadow-lg transition-colors"
            aria-label="Edit organisation profile"
          >
            <PencilIcon className="h-3.5 w-3.5 shrink-0" />
            <span className="text-xs font-medium">Edit</span>
          </Link>
        )}
      </div>

      {/* ── Bottom content — SEO-critical, CSS animations ── */}
      <div className="relative z-10 flex-1 flex flex-col justify-end px-5 pb-6 pt-24">
        <div className="max-w-3xl">
          {/* Logo + Org name — same line, vertically centered */}
          <div className="flex items-center gap-3 mb-3 org-animate org-fade-in-up org-delay-1">
            <div className="h-9 w-9 rounded-full overflow-hidden bg-muted border border-white/15 shadow-sm shrink-0">
              {organization.logoUrl ? (
                <Image
                  src={organization.logoUrl}
                  alt={organization.displayName}
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

            {/* Org name — SEO h1 */}
            <h1
              className="text-3xl sm:text-4xl md:text-5xl font-light tracking-[-0.02em] leading-none text-foreground"
              style={{ fontFamily: "var(--font-garamond-var)" }}
            >
              {organization.displayName}
            </h1>
          </div>

          {/* Short description */}
          {organization.shortDescription && (
            <BskyRichTextDisplay
              text={organization.shortDescription}
              facets={organization.shortDescriptionFacets}
              className="text-sm md:text-base text-foreground/75 max-w-2xl leading-relaxed org-animate org-fade-in-up org-delay-2"
            />
          )}

          {/* Pills row: Since · Country (with flag) · Objectives · Website */}
          {hasPillRow && (
            <div className="mt-4 flex flex-wrap items-center gap-2 org-animate org-fade-in-up org-delay-3">
              {/* Since pill */}
              {sinceLabel && (
                <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.08em] text-foreground/60 bg-background/40 backdrop-blur-md border border-border/50 rounded-full px-2.5 py-1 font-medium">
                  <CalendarIcon className="h-3 w-3 shrink-0" />
                  Since {sinceLabel}
                </span>
              )}

              {/* Country pill with flag */}
              {countryName && (
                <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.08em] text-foreground/60 bg-background/40 backdrop-blur-md border border-border/50 rounded-full px-2.5 py-1 font-medium">
                  {countryFlag && (
                    <span className="text-sm leading-none" aria-hidden="true">
                      {countryFlag}
                    </span>
                  )}
                  {countryName}
                </span>
              )}

              {/* Objective pills */}
              {organization.objectives.map((obj) => (
                <span
                  key={obj}
                  className="text-[10px] uppercase tracking-[0.08em] text-foreground/60 bg-background/40 backdrop-blur-md border border-border/50 rounded-full px-2.5 py-1 font-medium"
                >
                  {obj}
                </span>
              ))}

              {/* Website */}
              {organization.website && (
                <Link
                  href={organization.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.08em] text-primary/80 hover:text-primary bg-background/40 backdrop-blur-md border border-primary/20 rounded-full px-2.5 py-1 font-medium transition-colors"
                >
                  <GlobeIcon className="h-3 w-3 shrink-0" />
                  {formatWebsite(organization.website)}
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
