"use client";

import { useState, useMemo, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  UsersIcon,
  SearchIcon,
  ArrowUpDownIcon,
  ChevronDownIcon,
} from "lucide-react";
import type { OrganizationData } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { OrganizationCard } from "./OrganizationCard";
import { countries } from "@/lib/countries";
import { realms, countryToRealm } from "@/lib/bioregions";

// ── Country chips (secondary dynamic) ─────────────────────────────────────────

function CountryChips({
  organizations,
  countryFilter,
  setCountryFilter,
}: {
  organizations: OrganizationData[];
  countryFilter: string | null;
  setCountryFilter: (c: string | null) => void;
}) {
  const chips = useMemo(() => {
    const codes = Array.from(
      new Set(organizations.map((o) => o.country).filter(Boolean)),
    );
    return codes
      .map((code) => ({
        code,
        emoji: countries[code]?.emoji ?? "",
        name: countries[code]?.name ?? code,
        isSelected: countryFilter === code,
      }))
      .sort((a, b) => Number(b.isSelected) - Number(a.isSelected));
  }, [organizations, countryFilter]);

  if (chips.length === 0) return null;

  return (
    <div className="flex items-center gap-2 pb-1">
      {chips.map((c) => (
        <button
          key={c.code}
          onClick={() =>
            setCountryFilter(countryFilter === c.code ? null : c.code)
          }
          className={cn(
            "shrink-0 text-xs font-medium rounded-full px-3 py-1.5 border transition-all whitespace-nowrap",
            c.isSelected
              ? "bg-foreground text-background border-foreground"
              : "text-muted-foreground border-border hover:border-foreground/50 hover:text-foreground",
          )}
        >
          {c.emoji} {c.name}
        </button>
      ))}
    </div>
  );
}

function CountryChipsSkeleton() {
  return (
    <div className="flex items-center gap-2 pb-1">
      {[96, 80, 88, 100, 84].map((w, i) => (
        <Skeleton
          key={i}
          className="h-7 rounded-full shrink-0"
          style={{ width: w }}
        />
      ))}
    </div>
  );
}

// ── Bioregion chips (derived from country → realm mapping) ──────────────────

function BioregionChips({
  organizations,
  bioregionFilter,
  setBioregionFilter,
}: {
  organizations: OrganizationData[];
  bioregionFilter: string | null;
  setBioregionFilter: (r: string | null) => void;
}) {
  const chips = useMemo(() => {
    // Collect unique realm IDs present in the org data
    const realmIds = new Set<string>();
    for (const org of organizations) {
      const realmId = countryToRealm[org.country];
      if (realmId) realmIds.add(realmId);
    }
    return Array.from(realmIds)
      .map((id) => ({
        id,
        emoji: realms[id]?.emoji ?? "",
        name: realms[id]?.name ?? id,
        isSelected: bioregionFilter === id,
      }))
      .sort(
        (a, b) =>
          Number(b.isSelected) - Number(a.isSelected) ||
          a.name.localeCompare(b.name),
      );
  }, [organizations, bioregionFilter]);

  if (chips.length === 0) return null;

  return (
    <div className="flex items-center gap-2 pb-1">
      {chips.map((r) => (
        <button
          key={r.id}
          onClick={() =>
            setBioregionFilter(bioregionFilter === r.id ? null : r.id)
          }
          className={cn(
            "shrink-0 text-xs font-medium rounded-full px-3 py-1.5 border transition-all whitespace-nowrap",
            r.isSelected
              ? "bg-foreground text-background border-foreground"
              : "text-muted-foreground border-border hover:border-foreground/50 hover:text-foreground",
          )}
        >
          {r.emoji} {r.name}
        </button>
      ))}
    </div>
  );
}

// ── Sort options ───────────────────────────────────────────────────────────────

const SORT_OPTIONS = [
  { value: "bumicerts", label: "Most Bumicerts" },
  { value: "alpha", label: "Alphabetical" },
  { value: "newest", label: "Newest" },
];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

// ── Shell ─────────────────────────────────────────────────────────────────────

/**
 * AllOrgsShell — shared wrapper used by both loading.tsx and page.tsx.
 *
 * Renders all static chrome immediately:
 *   - heading (h1 — SEO-critical)
 *   - search input + sort dropdown
 *   - country filter chips (secondary dynamic — wrapped in Suspense)
 *
 * `organizations` drives both the chips and the grid. Fetched once in
 * page.tsx, passed as a prop — no duplicate fetches.
 *
 * `children` is the skeleton grid in loading.tsx.
 * When organizations has data (page.tsx), the real filtered grid is rendered.
 */
