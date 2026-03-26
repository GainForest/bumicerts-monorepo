"use client";

import { useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { CompassIcon } from "lucide-react";
import type { BumicertData } from "@/lib/types";
import { countryToRealm } from "@/lib/bioregions";
import { BumicertGrid } from "./BumicertGrid";
import { ExploreHeaderSlots, type Filters } from "./ExploreHeader";

// ── Constants ──────────────────────────────────────────────────────────────────

const EMPTY_FILTERS: Filters = { organizations: [], countries: [], bioregions: [], objectives: [] };

// ── Shell ─────────────────────────────────────────────────────────────────────

/**
 * ExploreShell — the shared wrapper used by both loading.tsx and page.tsx.
 *
 * Renders all static chrome immediately:
 *   - heading (h1 — SEO-critical)
 *   - search, sort, filter chips, and "All filters" modal button (via ExploreHeaderSlots)
 *
 * `bumicerts` drives both the filter chips and the grid.
 * Fetched once in page.tsx, passed here as a prop — no duplicate fetches.
 *
 * `children` is the skeleton grid in loading.tsx.
 * When `bumicerts` has data (page.tsx), children is undefined → real filtered grid renders.
 */
export function ExploreShell({
  bumicerts,
  animate = true,
  children,
}: {
  /** Full dataset — [] in loading.tsx, real data in page.tsx */
  bumicerts: BumicertData[];
  /** false in loading.tsx so chrome appears instantly; true (default) in page.tsx */
  animate?: boolean;
  /** Grid skeleton in loading.tsx; undefined in page.tsx (Shell renders the real grid) */
  children?: React.ReactNode;
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("newest");
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);

  const toggleFilter = useCallback((category: keyof Filters, value: string) => {
    setFilters((prev) => {
      const current = prev[category];
      const updated = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, [category]: updated };
    });
  }, []);

  const activeFilterCount =
    filters.organizations.length + filters.countries.length + filters.bioregions.length + filters.objectives.length;

  const filtered = useMemo(() => {
    let result = [...bumicerts];
    if (filters.organizations.length > 0)
      result = result.filter((b) => filters.organizations.includes(b.organizationDid));
    if (filters.bioregions.length > 0)
      result = result.filter((b) => {
        const realmId = countryToRealm[b.country];
        return realmId ? filters.bioregions.includes(realmId) : false;
      });
    if (filters.countries.length > 0)
      result = result.filter((b) => filters.countries.includes(b.country));
    if (filters.objectives.length > 0)
      result = result.filter((b) => b.objectives.some((o) => filters.objectives.includes(o)));
    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          b.organizationName.toLowerCase().includes(q) ||
          b.country.toLowerCase().includes(q) ||
          b.objectives.some((o) => o.toLowerCase().includes(q))
      );
    }
    result.sort((a, b) =>
      sort === "newest"
        ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    return result;
  }, [bumicerts, query, sort, filters]);

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
            <CompassIcon className="h-4 w-4 text-primary" />
            <span className="text-xs uppercase tracking-[0.15em] text-muted-foreground font-medium">
              Explore Projects
            </span>
          </div>
          <h1
            className="text-3xl md:text-4xl lg:text-5xl font-light tracking-[-0.02em] leading-[1.1] text-foreground"
            style={{ fontFamily: "var(--font-garamond-var)" }}
          >
            Discover{" "}
            <span
              className="text-foreground/80"
              style={{ fontFamily: "var(--font-instrument-serif-var)", fontStyle: "italic" }}
            >
              Regenerative Impact
            </span>
          </h1>
        </motion.div>

        {/*
          Search, sort, filter chips, and "All filters" modal button.
          ExploreHeaderSlots also injects the "Create Project" button into the
          page header via HeaderContent.
        */}
        <ExploreHeaderSlots
          query={query}
          setQuery={setQuery}
          sort={sort}
          setSort={setSort}
          filters={filters}
          setFilters={setFilters}
          toggleFilter={toggleFilter}
          activeFilterCount={activeFilterCount}
          bumicerts={bumicerts}
          shouldAnimate={animate}
        />

        {/* Gradient separator */}
        <div className="h-px bg-linear-to-r from-transparent via-primary/30 to-transparent my-8" />

        {/*
          Main content slot.
          - loading.tsx passes a skeleton grid as children.
          - page.tsx passes nothing → Shell renders the real filtered BumicertGrid.
        */}
        {children ?? <BumicertGrid bumicerts={filtered} />}

      </div>
    </section>
  );
}
