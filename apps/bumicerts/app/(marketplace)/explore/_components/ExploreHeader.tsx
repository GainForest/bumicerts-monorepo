"use client";

import { useState } from "react";
import {
  SearchIcon,
  SlidersHorizontalIcon,
  PlusIcon,
  ChevronDownIcon,
  ArrowUpDownIcon,
  MapPinIcon,
  BuildingIcon,
  TagIcon,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useHeaderContext } from "../../_components/Header/context";
import { HeaderContent } from "../../_components/Header/HeaderContent";
import type { BumicertData } from "@/lib/types";
import { useModal } from "@/components/ui/modal/context";
import {
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
} from "@/components/ui/modal/modal";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

// ═══════════════════════════════════════════════════════════════════════════
// Types & Data
// ═══════════════════════════════════════════════════════════════════════════

export type Filters = {
  organizations: string[];
  countries: string[];
  objectives: string[];
};

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
];

function buildFilterCategories(bumicerts: BumicertData[]) {
  const organizations = Array.from(
    new Map(bumicerts.map((b) => [b.organizationDid, b.organizationName])).entries()
  ).map(([did, name]) => ({ value: did, label: name }));

  const countries = Array.from(new Set(bumicerts.map((b) => b.country).filter(Boolean))).map((c) => ({
    value: c,
    label: c,
  }));

  const objectives = Array.from(new Set(bumicerts.flatMap((b) => b.objectives))).map((o) => ({
    value: o,
    label: o,
  }));

  return [
    { key: "organizations" as const, label: "Organization", icon: BuildingIcon, options: organizations },
    { key: "countries" as const, label: "Country", icon: MapPinIcon, options: countries },
    { key: "objectives" as const, label: "Impact Area", icon: TagIcon, options: objectives },
  ];
}

// ═══════════════════════════════════════════════════════════════════════════
// All Filters Modal Content
// ═══════════════════════════════════════════════════════════════════════════

type FilterCategory = ReturnType<typeof buildFilterCategories>[number];