export function AllOrgsShell({
  organizations,
  animate = true,
  children,
}: {
  organizations: OrganizationData[];
  /** false in loading.tsx so chrome appears instantly; true (default) in page.tsx */
  animate?: boolean;
  children?: React.ReactNode;
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("bumicerts");
  const [countryFilter, setCountryFilter] = useState<string | null>(null);
  const [bioregionFilter, setBioregionFilter] = useState<string | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let result = [...organizations];
    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter(
        (o) =>
          o.displayName.toLowerCase().includes(q) ||
          o.shortDescription.toLowerCase().includes(q) ||
          o.objectives.some((obj) => obj.toLowerCase().includes(q)),
      );
    }
    if (countryFilter)
      result = result.filter((o) => o.country === countryFilter);
    if (bioregionFilter)
      result = result.filter(
        (o) => countryToRealm[o.country] === bioregionFilter,
      );
    switch (sort) {
      case "bumicerts":
        result.sort((a, b) => b.bumicertCount - a.bumicertCount);
        break;
      case "alpha":
        result.sort((a, b) => a.displayName.localeCompare(b.displayName));
        break;
      case "newest":
        result.sort((a, b) =>
          (b.startDate ?? "").localeCompare(a.startDate ?? ""),
        );
        break;
    }
    return result;
  }, [organizations, query, sort, countryFilter, bioregionFilter]);

  return (
    <section className="pt-6 pb-20 md:pb-28 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Static heading */}
        <motion.div
          initial={animate ? { opacity: 0, y: 16 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
          className="mb-8"
        >
          <div className="flex items-center gap-2 mb-3">
            <UsersIcon className="h-4 w-4 text-primary" />
            <span className="text-xs uppercase tracking-[0.15em] text-muted-foreground font-medium">
              Organizations
            </span>
          </div>
          <h1
            className="text-3xl md:text-4xl lg:text-5xl font-light tracking-[-0.02em] leading-[1.1] text-foreground"
            style={{ fontFamily: "var(--font-garamond-var)" }}
          >
            Nature{" "}
            <span
              className="text-foreground/80"
              style={{
                fontFamily: "var(--font-instrument-serif-var)",
                fontStyle: "italic",
              }}
            >
              Stewards
            </span>
          </h1>
        </motion.div>

        {/* Search + sort row */}
        <div className="space-y-3 mb-0">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 min-w-0">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search organizations..."
                className="w-full h-10 pl-10 pr-4 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>

            <div className="relative shrink-0">
              <button
                onClick={() =>
                  setOpenDropdown((p) => (p === "sort" ? null : "sort"))
                }
                className="flex items-center gap-2 h-10 px-3 text-sm text-muted-foreground hover:text-foreground border border-border rounded-lg transition-colors"
              >
                <ArrowUpDownIcon className="h-4 w-4" />
                <span className="hidden sm:inline">
                  {SORT_OPTIONS.find((o) => o.value === sort)?.label}
                </span>
                <ChevronDownIcon
                  className={cn(
                    "h-4 w-4 transition-transform",
                    openDropdown === "sort" && "rotate-180",
                  )}
                />
              </button>
              <AnimatePresence>
                {openDropdown === "sort" && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="absolute right-0 top-full mt-1 w-40 bg-background border border-border rounded-lg shadow-xl z-20 py-1"
                  >
                    {SORT_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setSort(option.value);
                          setOpenDropdown(null);
                        }}
                        className={cn(
                          "w-full text-left px-3 py-2 text-sm transition-colors",
                          sort === option.value
                            ? "text-primary bg-primary/5"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/*
            Bioregion chips — OneEarth biogeographic realms derived from country codes.
            Provides a higher-level geographic filter complementary to individual countries.
          */}
          <div className="overflow-x-auto scrollbar-hidden">
            <Suspense fallback={<CountryChipsSkeleton />}>
              <BioregionChips
                organizations={organizations}
                bioregionFilter={bioregionFilter}
                setBioregionFilter={setBioregionFilter}
              />
            </Suspense>
          </div>

          {/*
            Country chips — secondary dynamic content derived from organizations.
            In loading.tsx, organizations=[] so chips won't render, but the
            Suspense boundary shows CountryChipsSkeleton.
          */}
          <div className="overflow-x-auto scrollbar-hidden">
            <Suspense fallback={<CountryChipsSkeleton />}>
              <CountryChips
                organizations={organizations}
                countryFilter={countryFilter}
                setCountryFilter={setCountryFilter}
              />
            </Suspense>
          </div>
        </div>

        {/* Gradient separator */}
        <div className="h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent my-8" />

        {/*
          Main content slot.
          - loading.tsx passes skeleton cards as children.
          - page.tsx passes nothing → Shell renders the real filtered grid.
        */}
        {children ??
          (filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-28 text-center">
              <span
                className="text-7xl md:text-8xl font-light text-primary/[0.15] tracking-tight mb-4"
                style={{ fontFamily: "var(--font-garamond-var)" }}
              >
                0
              </span>
              <h3
                className="text-2xl md:text-3xl font-light text-foreground mb-3"
                style={{ fontFamily: "var(--font-garamond-var)" }}
              >
                No organizations found
              </h3>
              <p
                className="text-base text-foreground/80 max-w-md leading-relaxed"
                style={{
                  fontFamily: "var(--font-instrument-serif-var)",
                  fontStyle: "italic",
                }}
              >
                Try adjusting your search or filters.
              </p>
            </div>
          ) : (
            <motion.div
              key={`${query}-${sort}-${countryFilter}-${bioregionFilter}`}
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-2 lg:gap-4"
            >
              <AnimatePresence mode="popLayout">
                {filtered.map((org) => (
                  <OrganizationCard key={org.did} org={org} />
                ))}
              </AnimatePresence>
            </motion.div>
          ))}
      </div>
    </section>
  );
}
