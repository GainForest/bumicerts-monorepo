"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Tracks the active section via two mechanisms:
 *  1. hashchange — fires immediately when an #anchor link is clicked,
 *     so the active highlight is instant with no delay.
 *  2. IntersectionObserver — keeps the highlight in sync as the user
 *     scrolls freely (without clicking a link).
 */
export function useSectionObserver(sectionIds: string[]): string | null {
  const [activeSection, setActiveSection] = useState<string | null>(
    sectionIds[0] ?? null
  );

  const sectionIdsRef = useRef(sectionIds);
  sectionIdsRef.current = sectionIds;

  const intersectingRef = useRef<Set<string>>(new Set());

  // ── 1. hashchange — instant highlight on link click ──────────────────────
  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash.slice(1); // strip "#"
      if (hash && sectionIdsRef.current.includes(hash)) {
        setActiveSection(hash);
      }
    };

    // Set from current hash on mount (e.g. page loaded with a hash in the URL)
    onHashChange();

    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  // ── 2. IntersectionObserver — highlight follows scroll ───────────────────
  useEffect(() => {
    const pick = () => {
      for (const id of sectionIdsRef.current) {
        if (intersectingRef.current.has(id)) {
          setActiveSection(id);
          return;
        }
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            intersectingRef.current.add(entry.target.id);
          } else {
            intersectingRef.current.delete(entry.target.id);
          }
        }
        pick();
      },
      { rootMargin: "-10% 0px -60% 0px" }
    );

    const elements = sectionIds
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);

    elements.forEach((el) => observer.observe(el));

    return () => {
      intersectingRef.current.clear();
      observer.disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return activeSection;
}