function AllFiltersModalContent({
  initialFilters,
  onApply,
  onClose,
  filterCategories,
}: {
  initialFilters: Filters;
  onApply: (filters: Filters) => void;
  onClose: () => void;
  filterCategories: FilterCategory[];
}) {
  // Local state for pending filter selections
  const [pendingFilters, setPendingFilters] = useState<Filters>(initialFilters);

  // Toggle a filter in local state
  const togglePendingFilter = (category: keyof Filters, value: string) => {
    setPendingFilters((prev) => {
      const current = prev[category];
      const updated = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, [category]: updated };
    });
  };

  // Clear a category in local state
  const clearPendingCategory = (category: keyof Filters) => {
    setPendingFilters((prev) => ({ ...prev, [category]: [] }));
  };

  // Clear all in local state
  const clearAllPending = () => {
    setPendingFilters({ organizations: [], countries: [], objectives: [] });
  };

  // Apply filters and close
  const handleApply = () => {
    onApply(pendingFilters);
    onClose();
  };

  // Determine which accordions should be open by default (those with active filters)
  const defaultOpen = filterCategories
    .filter((cat) => initialFilters[cat.key].length > 0)
    .map((cat) => cat.key);

  // Count pending filters
  const pendingCount = pendingFilters.organizations.length + pendingFilters.countries.length + pendingFilters.objectives.length;

  return (
    <ModalContent>
      <ModalHeader>
        <ModalTitle>All Filters</ModalTitle>
        <ModalDescription>Filter projects by organization, country, or impact area</ModalDescription>
      </ModalHeader>

      {/* Filter sections with Accordion */}
      <div className="max-h-[50vh] overflow-y-auto -mx-2 px-2">
        <Accordion
          type="multiple"
          defaultValue={defaultOpen.length > 0 ? defaultOpen : ["objectives"]}
          className="w-full"
        >
          {filterCategories.map((category) => {
            const Icon = category.icon;
            const count = pendingFilters[category.key].length;
            return (
              <AccordionItem key={category.key} value={category.key} className="border-border">
                <AccordionTrigger className="hover:no-underline py-3">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{category.label}</span>
                    {count > 0 && (
                      <span className="h-5 min-w-[20px] px-1.5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                        {count}
                      </span>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="flex flex-wrap gap-2 pb-2">
                    {category.options.map((option) => {
                      const isSelected = pendingFilters[category.key].includes(option.value);
                      return (
                        <button
                          key={option.value}
                          onClick={() => togglePendingFilter(category.key, option.value)}
                          className={cn(
                            "text-xs font-medium rounded-full px-3 py-1.5 border transition-all",
                            isSelected
                              ? "bg-foreground text-background border-foreground"
                              : "text-muted-foreground border-border hover:border-foreground/50"
                          )}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                  {count > 0 && (
                    <button
                      onClick={() => clearPendingCategory(category.key)}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Clear {category.label.toLowerCase()}
                    </button>
                  )}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </div>

      <ModalFooter>
        <div className="flex items-center justify-between w-full">
          <button
            onClick={clearAllPending}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Clear all
          </button>
          <button
            onClick={handleApply}
            className="h-10 px-5 bg-primary text-primary-foreground text-sm font-medium rounded-full hover:bg-primary/90 transition-colors"
          >
            Apply filters{pendingCount > 0 ? ` (${pendingCount})` : ""}
          </button>
        </div>
      </ModalFooter>
    </ModalContent>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Export
// Row 1: Search + Sort
// Row 2: Scrollable impact area chips + "All filters" button
// ═══════════════════════════════════════════════════════════════════════════

export function ExploreHeaderSlots({
  query,
  setQuery,
  sort,
  setSort,
  filters,
  setFilters,
  toggleFilter,
  activeFilterCount,
  bumicerts,
}: {
  query: string;
  setQuery: (q: string) => void;
  sort: string;
  setSort: (s: string) => void;
  filters: Filters;
  setFilters: (filters: Filters) => void;
  toggleFilter: (category: keyof Filters, value: string) => void;
  activeFilterCount: number;
  bumicerts: BumicertData[];
}) {
  const { isUnauthenticated } = useHeaderContext();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const modal = useModal();
  const filterCategories = buildFilterCategories(bumicerts);

  const openFiltersModal = async () => {
    modal.pushModal(
      {
        id: "all-filters",
        content: (
          <AllFiltersModalContent
            initialFilters={filters}
            onApply={(newFilters) => {
              setFilters(newFilters);
            }}
            onClose={async () => {
              await modal.hide();
              modal.clear();
            }}
            filterCategories={filterCategories}
          />
        ),
      },
      true
    );
    await modal.show();
  };

  return (
    <>
    <HeaderContent
      right={
        <Link href="/bumicert/create">
          <motion.span
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full text-sm font-medium px-3.5 py-1.5 transition-colors border",
              isUnauthenticated
                ? "border-border text-foreground hover:bg-muted"
                : "bg-primary text-primary-foreground border-transparent hover:bg-primary/90"
            )}
          >
            <PlusIcon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Create Project</span>
          </motion.span>
        </Link>
      }
    />
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
            placeholder="Search projects..."
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
                className="absolute right-0 top-full mt-1 w-32 bg-background border border-border rounded-lg shadow-xl z-20 py-1"
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

      {/* Row 2: Scrollable filter chips (all categories) + All filters button */}
      <div className="flex items-center gap-3">
        {/* Scrollable chips container */}
        <div className="flex-1 min-w-0 overflow-x-auto scrollbar-hidden">
          <div className="flex items-center gap-2 pb-1">
            {/* Build a sorted list: selected chips first, then unselected */}
            {(() => {
              // Flatten all filter options with their category info
              const allChips = filterCategories.flatMap((category) =>
                category.options.map((option) => ({
                  category: category.key,
                  value: option.value,
                  label: option.label,
                  isSelected: filters[category.key].includes(option.value),
                }))
              );

              // Sort: selected first, then by original order
              const sortedChips = [
                ...allChips.filter((chip) => chip.isSelected),
                ...allChips.filter((chip) => !chip.isSelected),
              ];

              return sortedChips.map((chip) => (
                <button
                  key={`${chip.category}-${chip.value}`}
                  onClick={() => toggleFilter(chip.category, chip.value)}
                  className={cn(
                    "shrink-0 text-xs font-medium rounded-full px-3 py-1.5 border transition-all whitespace-nowrap",
                    chip.isSelected
                      ? "bg-foreground text-background border-foreground"
                      : "text-muted-foreground border-border hover:border-foreground/50 hover:text-foreground"
                  )}
                >
                  {chip.label}
                </button>
              ));
            })()}
          </div>
        </div>

        {/* All filters button - always visible */}
        <button
          onClick={openFiltersModal}
          className={cn(
            "shrink-0 flex items-center gap-2 h-8 px-3 text-xs font-medium rounded-full border transition-all",
            activeFilterCount > 0
              ? "border-primary/50 bg-primary/5 text-foreground"
              : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/50"
          )}
        >
          <SlidersHorizontalIcon className="h-3.5 w-3.5" />
          <span>All filters</span>
          {activeFilterCount > 0 && (
            <span className="h-4 min-w-[16px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>
    </motion.div>
    </>
  );
}
