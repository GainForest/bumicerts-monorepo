"use client";

import type { BumicertData } from "@/lib/types";
import { useSectionObserver } from "../_hooks/useSectionObserver";
import { HeaderContent } from "@/app/(marketplace)/_components/Header/HeaderContent";
import { BumicertTabs } from "./BumicertMobileTabs";
import { BumicertSidebar } from "./BumicertSidebar";
import { BumicertSections } from "./BumicertSections";
import { BumicertCreationMeta, BumicertMeta } from "./BumicertInfoBar";
import Image from "next/image";

const SECTIONS = [
  { id: "description", label: "Description" },
  { id: "site-boundaries", label: "Site Boundaries" },
] as const;

interface BumicertDetailProps {
  bumicert: BumicertData;
}

export function BumicertDetail({ bumicert }: BumicertDetailProps) {
  const activeSection = useSectionObserver(SECTIONS.map((s) => s.id));

  return (
    <>
      <HeaderContent
        sub={
          <BumicertTabs
            sections={[...SECTIONS]}
            activeSection={activeSection}
          />
        }
      />
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 lg:gap-10 lg:px-2">
        {/* Sidebar — lg+ only */}
        <div className="hidden lg:block">
          <BumicertSidebar bumicert={bumicert} />
        </div>

        {/* Right column: mobile meta stack + scrollable sections */}
        <div className="flex flex-col gap-4">
          {/* Mobile-only stack — hidden at lg+ */}
          <div className="flex flex-col gap-4 lg:hidden">
            {/* Sticky creation meta */}
            <div className="sticky top-14 z-10 border border-border rounded-xl shadow-md bg-background px-4 py-3">
              <BumicertCreationMeta bumicert={bumicert} />
            </div>

            {/* At sm+: image left, meta right. Below sm: stack vertically. */}
            <div className="flex flex-col sm:flex-row gap-4">
              {bumicert.coverImageUrl && (
                <div className="rounded-2xl border border-border overflow-hidden relative w-full sm:w-1/2 aspect-[3/4] max-h-[50vh]">
                  <Image src={bumicert.coverImageUrl} alt={bumicert.title} fill className="object-cover" />
                </div>
              )}
              <div className="sm:w-1/2 sm:flex-1">
                <BumicertMeta bumicert={bumicert} />
              </div>
            </div>
          </div>

          {/* Content sections */}
          <BumicertSections bumicert={bumicert} />
        </div>
      </div>
    </>
  );
}
