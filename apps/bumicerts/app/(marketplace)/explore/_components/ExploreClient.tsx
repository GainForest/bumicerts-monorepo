"use client";

import { useMemo, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { CompassIcon } from "lucide-react";
import type { BumicertData } from "@/lib/types";
import { BumicertGrid } from "./BumicertGrid";
import { ExploreHeaderSlots, type Filters } from "./ExploreHeader";
import { useExploreStore } from "../store";
import ExploreHydrator from "./ExploreHydrator";

const EMPTY_FILTERS: Filters = { organizations: [], countries: [], objectives: [] };

interface ExploreClientProps {
  /**
   * Server-rendered initial data for instant display.
   * Once the client-side query completes, live data takes over.
   */
  initialData?: BumicertData[];
}

export function ExploreClient({ initialData = [] }: ExploreClientProps) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("newest");
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);

  // Fine-grained selectors — each returns a primitive/stable ref, no new object on every render
  const storeBumicerts = useExploreStore((s) => s.bumicerts);
  const storeLoading = useExploreStore((s) => s.loading);
  const storeError = useExploreStore((s) => s.error);

  // Prefer live store data once loaded; fall back to server-rendered initial data
  const allBumicerts: BumicertData[] = useMemo(() => {
    if (!storeLoading && !storeError && storeBumicerts) {
      return storeBumicerts;
    }
    return initialData;
  }, [storeLoading, storeError, storeBumicerts, initialData]);

  const isLoading = storeLoading && initialData.length === 0;

  // Toggle a filter value (add if not present, remove if present)
  const toggleFilter = useCallback((category: keyof Filters, value: string) => {
    setFilters((prev) => {
      const current = prev[category];
      const updated = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, [category]: updated };
    });
  }, []);

  // Clear all filters
  const clearAllFilters = useCallback(() => {
    setFilters(EMPTY_FILTERS);
  }, []);

  const filtered = useMemo(() => {
    let result = [...allBumicerts];

    if (filters.organizations.length > 0) {
      result = result.filter((b) => filters.organizations.includes(b.organizationDid));
    }
    if (filters.countries.length > 0) {
      result = result.filter((b) => filters.countries.includes(b.country));
    }
    if (filters.objectives.length > 0) {
      result = result.filter((b) =>
        b.objectives.some((obj) => filters.objectives.includes(obj))
      );
    }
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

    result.sort((a, b) => {
      if (sort === "newest")
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    return result;
  }, [query, sort, filters, allBumicerts]);

  const activeFilterCount =
    filters.organizations.length + filters.countries.length + filters.objectives.length;

  return (
    // ExploreHydrator fires the GraphQL query and feeds the store
    <ExploreHydrator>
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
                  style={{
                    fontFamily: "var(--font-instrument-serif-var)",
                    fontStyle: "italic",
                  }}
                >
                  Regenerative Impact
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
                {isLoading ? "—" : filtered.length}
              </span>
              <span className="text-xs uppercase tracking-[0.1em] text-muted-foreground">
                {filtered.length === 1 ? "project" : "projects"}
              </span>
            </motion.div>
          </motion.div>

          {/* Search/filters */}
          <ExploreHeaderSlots
            query={query}
            setQuery={setQuery}
            sort={sort}
            setSort={setSort}
            filters={filters}
            setFilters={setFilters}
            toggleFilter={toggleFilter}
            activeFilterCount={activeFilterCount}
            bumicerts={allBumicerts}
          />

          {/* Gradient separator line */}
          <div className="h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent my-8" />

          {/* Grid */}
          <BumicertGrid bumicerts={filtered} loading={isLoading} />
        </div>
      </section>
    </ExploreHydrator>
  );
}
