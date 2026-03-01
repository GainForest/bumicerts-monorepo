"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  SearchIcon,
  ArrowUpDownIcon,
  ChevronDownIcon,
  UsersIcon,
} from "lucide-react";
import { OrganizationCard } from "./OrganizationCard";
import type { OrganizationData } from "@/lib/types";
import { cn } from "@/lib/utils";

const COUNTRY_MAP: Record<string, { emoji: string; name: string }> = {
  ID: { emoji: "🇮🇩", name: "Indonesia" },
  KE: { emoji: "🇰🇪", name: "Kenya" },
  CO: { emoji: "🇨🇴", name: "Colombia" },
  BR: { emoji: "🇧🇷", name: "Brazil" },
  PH: { emoji: "🇵🇭", name: "Philippines" },
};

const SORT_OPTIONS = [
  { value: "bumicerts", label: "Most Bumicerts" },
  { value: "alpha", label: "Alphabetical" },
  { value: "newest", label: "Newest" },
];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

// ── Main client component ─────────────────────────────

export function AllOrgsClient({ organizations }: { organizations: OrganizationData[] }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("bumicerts");
  const [countryFilter, setCountryFilter] = useState<string | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const countries = useMemo(
    () => Array.from(new Set(organizations.map((o) => o.country))),
    [organizations]
  );

  const filtered = useMemo(() => {
    let result = [...organizations];
    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter(
        (o) =>
          o.displayName.toLowerCase().includes(q) ||
          o.shortDescription.toLowerCase().includes(q) ||
          o.objectives.some((obj) => obj.toLowerCase().includes(q))
      );
    }
    if (countryFilter) {
      result = result.filter((o) => o.country === countryFilter);
    }
    switch (sort) {
      case "bumicerts":
        result.sort((a, b) => b.bumicertCount - a.bumicertCount);
        break;
      case "alpha":
        result.sort((a, b) => a.displayName.localeCompare(b.displayName));
        break;
      case "newest":
        result.sort((a, b) =>
          (b.startDate ?? "").localeCompare(a.startDate ?? "")
        );
        break;
    }
    return result;
  }, [query, sort, countryFilter, organizations]);

  // Build country chips: selected first
  const countryChips = useMemo(() => {
    const allCountries = countries.map((code) => ({
      code,
      data: COUNTRY_MAP[code],
      isSelected: countryFilter === code,
    }));
    return [
      ...allCountries.filter((c) => c.isSelected),
      ...allCountries.filter((c) => !c.isSelected),
    ];
  }, [countries, countryFilter]);

  return (
    <section className="pt-6 pb-20 md:pb-28 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Compact hero area */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
          className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8"
        >
          <div>
            {/* Section label */}
            <div className="flex items-center gap-2 mb-3">
              <UsersIcon className="h-4 w-4 text-primary" />
              <span className="text-xs uppercase tracking-[0.15em] text-muted-foreground font-medium">
                Organizations
              </span>
            </div>

            {/* Headline */}
            <h1
              className="text-3xl md:text-4xl lg:text-5xl font-light tracking-[-0.02em] leading-[1.1] text-foreground"
              style={{ fontFamily: "var(--font-garamond-var)" }}
            >
              Nature{" "}
              <span
                className="text-foreground/80"
                style={{ fontFamily: "var(--font-instrument-serif-var)", fontStyle: "italic" }}
              >
                Stewards
              </span>
            </h1>
          </div>

          {/* Result count - editorial flair */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex items-baseline gap-2"
          >
            <span
              className="text-4xl md:text-5xl font-light text-primary/20"
              style={{ fontFamily: "var(--font-garamond-var)" }}
            >
              {filtered.length}
            </span>
            <span className="text-xs uppercase tracking-[0.1em] text-muted-foreground">
              {filtered.length === 1 ? "organization" : "organizations"}
            </span>
          </motion.div>
        </motion.div>

        {/* Search + filters - matching explore page style */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
          className="space-y-3"
        >
          {/* Row 1: Search + Sort */}
          <div className="flex items-center gap-3">
            {/* Search */}
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

            {/* Sort dropdown */}
            <div className="relative shrink-0">
              <button
                onClick={() => setOpenDropdown(prev => prev === "sort" ? null : "sort")}
                className="flex items-center gap-2 h-10 px-3 text-sm text-muted-foreground hover:text-foreground border border-border rounded-lg transition-colors"
              >
                <ArrowUpDownIcon className="h-4 w-4" />
                <span className="hidden sm:inline">{SORT_OPTIONS.find((o) => o.value === sort)?.label}</span>
                <ChevronDownIcon
                  className={cn("h-4 w-4 transition-transform", openDropdown === "sort" && "rotate-180")}
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
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
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

          {/* Row 2: Scrollable country chips (selected first) */}
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0 overflow-x-auto scrollbar-hidden">
              <div className="flex items-center gap-2 pb-1">
                {countryChips.map((country) => (
                  <button
                    key={country.code}
                    onClick={() => setCountryFilter(countryFilter === country.code ? null : country.code)}
                    className={cn(
                      "shrink-0 text-xs font-medium rounded-full px-3 py-1.5 border transition-all whitespace-nowrap",
                      country.isSelected
                        ? "bg-foreground text-background border-foreground"
                        : "text-muted-foreground border-border hover:border-foreground/50 hover:text-foreground"
                    )}
                  >
                    {country.data?.emoji} {country.data?.name ?? country.code}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Gradient separator line */}
        <div className="h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent my-8" />

        {/* Grid or empty state */}
        {filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
            className="flex flex-col items-center justify-center py-28 px-6 text-center"
          >
            {/* Large decorative number */}
            <span
              className="text-7xl md:text-8xl font-light text-primary/[0.15] tracking-tight mb-4"
              style={{ fontFamily: "var(--font-garamond-var)" }}
            >
              0
            </span>

            <div className="flex items-center gap-2 mb-3">
              <SearchIcon className="h-4 w-4 text-primary" />
              <span className="text-xs uppercase tracking-[0.15em] text-muted-foreground font-medium">
                No Results
              </span>
            </div>

            <h3
              className="text-2xl md:text-3xl font-light text-foreground mb-3"
              style={{ fontFamily: "var(--font-garamond-var)" }}
            >
              No organizations found
            </h3>

            <p
              className="text-base text-foreground/80 max-w-md leading-relaxed"
              style={{ fontFamily: "var(--font-instrument-serif-var)", fontStyle: "italic" }}
            >
              Try adjusting your search or filters to discover nature steward organizations.
            </p>
          </motion.div>
        ) : (
          <motion.div
            key={`${query}-${sort}-${countryFilter}`}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-8 lg:gap-10"
          >
            <AnimatePresence mode="popLayout">
              {filtered.map((org) => (
                <OrganizationCard key={org.did} org={org} />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </section>
  );
}
